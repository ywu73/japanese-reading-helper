import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { KatakanaRuntime } from "../../src/katakana-runtime.js";

const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("DOM removal drops pending subscriptions and surviving annotations still restore", async () => {
  const phrases = Array.from({ length: 200 }, (_, index) => `ゲーム${String.fromCharCode(0x30a1 + index % 64, 0x30a1 + Math.floor(index / 64))}`);
  const rows = (items) => items.map((text) => `<p>${text}</p>`).join("");
  const dom = new JSDOM(`<main><section id="remove">${rows(phrases.slice(0, 100))}</section><section id="keep">${rows(phrases.slice(100))}</section></main>`);
  const timers = [];
  const coordinator = new AnnotationCoordinator({ document: dom.window.document,
    requestIdleCallback: null, now: () => 0, scanBatchSize: 1000,
    setTimer(callback) { const timer = { callback }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  const drain = () => {
    let remaining = 1000;
    while (timers.length && remaining-- > 0) { const timer = timers.shift(); if (!timer.cancelled) timer.callback(); }
    assert.ok(remaining > 0);
  };
  const gate = deferred();
  const notified = [];
  const runtime = new KatakanaRuntime({ provider: "google", translatorFactories: { google: () => () => gate.promise },
    onPlanChanged(record) { notified.push(record.text); coordinator.refresh(record); } });
  try {
    await runtime.enable(); coordinator.enableKatakana(runtime); drain(); await tick();
    assert.equal(coordinator.records.size, 200);
    dom.window.document.querySelector("#remove").remove();
    await tick(); drain();
    assert.equal(coordinator.records.size, 100);
    gate.resolve(new Map(phrases.map((phrase) => [phrase, "game"])));
    await tick(); drain();
    assert.deepEqual(new Set(notified), new Set(phrases.slice(100)));
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 100);
    coordinator.disableKatakana(); runtime.disable();
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 0);
    assert.equal(dom.window.document.querySelector("#keep").textContent, phrases.slice(100).join(""));
  } finally { coordinator.stop(); runtime.stop(); dom.window.close(); }
});

test("forget removes only one kanji subscriber and preserves the cached result", async () => {
  const gate = deferred();
  const changes = [];
  let requests = 0;
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: {
    google: () => () => { requests++; return gate.promise; },
  }, onPlanChanged: (record) => changes.push(record) });
  await runtime.enable();
  const removed = { text: "東京" }, kept = { text: "東京" };
  runtime.plan(removed); runtime.plan(removed); runtime.plan(kept);
  removed.text = "京都";
  runtime.forget(removed); runtime.forget(removed);
  gate.resolve([{ type: "annotation", surface: "東京", reading: "トウキョウ", romaji: "tōkyō" }]);
  await tick();
  assert.deepEqual(changes, [kept]);
  runtime.forget(kept);
  assert.equal(runtime.plan({ text: "東京" }).ranges[0].romaji, "tōkyō");
  assert.equal(requests, 1);
  runtime.stop();
});

test("kanji batch completion excludes forgotten records without losing surviving peers", async () => {
  const gate = deferred();
  const changes = [];
  const analyze = () => { throw new Error("Expected batch path"); };
  analyze.analyzeBatch = () => gate.promise;
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: { google: () => analyze },
    onPlanChanged: (record) => changes.push(record) });
  await runtime.enable();
  const records = [{ text: "東京" }, { text: "京都" }];
  records.forEach((record) => runtime.plan(record));
  await tick();
  runtime.forget(records[0]);
  gate.resolve(records.map(({ text }) => [{ type: "text", text }]));
  await tick();
  assert.deepEqual(changes, [records[1]]);
  assert.equal(runtime.plan(records[0]).status, "failure");
  runtime.stop();
});

test("katakana partial completion can replan then forget without later notification", async () => {
  const gate = deferred();
  let operation, calls = 0;
  const changes = [];
  const removed = { text: "ゲームとテレビとゲーム" }, kept = { text: "テレビ" };
  const runtime = new KatakanaRuntime({ provider: "google", translatorFactories: {
    google: () => (phrases, options) => { calls++; operation = { phrases, options }; return gate.promise; },
  }, onPlanChanged(record) {
    changes.push(record);
    if (record === removed) {
      runtime.plan(record);
      runtime.forget(record);
    }
  } });
  await runtime.enable();
  runtime.plan(removed); runtime.plan(removed); runtime.plan(kept);
  await tick();
  assert.deepEqual(operation.phrases, ["ゲーム", "テレビ"]);
  operation.options.onBatch({ phrases: ["ゲーム"], translations: new Map([["ゲーム", "game"]]) });
  gate.resolve(new Map([["テレビ", "television"]]));
  await tick();
  assert.deepEqual(changes, [removed, kept]);
  runtime.forget(kept);
  assert.deepEqual(runtime.plan({ text: "ゲームとテレビ" }).ranges.map((range) => range.annotation), ["game", "television"]);
  assert.equal(calls, 1);
  runtime.stop();
});

for (const kind of ["kanji", "katakana"]) {
  test(`${kind} old-cycle results cannot remove new subscriptions for a reused record`, async () => {
    const operations = [];
    const changes = [];
    const adapter = () => { const gate = deferred(); operations.push(gate); return gate.promise; };
    const runtime = kind === "kanji"
      ? new KanjiRuntime({ mode: "google", analyzerFactories: { google: () => adapter, bing: () => adapter }, onPlanChanged: (record) => changes.push(record) })
      : new KatakanaRuntime({ provider: "google", translatorFactories: { google: () => adapter, bing: () => adapter }, onPlanChanged: (record) => changes.push(record) });
    const record = { text: kind === "kanji" ? "東京" : "ゲーム" };
    const result = kind === "kanji" ? [{ type: "text", text: "東京" }] : new Map([["ゲーム", "game"]]);
    await runtime.enable(); runtime.plan(record); await tick();
    if (kind === "kanji") await runtime.setMode("bing"); else await runtime.setProvider("bing");
    runtime.plan(record); await tick();
    operations[0].resolve(result); await tick();
    runtime.forget(record);
    operations[1].resolve(result); await tick();
    assert.deepEqual(changes, []);
    runtime.stop(); await runtime.enable();
    runtime.plan(record); await tick();
    operations[2].resolve(result); await tick();
    assert.deepEqual(changes, [record]);
    runtime.stop();
  });
}
