import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createAnalyzer, createCooperativeAnalyzer } from "../../src/analyzer.js";
import { buildStaticTokenizerAsync } from "../../src/static-tokenizer.js";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";
import { createYomiRubySession } from "../../src/session.js";
import { installYomiRubyControls } from "../../src/controls.js";
import { createLocalizer } from "../../src/i18n.js";

const tokenizerPromise = (async () => {
  const manifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
  const dictionaries = new Map();
  for (const asset of manifest.dictionary) {
    const bytes = await readFile(new URL(`../../node_modules/kuromoji/dict/${asset.name}`, import.meta.url));
    dictionaries.set(asset.name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return buildStaticTokenizerAsync(dictionaries);
})();

test("cooperative local analysis preserves real tokenizer output and yields between existing sentence boundaries", async () => {
  const tokenizer = await tokenizerPromise;
  let yields = 0;
  const analyze = createCooperativeAnalyzer(tokenizer, { yieldTask: async () => { yields++; } });
  const text = "今日は東京で日本語を勉強し、食べる方法を思う。カタカナ ABC 𠮷。".repeat(100);
  assert.deepEqual(await analyze(text), createAnalyzer(tokenizer)(text));
  assert.ok(yields >= 2);
  assert.deepEqual(analyze("東京"), createAnalyzer(tokenizer)("東京"), "Short inputs retain the synchronous path.");
  const unbroken = "日本語".repeat(400);
  assert.deepEqual(await analyze(unbroken), createAnalyzer(tokenizer)(unbroken), "An unbroken word sequence is never cut at an arbitrary offset.");
});

test("aborting a long analysis at a yield prevents subsequent tokenizer calls", async () => {
  const controller = new AbortController();
  const calls = [];
  const analyze = createCooperativeAnalyzer({ tokenize(text) { calls.push(text); return []; } }, {
    chunkSize: 4, yieldTask: async () => { controller.abort(); },
  });
  await assert.rejects(analyze("東京。大阪。京都。", { signal: controller.signal }), { name: "AbortError" });
  assert.deepEqual(calls, ["東京。大阪。"]);
});

for (const action of ["complete", "stop", "edit", "hide", "replace-plan"]) {
  test(`long render jobs yield and safely handle ${action}`, () => {
    const source = "東京".repeat(180);
    const dom = new JSDOM(`<p>${source}</p>`, { pretendToBeVisual: true });
    const harness = scheduler(dom);
    let reading = "tōkyō";
    const runtime = {
      plan: () => ({ ranges: Array.from({ length: 180 }, (_, index) => ({
        start: index * 2, end: index * 2 + 2, text: "東京", romaji: reading,
      })) }),
      forget() {}, pause() {}, resume() {},
    };
    const { coordinator } = harness;
    coordinator.enableKanji(runtime);
    harness.next();
    assert.equal(coordinator.renderJobs.size, 1);
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 0);
    const paragraph = dom.window.document.querySelector("p");
    while (!paragraph.querySelector("ruby")) harness.next();
    assert.ok(paragraph.querySelectorAll("ruby").length < 180, "Live insertion is split across turns.");
    assert.equal([...paragraph.childNodes].map((node) => node.querySelector?.(".yomi-ruby-base")?.textContent ?? node.textContent).join(""), source);
    if (action === "stop") coordinator.stop();
    if (action === "edit") paragraph.replaceChildren(dom.window.document.createTextNode("大阪"));
    if (action === "hide") paragraph.hidden = true;
    if (action === "replace-plan") {
      reading = "Tokyo";
      coordinator.refresh([...coordinator.records][0]);
    }
    harness.drain();
    if (action === "complete" || action === "replace-plan") {
      assert.equal(paragraph.querySelectorAll("ruby").length, 180);
      assert.ok([...paragraph.querySelectorAll("rt")].every((node) => node.textContent === reading));
    } else {
      assert.equal(paragraph.querySelectorAll("ruby").length, 0);
    }
    coordinator.stop();
    assert.equal(paragraph.textContent, action === "edit" ? "大阪" : source);
    assert.equal(coordinator.renderJobs.size, 0);
    dom.window.close();
  });
}

for (const feature of ["kanji", "katakana"]) {
  test(`${feature} retry sends only failed candidates and preserves successful annotations`, async () => {
    const text = feature === "kanji" ? "東京と大阪" : "ゲームとテレビ";
    const words = feature === "kanji" ? ["東京", "大阪"] : ["ゲーム", "テレビ"];
    const requests = [];
    const provider = async (candidates) => {
      requests.push(candidates);
      return requests.length === 1 ? new Map([[words[0], "first"]]) : new Map([[words[1], "second"]]);
    };
    const dom = new JSDOM(`<p>${text}</p>`, { pretendToBeVisual: true });
    const harness = scheduler(dom);
    const session = createYomiRubySession({
      document: dom.window.document, coordinator: harness.coordinator, kanjiMode: "google",
      kanjiAnalyzerFactories: { google: async () => createOnlineKanjiAnalyzer({ romanizeWords: provider }) },
      translationProviderFactories: { google: () => provider },
    });
    await session[feature].enable();
    await harness.flush();
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 1);
    assert.equal(session[feature].getState().hasFailures, true);
    await session[feature].retry();
    await session[feature].retry();
    assert.equal(dom.window.document.querySelector("rt").textContent, "first");
    await harness.flush();
    assert.deepEqual(requests, [words, [words[1]]]);
    assert.equal(dom.window.document.querySelectorAll("ruby").length, 2);
    assert.equal(session[feature].getState().hasFailures, false);
    session.stop();
    assert.equal(dom.window.document.body.innerHTML, `<p>${text}</p>`);
    dom.window.close();
  });
}

