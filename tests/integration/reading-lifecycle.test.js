import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";
import { createGoogleKanjiRomajiClient } from "../../src/google-kanji-romaji.js";
import { createBingKanjiRomajiClient } from "../../src/bing-kanji-romaji.js";

test("kanji renders validated progress and retains it after a later request fails", async () => {
  const dom = new JSDOM("<main><p>東京</p><p>大阪</p></main>");
  const harness = controlledCoordinator(dom);
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) { requests.push(options); return { abort() {} }; },
    maxPhrasesPerRequest: 1, minimumIntervalMs: 0,
  });
  const runtime = new KanjiRuntime({
    mode: "google",
    analyzerFactories: { google: () => createOnlineKanjiAnalyzer({ romanizeWords: client.romanizeWords }) },
    onPlanChanged: (record) => harness.coordinator.refresh(record),
  });
  try {
    await runtime.enable(); harness.coordinator.enableKanji(runtime); harness.drain(); await settle();
    assert.equal(requests.length, 1);
    respond(requests[0], "東京", "Tōkyō"); await settle();
    assert.equal(requests.length, 2);
    assert.equal(dom.window.document.querySelector("rt")?.textContent, "Tōkyō");
    requests[1].onerror(); await settle();
    assert.equal(requests.length, 3, "only the existing same-provider exact-word fallback runs");
    requests[2].onerror(); await settle();
    assert.equal(dom.window.document.querySelector("rt")?.textContent, "Tōkyō");
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 1);
    assert.equal(runtime.hasPendingWork(), false);
    harness.coordinator.stop();
    assert.equal(dom.window.document.querySelector("main").innerHTML, "<p>東京</p><p>大阪</p>");
  } finally { harness.coordinator.stop(); runtime.stop(); dom.window.close(); }
});

test("revealed text is annotated after visibility attributes change without text mutation", async () => {
  const dom = new JSDOM('<main><p id="late" hidden>東京</p></main>');
  const harness = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
  const seen = [];
  const runtime = planRuntime((record) => { seen.push(record.text); return annotation(record.text); });
  try {
    harness.coordinator.enableKanji(runtime); harness.drain();
    assert.deepEqual(seen, []);
    dom.window.document.querySelector("#late").hidden = false;
    await settle(); harness.drain();
    assert.deepEqual(seen, ["東京"]);
    assert.equal(dom.window.document.querySelector("rt")?.textContent, "tōkyō");
  } finally { harness.coordinator.stop(); dom.window.close(); }
});

test("Bing kanji publishes its first batch before a later 429", async () => {
  const dom = new JSDOM("<main><p>東京</p><p>大阪</p></main>");
  const harness = controlledCoordinator(dom);
  const requests = [];
  const fixture = (await readFile(new URL("../fixtures/bing-translator.html", import.meta.url), "utf8"))
    .replace("{{BEFORE}}", "").replace("{{AFTER}}", "").replace("{{IID}}", "translator.5023")
    .replace("{{IG_ASSIGNMENT}}", 'window._G.IG = "A1B2C3D4E5F6";')
    .replace("{{HELPER}}", JSON.stringify([123456789, "fixture-token", 3_600_000]));
  const client = createBingKanjiRomajiClient({
    gmRequest(options) { requests.push(options); return { abort() {} }; },
    DOMParser: dom.window.DOMParser, maxPhrasesPerRequest: 1, minimumIntervalMs: 0,
  });
  const runtime = new KanjiRuntime({ mode: "bing", analyzerFactories: {
    bing: () => createOnlineKanjiAnalyzer({ romanizeWords: client.romanizeWords }),
  }, onPlanChanged: (record) => harness.coordinator.refresh(record) });
  try {
    await runtime.enable(); harness.coordinator.enableKanji(runtime); harness.drain(); await settle();
    requests[0].onload({ status: 200, finalUrl: "https://www.bing.com/translator", responseText: fixture });
    await settle();
    requests[1].onload({ status: 200, finalUrl: requests[1].url, responseText: JSON.stringify([
      { translations: [{ text: "東京", to: "ja" }] },
      { inputTransliteration: "Tokyo", script: "Latn" },
    ]) });
    await settle();
    assert.equal(dom.window.document.querySelector("rt")?.textContent, "Tokyo");
    requests[2].onload({ status: 429, responseText: "rate limit" }); await settle();
    assert.equal(requests.length, 3);
    assert.equal(dom.window.document.querySelector("rt")?.textContent, "Tokyo");
    assert.equal(runtime.hasPendingWork(), false);
  } finally { harness.coordinator.stop(); runtime.stop(); dom.window.close(); }
});

