import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { KatakanaRuntime } from "../../src/katakana-runtime.js";
import { createGoogleTranslationClient } from "../../src/katakana-translation.js";
import { createYomiRubySession } from "../../src/session.js";
import { ViewportScheduler } from "../../src/viewport-scheduler.js";

test("Google renders a completed batch before the next request and preserves it on later failure", async () => {
  const dom = new JSDOM('<main><p>ゲーム</p><p>テレビ</p></main>');
  const requests = [];
  const client = createGoogleTranslationClient({
    gmRequest: (options) => { requests.push(options); return { abort() {} }; },
    maxPhrasesPerRequest: 1, minimumIntervalMs: 0,
  });
  const harness = controlledCoordinator(dom);
  let idle = 0;
  const runtime = new KatakanaRuntime({
    provider: "google", translatorFactories: { google: () => client.translatePhrases },
    onPlanChanged: (record) => harness.coordinator.refresh(record), onIdle: () => idle++,
  });
  await runtime.enable();
  harness.coordinator.enableKatakana(runtime);
  harness.drain();
  await settle();
  assert.equal(requests.length, 1);
  requests[0].onload({ status: 200, responseText: JSON.stringify([[["game", "ゲーム"]]]) });
  await settle();
  assert.equal(requests.length, 2);
  assert.equal(dom.window.document.querySelector("rt").textContent, "game");
  assert.equal(runtime.hasPendingWork(), true);
  assert.equal(idle, 0);
  requests[1].onload({ status: 429, responseText: "rate limit" });
  await settle();
  assert.equal(dom.window.document.querySelectorAll("rt").length, 1);
  assert.equal(dom.window.document.querySelector("rt").textContent, "game");
  assert.equal(dom.window.document.querySelectorAll("p")[1].textContent, "テレビ");
  assert.equal(idle, 1);
  assert.equal(runtime.hasPendingWork(), false);
  harness.coordinator.stop(); runtime.stop(); dom.window.close();
});

test("partial results and final completion from a replaced translator cannot touch the new cycle", async () => {
  const operations = [];
  const translator = (phrases, options) => new Promise((resolve) => operations.push({ phrases, options, resolve }));
  let idle = 0;
  const runtime = new KatakanaRuntime({ provider: "google", translatorFactories: {
    google: () => translator, bing: () => translator,
  }, onIdle: () => idle++ });
  const record = { text: "ゲーム" };
  await runtime.enable(); runtime.plan(record); await settle();
  await runtime.setProvider("bing"); runtime.plan(record); await settle();
  operations[0].options.onBatch({ phrases: ["ゲーム"], translations: new Map([["ゲーム", "old"]]) });
  operations[0].resolve(new Map([["ゲーム", "old"]]));
  await settle();
  assert.equal(operations[0].options.signal.aborted, true);
  assert.equal(runtime.plan(record).status, "pending");
  assert.equal(runtime.hasPendingWork(), true);
  assert.equal(idle, 0);
  operations[1].options.onBatch({ phrases: ["ゲーム"], translations: new Map([["ゲーム", "new"]]) });
  assert.equal(runtime.plan(record).ranges[0].annotation, "new");
  runtime.forget(record);
  operations[1].resolve(new Map()); await settle();
  assert.equal(idle, 1, "idle notification is independent of surviving waiters");
  runtime.stop();
});

test("shared viewport targets promote every source record and late observations after stop are inert", () => {
  const dom = new JSDOM('<main><p>東京<!-- split -->大阪</p></main>');
  const observers = installObserver(dom);
  const target = dom.window.document.querySelector("p");
  place(target, 4000);
  let ready = 0;
  const scheduler = new ViewportScheduler({ document: dom.window.document, onReady: () => ready++ });
  const records = [target.firstChild, target.lastChild].map((node) => ({ currentNodes: [node] }));
  for (const record of records) assert.equal(scheduler.defer(record), true);
  assert.equal(observers[0].targets.size, 1);
  observers[0].emit(target, true);
  assert.equal(ready, 1);
  assert.equal(scheduler.takeReady(), records[0]);
  assert.equal(observers[0].targets.size, 1);
  assert.equal(scheduler.takeReady(), records[1]);
  assert.equal(observers[0].targets.size, 0);
  scheduler.stop(); observers[0].emit(target, true);
  assert.equal(ready, 1);
  dom.window.close();
});

test("viewport priority falls back to normal scanning without observation or usable geometry", () => {
  const dom = new JSDOM('<p>東京</p>');
  const target = dom.window.document.querySelector("p");
  const record = { currentNodes: [target.firstChild] };
  const fallback = new ViewportScheduler({ document: dom.window.document, onReady() {} });
  place(target, 4000);
  assert.equal(fallback.defer(record), false);
  fallback.stop();
  installObserver(dom);
  target.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
  const scheduler = new ViewportScheduler({ document: dom.window.document, onReady() {} });
  assert.equal(scheduler.defer(record), false);
  scheduler.stop(); dom.window.close();
});

