import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";

test("irrelevant text avoids analysis, style queries and DOM mutations, including stop", () => {
  const dom = new JSDOM(`<main><section>${Array.from({ length: 100 }, (_, i) =>
    `<p><span>English text ${i}</span></p>`).join("")}</section></main>`);
  const { document } = dom.window;
  const originals = [...document.querySelectorAll("span")].map((span) => span.firstChild);
  const observer = new dom.window.MutationObserver(() => {});
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  let styles = 0;
  const getStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.getComputedStyle = (element) => { styles++; return getStyle(element); };
  const { coordinator, drain } = controlledCoordinator(dom);
  coordinator.enableKanji(runtimePlan(() => assert.fail("irrelevant text reached analyzer")));
  coordinator.enableKatakana(runtimePlan(() => assert.fail("irrelevant text reached translator")));
  drain();
  coordinator.stop();
  assert.equal(styles, 0);
  assert.equal(observer.takeRecords().length, 0);
  assert.ok(originals.every((node, i) => document.querySelectorAll("span")[i].firstChild === node));
  observer.disconnect();
  dom.window.close();
});

test("one slice reuses ancestor checks and leaves pending/failure source nodes intact", () => {
  const dom = new JSDOM(`<main><section>${Array.from({ length: 100 }, (_, i) =>
    `<p><span>日本語${i}</span></p>`).join("")}</section></main>`);
  const { document } = dom.window;
  const originals = [...document.querySelectorAll("span")].map((span) => span.firstChild);
  const getStyle = dom.window.getComputedStyle.bind(dom.window);
  let styles = 0, plans = 0;
  dom.window.getComputedStyle = (element) => { styles++; return getStyle(element); };
  const { coordinator, drain } = controlledCoordinator(dom, { scanBatchSize: 1000 });
  coordinator.enableKanji(runtimePlan(() => { plans++; return { status: "pending", ranges: [] }; }));
  drain();
  assert.equal(plans, 100);
  assert.equal(styles, 204, "each span, p and shared ancestor is checked once");
  for (const record of coordinator.records) coordinator.refresh(record);
  coordinator.stop();
  assert.ok(originals.every((node) => node.isConnected));
  dom.window.close();
});

test("traversal yields even for non-candidate content and obeys elapsed time on timeout", () => {
  const dom = new JSDOM(`<main>${"<div><span>English</span></div>".repeat(100)}</main>`);
  let visited = 0, clock = 0;
  const original = dom.window.document.createTreeWalker.bind(dom.window.document);
  dom.window.document.createTreeWalker = (...args) => {
    const walker = original(...args);
    const next = walker.nextNode.bind(walker);
    walker.nextNode = () => { visited++; return next(); };
    return walker;
  };
  const { coordinator, next, drain } = controlledCoordinator(dom, {
    scanBatchSize: 100, scanBudgetMs: 8, now: () => { clock += 3; return clock; },
  });
  coordinator.enableKanji(runtimePlan(() => assert.fail("no candidates")));
  assert.equal(visited, 0, "enabling never walks the whole root synchronously");
  next();
  assert.equal(visited, 3, "timeout does not bypass the elapsed-time budget");
  coordinator.stop();
  drain();
  assert.equal(visited, 3);
  dom.window.close();
});

test("removing a saved traversal cursor does not strand later siblings", () => {
  const dom = new JSDOM('<main><p id="remove">東京</p><p>大阪</p><p>京都</p></main>');
  const seen = [];
  const { coordinator, next, drain } = controlledCoordinator(dom, { scanBatchSize: 1 });
  coordinator.enableKanji(runtimePlan((record) => { seen.push(record.text); return { ranges: [] }; }));
  next(); // body
  next(); // main; saved cursor is the first p
  dom.window.document.querySelector("#remove").remove();
  drain();
  assert.deepEqual(seen, ["大阪", "京都"]);
  coordinator.stop();
  dom.window.close();
});

test("visibility checks remain isolated between siblings and are refreshed after a yield", () => {
  const dom = new JSDOM('<main><div hidden><span>秘密</span></div><p>東京</p><p id="later">大阪</p><code>京都</code></main>');
  const seen = [];
  const { coordinator, next, drain } = controlledCoordinator(dom, { scanBatchSize: 1 });
  coordinator.enableKanji(runtimePlan((record) => { seen.push(record.text); return { ranges: [] }; }));
  for (let i = 0; i < 20 && !seen.length; i++) next();
  assert.deepEqual(seen, ["東京"]);
  dom.window.document.querySelector("#later").hidden = true;
  drain();
  assert.deepEqual(seen, ["東京"]);
  coordinator.stop();
  dom.window.close();
});

test("moving a saved cursor within its root does not skip intervening siblings", async () => {
  const dom = new JSDOM('<main><p id="move">東京</p><p>大阪</p><p>京都</p></main>');
  const seen = [];
  const { coordinator, next, drain } = controlledCoordinator(dom, {
    scanBatchSize: 1, MutationObserver: dom.window.MutationObserver,
  });
  coordinator.enableKanji(runtimePlan((record) => { seen.push(record.text); return { ranges: [] }; }));
  next();
  next();
  dom.window.document.querySelector("main").append(dom.window.document.querySelector("#move"));
  await Promise.resolve();
  drain();
  assert.deepEqual(seen, ["大阪", "京都", "東京"]);
  coordinator.stop();
  dom.window.close();
});