test("attribute rescans restore unsafe annotations and handle subsequent reveals", async (t) => {
  for (const [name, hidden, shown] of [
    ["hidden", "", null], ["aria-hidden", "true", "false"], ["inert", "", null],
    ["style", "display:none", "display:block"], ["class", "concealed", "visible"],
    ["contenteditable", "true", "false"],
  ]) {
    await t.test(name, async () => {
      const dom = new JSDOM('<style>.concealed {display:none}</style><main><p>東京</p></main>');
      const parent = dom.window.document.querySelector("main");
      parent.setAttribute(name, hidden);
      const harness = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
      try {
        harness.coordinator.enableKanji(planRuntime((record) => annotation(record.text))); harness.drain();
        assert.equal(dom.window.document.querySelectorAll("ruby").length, 0);
        for (let cycle = 0; cycle < 2; cycle++) {
          if (shown === null) parent.removeAttribute(name); else parent.setAttribute(name, shown);
          await settle(); harness.drain();
          assert.equal(parent.querySelectorAll("ruby").length, 1);
          parent.setAttribute(name, hidden); await settle(); harness.drain();
          assert.equal(parent.innerHTML, "<p>東京</p>");
        }
      } finally { harness.coordinator.stop(); dom.window.close(); }
    });
  }
});

test("a result arriving after content becomes editable cannot annotate it", async () => {
  const dom = new JSDOM("<main><p>東京</p></main>");
  const harness = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
  let resolve;
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: {
    google: () => () => new Promise((done) => { resolve = done; }),
  }, onPlanChanged: (record) => harness.coordinator.refresh(record) });
  try {
    await runtime.enable(); harness.coordinator.enableKanji(runtime); harness.drain();
    dom.window.document.querySelector("p").setAttribute("contenteditable", "true");
    resolve([{ type: "annotation", surface: "東京", romaji: "Tōkyō" }]); await settle();
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 0);
    harness.drain(); assert.equal(harness.coordinator.records.size, 0);
  } finally { harness.coordinator.stop(); runtime.stop(); dom.window.close(); }
});

test("closed details preserve their summary and annotate body only when opened", async () => {
  const dom = new JSDOM('<main><details><p>東京</p><summary>大阪</summary></details></main>');
  const harness = controlledCoordinator(dom, { MutationObserver: dom.window.MutationObserver });
  try {
    harness.coordinator.enableKanji(planRuntime((record) => annotation(record.text))); harness.drain();
    const details = dom.window.document.querySelector("details");
    assert.equal(details.querySelector("p ruby"), null);
    assert.ok(details.querySelector("summary ruby"));
    details.open = true; await settle(); harness.drain();
    assert.equal(details.querySelectorAll("ruby").length, 2);
    details.open = false; await settle(); harness.drain();
    assert.equal(details.querySelector("p").innerHTML, "東京");
    assert.ok(details.querySelector("summary ruby"));
  } finally { harness.coordinator.stop(); dom.window.close(); }
});

test("old kanji progress cannot overwrite a replaced mode or unlock its operation", async () => {
  const operations = [], changes = [];
  const analyze = () => { throw Error("expected batch"); };
  analyze.analyzeBatch = (texts, options) => new Promise((resolve) => operations.push({ texts, options, resolve }));
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: {
    google: () => analyze, bing: () => analyze,
  }, onPlanChanged: (record) => changes.push(record) });
  const record = { text: "東京" };
  const result = [[{ type: "annotation", surface: "東京", romaji: "Tōkyō" }]];
  try {
    await runtime.enable(); runtime.plan(record); await settle();
    await runtime.setMode("bing"); runtime.plan(record); await settle();
    operations[0].options.onProgress(result); operations[0].resolve(result); await settle();
    assert.equal(runtime.plan(record).ranges.length, 0); assert.equal(changes.length, 0);
    assert.equal(runtime.hasPendingWork(), true);
    operations[1].options.onProgress(result);
    assert.equal(runtime.plan(record).ranges[0].romaji, "Tōkyō");
    runtime.forget(record); const count = changes.length;
    operations[1].resolve(result); await settle(); assert.equal(changes.length, count);
    assert.equal(runtime.hasPendingWork(), false);
  } finally { runtime.stop(); }
});

