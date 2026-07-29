import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { AnnotationCoordinator } from "../../src/coordinator.js";
import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { KatakanaRuntime } from "../../src/katakana-runtime.js";

test("combines pure runtime plans, gives pending katakana priority, and releases failure to kanji", async () => {
  const dom = new JSDOM("<main><p>型ゲーム</p></main>");
  const gate = deferred();
  const coordinator = immediateCoordinator(dom);
  const kanji = new KanjiRuntime({
    mode: "local",
    analyzerFactories: {
      local: async () => (text) => [{
        type: "annotation", surface: text, reading: "カタゲーム", romaji: "kata-game",
      }],
    },
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  const katakana = new KatakanaRuntime({
    provider: "google",
    translatorFactories: { google: () => async () => gate.promise },
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  await Promise.all([kanji.enable(), katakana.enable()]);
  coordinator.enableKanji(kanji);
  coordinator.enableKatakana(katakana);
  await waitFor(() => dom.window.document.querySelector("ruby") == null);

  gate.resolve(new Map());
  await waitFor(() => dom.window.document.querySelector('[data-yomi-ruby-feature="kanji"]'));
  assert.equal(dom.window.document.querySelector("rt").textContent, "kata-game");
});

test("scans all safe foreground text in stable DOM order and processes dynamic additions", async () => {
  const dom = new JSDOM(`
    <main><p>ゲーム</p><code>テレビ</code><a href="/x">ラジオ</a></main>
    <ruby id="kt">ゲーム<rt class="katakana-terminator-rt">game</rt></ruby>
  `);
  const calls = [];
  const coordinator = immediateCoordinator(dom);
  const runtime = new KatakanaRuntime({
    provider: "google",
    translatorFactories: {
      google: () => async (phrases) => {
        calls.push(...phrases);
        return new Map(phrases.map((phrase) => [phrase, `en:${phrase}`]));
      },
    },
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  await runtime.enable();
  coordinator.enableKatakana(runtime);
  await waitFor(() => dom.window.document.querySelectorAll('[data-yomi-ruby-feature="katakana"]').length === 2);
  assert.deepEqual(calls, ["ゲーム", "ラジオ"]);
  assert.equal(dom.window.document.querySelector("code").textContent, "テレビ");
  assert.equal(dom.window.document.querySelector("#kt").outerHTML.includes("yomi-ruby-generated"), false);

  dom.window.document.querySelector("main").insertAdjacentHTML("beforeend", "<p>テレビ</p>");
  await waitFor(() => calls.includes("テレビ"));
  assert.deepEqual(calls, ["ゲーム", "ラジオ", "テレビ"]);
});

test("uses one injected event window for mutation bursts without a permanent interval", async () => {
  const dom = new JSDOM("<main></main>");
  const timers = [];
  const coordinator = new AnnotationCoordinator({
    document: dom.window.document,
    flushDelayMs: 500,
    scanBatchSize: 100,
    setTimer(callback, delay) {
      timers.push({ callback, delay, cancelled: false });
      return timers.length;
    },
    clearTimer(id) { timers[id - 1].cancelled = true; },
  });
  const seen = [];
  const runtime = runtimePlan((record) => {
    seen.push(record.text);
    return { status: "success", ranges: [], reservations: [] };
  });
  coordinator.enableKatakana(runtime);
  runTimers(timers);
  seen.length = 0;

  dom.window.document.querySelector("main").insertAdjacentHTML(
    "beforeend", "<p>ゲーム</p><p>テレビ</p><p>ラジオ</p>",
  );
  await tick();
  const pendingWindows = timers.filter(({ delay, cancelled }) => delay === 500 && !cancelled);
  assert.equal(pendingWindows.length, 1);
  runTimers(timers);
  assert.deepEqual(seen, ["ゲーム", "テレビ", "ラジオ"]);
  assert.equal(timers.some(({ delay }) => delay > 500), false);
});

test("pauses new runtime work while hidden and rescans only connected DOM after visibility returns", async () => {
  const dom = new JSDOM("<main><p id='old'>ゲーム</p></main>", { pretendToBeVisual: true });
  let visibility = "visible";
  Object.defineProperty(dom.window.document, "visibilityState", { get: () => visibility });
  const calls = [];
  const coordinator = immediateCoordinator(dom);
  const runtime = new KatakanaRuntime({
    provider: "google",
    translatorFactories: {
      google: () => async (phrases) => {
        calls.push(...phrases);
        return new Map(phrases.map((phrase) => [phrase, phrase]));
      },
    },
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  await runtime.enable();
  coordinator.enableKatakana(runtime);
  await waitFor(() => calls.length === 1);

  visibility = "hidden";
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  dom.window.document.querySelector("#old").remove();
  dom.window.document.querySelector("main").insertAdjacentHTML("beforeend", "<p>テレビ</p>");
  await tick();
  assert.deepEqual(calls, ["ゲーム"]);

  visibility = "visible";
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  await waitFor(() => calls.includes("テレビ"));
  assert.deepEqual(calls, ["ゲーム", "テレビ"]);
});

test("complete stop restores exact text and nested markup across repeated cycles", async () => {
  const dom = new JSDOM('<main><p>前<strong class="kept">日本語とゲーム</strong>後</p></main>');
  const original = dom.window.document.querySelector("main").innerHTML;
  const coordinator = immediateCoordinator(dom);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const kanji = new KanjiRuntime({
      mode: "local",
      analyzerFactories: { local: async () => (text) => text === "日本語とゲーム" ? [
        { type: "annotation", surface: "日本語", reading: "ニホンゴ", romaji: "nihongo" },
        { type: "text", text: "とゲーム" },
      ] : [{ type: "text", text }] },
      onPlanChanged: (record) => coordinator.refresh(record),
    });
    const katakana = new KatakanaRuntime({
      provider: "google",
      translatorFactories: { google: () => async () => new Map([["ゲーム", "game"]]) },
      onPlanChanged: (record) => coordinator.refresh(record),
    });
    await Promise.all([kanji.enable(), katakana.enable()]);
    coordinator.enableKanji(kanji);
    coordinator.enableKatakana(katakana);
    await waitFor(() => dom.window.document.querySelectorAll("ruby").length === 2);
    coordinator.stop();
    kanji.stop();
    katakana.stop();
    assert.equal(dom.window.document.querySelector("main").innerHTML, original);
  }
});

test("stopping a cooperative large-page scan cancels undispatched chunks", () => {
  const dom = new JSDOM(`<main>${Array.from({ length: 250 }, (_, index) => `<p>項目${index}</p>`).join("")}</main>`);
  const timers = [];
  const seen = [];
  const coordinator = new AnnotationCoordinator({
    document: dom.window.document,
    scanBatchSize: 10,
    setTimer(callback, delay) {
      timers.push({ callback, delay, cancelled: false });
      return timers.length;
    },
    clearTimer(id) { timers[id - 1].cancelled = true; },
  });
  coordinator.enableKanji(runtimePlan((record) => {
    seen.push(record.text);
    return { status: "success", ranges: [] };
  }));
  runNextTimer(timers);
  assert.equal(seen.length, 10);
  coordinator.stop();
  runTimers(timers);
  assert.equal(seen.length, 10);
});

function immediateCoordinator(dom) {
  return new AnnotationCoordinator({
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    flushDelayMs: 0,
    scanBatchSize: 1000,
  });
}

function runtimePlan(plan) {
  return { plan, forget() {}, pause() {}, resume() {} };
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 60 && !predicate(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(Boolean(predicate()), true, "condition was not reached");
}

async function tick() {
  await Promise.resolve();
  await Promise.resolve();
}

function runTimers(timers) {
  for (let index = 0; index < timers.length; index += 1) {
    const timer = timers[index];
    if (!timer.cancelled) {
      timer.cancelled = true;
      timer.callback();
    }
  }
}

function runNextTimer(timers) {
  const timer = timers.find(({ cancelled }) => !cancelled);
  assert.ok(timer);
  timer.cancelled = true;
  timer.callback();
}