test("candidate filtering still notices characterData changes and author ruby restores exactly", async () => {
  const dom = new JSDOM('<main><p>English</p><ruby class="author">日本語<rt title="original">にほんご</rt></ruby><ruby>型<rt class="katakana-terminator-rt">タイプ</rt></ruby></main>');
  const { document } = dom.window;
  const author = document.querySelector(".author");
  const originalRuby = author.outerHTML;
  const text = document.querySelector("p").firstChild;
  const seen = [];
  const { coordinator, drain } = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
  coordinator.enableKanji(runtimePlan((record) => { seen.push(record.text); return { ranges: [] }; }));
  drain();
  assert.equal(author.querySelector("rt").textContent, "nihongo");
  assert.equal(document.querySelector(".katakana-terminator-rt").textContent, "タイプ");
  text.data = "東京";
  await Promise.resolve();
  drain();
  assert.deepEqual(seen, ["東京"]);
  assert.equal(document.querySelector("p").firstChild, text);
  coordinator.stop();
  assert.equal(author.outerHTML, originalRuby);
  dom.window.close();
});

test("online runtime merges ten source nodes into one deduplicated word operation", async () => {
  const calls = [];
  const analyzer = createOnlineKanjiAnalyzer({ romanizeWords: async (words) => {
    calls.push(words);
    return new Map(words.map((word) => [word, "sample"]));
  } });
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: { google: async () => analyzer } });
  await runtime.enable();
  const words = ["東京", "大阪", "京都", "学校", "先生", "学生", "電車", "新聞", "時間", "世界"];
  const records = words.map((text) => ({ text }));
  for (const record of records) runtime.plan(record);
  await settle();
  assert.deepEqual(calls, [words]);
  for (const record of records) assert.equal(runtime.plan(record).status, "success");
  runtime.disable();
});

test("batches retain per-node boundaries, bound work, deduplicate shared words and cache failure", async () => {
  const calls = [];
  const analyzer = createOnlineKanjiAnalyzer({
    Segmenter: class {
      segment(text) {
        const word = text.slice(0, 2);
        return [{ segment: word, index: 0, isWordLike: true },
          { segment: text.slice(2), index: 2, isWordLike: false }];
      }
    },
    romanizeWords: async (words) => { calls.push(words); return new Map(); },
  });
  const sizes = [];
  const batch = analyzer.analyzeBatch;
  analyzer.analyzeBatch = (texts, options) => { sizes.push(texts.length); return batch(texts, options); };
  const runtime = new KanjiRuntime({ mode: "bing", analyzerFactories: { bing: async () => analyzer } });
  await runtime.enable();
  const records = Array.from({ length: 70 }, (_, i) => ({ text: `${i < 35 ? "東京" : "大阪"}${i}` }));
  for (const record of records) runtime.plan(record);
  await settle();
  assert.deepEqual(sizes, [32, 32, 6]);
  assert.deepEqual(calls, [["東京"], ["大阪"]]);
  for (const record of records) assert.equal(runtime.plan(record).status, "failure");
  await settle();
  assert.equal(calls.length, 2);
  runtime.disable();
});

test("queued batching respects pause/disable and stale completion cannot unlock a new cycle", async () => {
  const gates = [];
  const makeAnalyzer = () => Object.assign(async () => [], {
    analyzeBatch: (texts, { signal }) => new Promise((resolve) => gates.push({ texts, signal, resolve })),
  });
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: { google: async () => makeAnalyzer() } });
  await runtime.enable();
  runtime.plan({ text: "東京" });
  runtime.pause();
  await settle();
  assert.equal(gates.length, 0);
  runtime.resume();
  await settle();
  assert.equal(gates.length, 1);
  runtime.disable();
  assert.equal(gates[0].signal.aborted, true);
  await runtime.enable();
  runtime.plan({ text: "大阪" });
  await settle();
  runtime.plan({ text: "京都" });
  gates[0].resolve([]);
  await settle();
  assert.equal(gates.length, 2, "old completion must not start work alongside the current batch");
  gates[1].resolve([]);
  await settle();
  assert.equal(gates.length, 3);
  gates[2].resolve([]);
  runtime.disable();
  await runtime.enable();
  runtime.plan({ text: "学校" });
  runtime.disable();
  await settle();
  assert.equal(gates.length, 3, "disable before the batching microtask prevents dispatch");
});

test("a pause microtask never sees a new analyzer dispatch after pausing", async () => {
  let runtime, calls = 0;
  const analyzer = Object.assign(async () => [], {
    analyzeBatch: () => {
      assert.equal(runtime.paused, false, "dispatch must occur before pause or wait for resume");
      calls++;
      return Promise.resolve([]);
    },
  });
  runtime = new KanjiRuntime({ mode: "google", analyzerFactories: { google: async () => analyzer } });
  await runtime.enable();
  runtime.plan({ text: "東京" });
  queueMicrotask(() => runtime.pause());
  await settle();
  assert.equal(calls, 1);
  runtime.plan({ text: "大阪" });
  await settle();
  assert.equal(calls, 1);
  runtime.resume();
  await settle();
  assert.equal(calls, 2);
  runtime.disable();
});

function runtimePlan(plan) {
  return { plan, forget() {}, pause() {}, resume() {} };
}

function controlledCoordinator(dom, options = {}) {
  const timers = [];
  const coordinator = new AnnotationCoordinator({
    document: dom.window.document, MutationObserver: null, requestIdleCallback: null,
    now: () => 0, ...options,
    setTimer(callback) { const timer = { callback, cancelled: false }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  const next = () => {
    const timer = timers.shift();
    if (timer && !timer.cancelled) timer.callback();
  };
  return { coordinator, next, drain() {
    let remaining = 10000;
    while (timers.length && remaining-- > 0) next();
    assert.ok(remaining > 0, "scan did not finish");
  } };
}

async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