test("full-text eviction preserves exact-word deduplication including failed words", async () => {
  const calls = [];
  const runtime = new KanjiRuntime({ mode: "google", analyzerFactories: {
    google: () => createOnlineKanjiAnalyzer({ romanizeWords: async (words) => {
      calls.push(...words); return new Map([["東京", "Tōkyō"]]);
    } }),
  } });
  try {
    await runtime.enable();
    for (let index = 0; index < 140; index++) {
      const record = { text: `東京 大阪 ${index}` };
      runtime.plan(record); await settle(); runtime.forget(record);
    }
    assert.equal(runtime.cache.has("東京 大阪 0"), false);
    const record = { text: "東京 大阪 0" };
    runtime.plan(record); await settle();
    assert.equal(runtime.plan(record).ranges[0].romaji, "Tōkyō");
    assert.deepEqual(calls, ["東京", "大阪"]);
  } finally { runtime.stop(); }
});

test("settled full-text cache stays bounded after detached records are forgotten", async () => {
  const runtime = new KanjiRuntime({ mode: "local", analyzerFactories: {
    local: () => (text) => [{ type: "text", text }],
  } });
  try {
    await runtime.enable();
    const retained = { text: "残す" };
    runtime.plan(retained);
    for (let index = 0; index < 1000; index++) {
      const record = { text: `東京${index}` };
      runtime.plan(record); runtime.forget(record);
    }
    assert.ok(runtime.cache.size <= 129, `cache retained ${runtime.cache.size} entries`);
    assert.equal(runtime.cache.has(retained.text), true);
    runtime.disable(); assert.equal(runtime.cache.size, 0);
  } finally { runtime.stop(); }
});

test("foreground restoration reprocesses records in bounded scheduled slices", () => {
  const dom = new JSDOM(`<main>${"<p>東京</p>".repeat(100)}</main>`);
  let visibility = "visible", calls = 0;
  Object.defineProperty(dom.window.document, "visibilityState", { get: () => visibility });
  const harness = controlledCoordinator(dom, { scanBatchSize: 10 });
  try {
    harness.coordinator.enableKanji(planRuntime(() => { calls++; return { ranges: [] }; }));
    harness.drain(); assert.equal(calls, 100); calls = 0;
    visibility = "hidden"; dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
    visibility = "visible"; dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
    assert.equal(calls, 0, "visibility callback must not synchronously reprocess all records");
    harness.next(); assert.ok(calls > 0 && calls <= 10);
    harness.drain(); assert.equal(calls, 100);
  } finally { harness.coordinator.stop(); dom.window.close(); }
});

function planRuntime(plan) { return { plan, forget() {}, pause() {}, resume() {} }; }
function annotation(text) { return { ranges: [{ start: 0, end: text.length, text, romaji: "tōkyō" }] }; }
function respond(request, source, romaji) {
  request.onload({ status: 200, finalUrl: request.url,
    responseText: JSON.stringify([[[source, source], [null, null, romaji]], null, "ja"]) });
}
async function settle() { for (let index = 0; index < 100; index++) await Promise.resolve(); }
function controlledCoordinator(dom, options = {}) {
  const timers = [];
  const next = () => { const timer = timers.shift(); if (timer && !timer.cancelled) timer.callback(); };
  const coordinator = new AnnotationCoordinator({ document: dom.window.document,
    MutationObserver: null, requestIdleCallback: null, now: () => 0, scanBatchSize: 1000,
    ...options,
    setTimer(callback) { const timer = { callback }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  return { coordinator, next, drain() {
    let remaining = 10000;
    while (timers.length && remaining-- > 0) next();
    assert.ok(remaining > 0, "scheduler must finish without polling");
  } };
}