test("visible content bypasses earlier offscreen nodes; scrolling promotes ready work and background finishes", async () => {
  const dom = new JSDOM('<main><p id="far">東京</p><p id="scroll">大阪</p><p id="near">京都</p></main>');
  const observers = installObserver(dom);
  place(dom.window.document.querySelector("#far"), 5000);
  place(dom.window.document.querySelector("#scroll"), 4000);
  place(dom.window.document.querySelector("#near"), 10);
  const operations = [];
  const harness = controlledCoordinator(dom);
  const session = createYomiRubySession({
    document: dom.window.document, coordinator: harness.coordinator, kanjiMode: "google",
    kanjiAnalyzerFactories: { google: async () => (text) => new Promise((resolve) => operations.push({ text, resolve })) },
    translationProviderFactories: { google: () => async () => new Map() },
  });
  await session.kanji.enable(); harness.drain(); await settle();
  assert.deepEqual(operations.map(({ text }) => text), ["京都"]);
  assert.equal(harness.pending(), 0, "background waits for completion without polling");
  observers[0].emit(dom.window.document.querySelector("#scroll"), true);
  harness.drain();
  operations[0].resolve([{ type: "text", text: "京都" }]); await settle(); harness.drain();
  assert.deepEqual(operations.map(({ text }) => text), ["京都", "大阪"]);
  operations[1].resolve([{ type: "text", text: "大阪" }]); await settle(); harness.drain();
  assert.deepEqual(operations.map(({ text }) => text), ["京都", "大阪", "東京"]);
  operations[2].resolve([{ type: "text", text: "東京" }]); await settle(); harness.drain();
  assert.equal(harness.pending(), 0);
  assert.equal(harness.coordinator.viewport.hasDeferred, false);
  session.kanji.disable();
  assert.equal(observers[0].disconnected, true);
  dom.window.close();
});

test("deferred nodes revalidate safety and ownership after edits, moves and detach", async () => {
  const dom = new JSDOM('<main><p id="edit">東京</p><p id="hide">大阪</p><p id="remove">京都</p><p id="move">学校</p><p id="destination"></p></main>');
  const observers = installObserver(dom);
  const { document } = dom.window;
  for (const p of document.querySelectorAll("p")) place(p, p.id === "destination" ? 0 : 4000);
  const harness = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
  const seen = [];
  const runtime = { plan: (r) => { seen.push(r.text); return { ranges: [] }; },
    forget() {}, pause() {}, resume() {}, hasPendingWork: () => true };
  harness.coordinator.enableKanji(runtime); harness.drain();
  document.querySelector("#edit").firstChild.data = "新聞";
  document.querySelector("#hide").hidden = true;
  document.querySelector("#remove").remove();
  document.querySelector("#destination").append(document.querySelector("#move").firstChild);
  await settle(); harness.drain();
  assert.deepEqual(seen, ["学校"]);
  observers[0].emit(document.querySelector("#edit"), true);
  observers[0].emit(document.querySelector("#hide"), true);
  harness.drain();
  assert.deepEqual(seen, ["学校", "新聞"]);
  assert.equal(document.querySelector("#hide").textContent, "大阪");
  harness.coordinator.stop(); dom.window.close();
});

test("hidden tabs hold viewport-ready work until foreground resumes and ignore old observations", () => {
  const dom = new JSDOM('<main><p>東京</p></main>');
  const observers = installObserver(dom);
  let visibility = "visible";
  Object.defineProperty(dom.window.document, "visibilityState", { get: () => visibility });
  const target = dom.window.document.querySelector("p");
  place(target, 4000);
  const seen = [];
  const runtime = { plan: (r) => { seen.push(r.text); return { ranges: [] }; },
    forget() {}, pause() {}, resume() {}, hasPendingWork: () => true };
  const harness = controlledCoordinator(dom);
  harness.coordinator.enableKanji(runtime); harness.drain();
  visibility = "hidden";
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  observers[0].emit(target, true); harness.drain();
  assert.deepEqual(seen, []);
  visibility = "visible";
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  harness.drain();
  assert.deepEqual(seen, ["東京"]);
  harness.coordinator.stop();
  observers[0].emit(target, true); harness.drain();
  assert.deepEqual(seen, ["東京"]);
  dom.window.close();
});

test("background local work is bounded per slice and eventually covers every node", () => {
  const dom = new JSDOM(`<main>${Array.from({ length: 70 }, (_, i) => `<p>項目${i}</p>`).join("")}</main>`);
  installObserver(dom);
  for (const p of dom.window.document.querySelectorAll("p")) place(p, 4000);
  let calls = 0;
  const harness = controlledCoordinator(dom);
  harness.coordinator.enableKanji({ plan: () => { calls++; return { ranges: [] }; }, forget() {}, pause() {}, resume() {} });
  harness.next();
  assert.equal(calls, 32);
  harness.next(); assert.equal(calls, 64);
  harness.drain(); assert.equal(calls, 70);
  harness.coordinator.stop(); dom.window.close();
});

function installObserver(dom) {
  const observers = [];
  dom.window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    emit(target, isIntersecting) { this.callback([{ target, isIntersecting }]); }
  };
  return observers;
}

function place(element, top) {
  element.getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 200, width: 200, height: 20 });
}

function controlledCoordinator(dom, options = {}) {
  const timers = [];
  const next = () => { const timer = timers.shift(); if (timer && !timer.cancelled) timer.callback(); };
  const coordinator = new AnnotationCoordinator({ document: dom.window.document,
    MutationObserver: null, requestIdleCallback: null, now: () => 0, scanBatchSize: 1000,
    ...options,
    setTimer(callback) { const timer = { callback, cancelled: false }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  return { coordinator, next, pending: () => timers.filter((t) => !t.cancelled).length, drain() {
    let remaining = 10000;
    while (timers.length && remaining-- > 0) next();
    assert.ok(remaining > 0, "scheduler left a polling loop");
  } };
}

async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