test("startup menu reports dictionary progress, supports cancellation and ignores stale progress/rejection", async () => {
  const dom = new JSDOM("<p>東京</p>", { pretendToBeVisual: true });
  const harness = scheduler(dom);
  const operations = [];
  const session = createYomiRubySession({
    document: dom.window.document, coordinator: harness.coordinator,
    kanjiAnalyzerFactories: { local: ({ signal, onProgress }) => new Promise((resolve, reject) => {
      operations.push({ signal, onProgress, resolve, reject });
    }) },
    translationProviderFactories: { google: () => async () => new Map() }, logger: { error() {} },
  });
  const menus = new Map();
  let nextId = 0;
  const values = new Map();
  const controls = await installYomiRubyControls({
    origin: "https://fixture.example", getValue: (key, fallback) => values.get(key) ?? fallback,
    setValue: (key, value) => values.set(key, value), localizer: createLocalizer("en"), kanjiRomajiMode: "local",
    translationProvider: "google", kanji: session.kanji, katakana: session.katakana, showStatus: session.showStatus,
    registerMenuCommand: (label, callback) => { menus.set(++nextId, { label, callback }); return nextId; },
    unregisterMenuCommand: (id) => menus.delete(id),
  });
  const invoke = (prefix) => {
    const menu = [...menus.values()].find(({ label }) => label.startsWith(prefix));
    assert.ok(menu, `Missing menu ${prefix}`);
    return menu.callback();
  };
  const starting = invoke("Enable Kanji");
  await settle();
  operations[0].onProgress({ completed: 3, total: 12 });
  assert.ok([...menus.values()].some(({ label }) => label.includes("3/12 dictionaries")));
  await invoke("Disable Kanji");
  assert.equal(operations[0].signal.aborted, true);
  const restarting = invoke("Enable Kanji");
  await settle();
  operations[0].onProgress({ completed: 12, total: 12 });
  operations[0].reject(new Error("late failure"));
  await starting;
  assert.equal(session.kanji.getState().phase, "loading");
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-status]"), null);
  operations[1].reject(new Error("current failure"));
  await restarting;
  assert.equal(session.kanji.getState().phase, "error");
  assert.ok([...menus.values()].some(({ label }) => label.includes("startup failed")));
  const retry = invoke("Retry Kanji Romaji startup");
  await settle();
  operations[2].resolve((text) => [{ type: "text", text }]);
  await retry;
  assert.equal(session.kanji.getState().phase, "running");
  assert.ok([...menus.values()].some(({ label }) => label.includes("(running)")));
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-status]"), null);
  await invoke("Disable Kanji");
  controls.dispose(); session.stop(); dom.window.close();
});

test("switching mode during dictionary loading starts the selected mode and cancels the old startup", async () => {
  const dom = new JSDOM("<p>東京</p>", { pretendToBeVisual: true });
  const harness = scheduler(dom);
  let rejectOld;
  let oldSignal;
  const session = createYomiRubySession({
    document: dom.window.document, coordinator: harness.coordinator,
    kanjiAnalyzerFactories: {
      local: ({ signal }) => { oldSignal = signal; return new Promise((_, reject) => { rejectOld = reject; }); },
      google: async () => (text) => [{ type: "text", text }],
    },
    translationProviderFactories: { google: () => async () => new Map() },
  });
  const starting = session.kanji.enable();
  await session.kanji.setMode("google");
  rejectOld(new Error("cancelled"));
  await starting;
  assert.equal(oldSignal.aborted, true);
  assert.equal(session.kanjiRuntime.mode, "google");
  assert.equal(session.kanji.getState().phase, "running");
  session.stop(); dom.window.close();
});

function scheduler(dom) {
  const timers = new Map();
  let nextId = 0;
  const coordinator = new AnnotationCoordinator({
    document: dom.window.document, MutationObserver: null, requestIdleCallback: null,
    scanBatchSize: 10, now: () => 0,
    setTimer(callback) { timers.set(++nextId, callback); return nextId; },
    clearTimer(id) { timers.delete(id); },
  });
  const next = () => {
    const entry = timers.entries().next().value;
    if (entry) { timers.delete(entry[0]); entry[1](); }
  };
  const drain = () => {
    let remaining = 1000;
    while (timers.size && remaining-- > 0) next();
    assert.ok(remaining > 0);
  };
  return { coordinator, next, drain, async flush() {
    for (let index = 0; index < 10; index++) { drain(); await settle(); }
  } };
}

async function settle() {
  for (let index = 0; index < 50; index++) await Promise.resolve();
}
