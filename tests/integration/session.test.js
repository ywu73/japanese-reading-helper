import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createYomiRubySession } from "../../src/session.js";

test("starts and stops two independent deep runtimes while sharing only UI styles and the DOM seam", async () => {
  const dom = new JSDOM("<main>日本語とゲーム</main>");
  const coordinator = coordinatorHarness();
  let localLoads = 0;
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    kanjiAnalyzerFactories: {
      local: async () => { localLoads += 1; return (text) => [{ type: "text", text }]; },
    },
    translationProviderFactories: {
      google: () => async () => new Map(),
    },
  });

  await session.katakana.enable();
  assert.equal(localLoads, 0);
  await session.kanji.enable();
  assert.equal(localLoads, 1);
  assert.equal(coordinator.kanji.length, 1);
  assert.equal(coordinator.katakana.length, 1);

  session.kanji.disable();
  assert.ok(dom.window.document.querySelector("[data-yomi-ruby-style]"));
  assert.equal(session.katakanaRuntime.active, true);
  session.katakana.disable();
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-style]"), null);
});

test("active mode replacement aborts old startup and keeps the saved new selection on startup failure", async () => {
  const dom = new JSDOM("<main>東京</main>");
  const coordinator = coordinatorHarness();
  const oldGate = deferred();
  let oldSignal;
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    kanjiMode: "google",
    kanjiAnalyzerFactories: {
      google: async ({ signal }) => { oldSignal = signal; return oldGate.promise; },
      local: async () => { throw new Error("dictionary unavailable"); },
    },
    translationProviderFactories: { google: () => async () => new Map() },
    logger: { error() {} },
  });

  const enabling = session.kanji.enable();
  await waitFor(() => oldSignal);
  session.kanji.disable();
  assert.equal(oldSignal.aborted, true);
  oldGate.resolve((text) => [{ type: "text", text }]);
  await enabling;

  await session.kanji.setMode("local");
  await session.kanji.enable();
  assert.equal(session.kanjiRuntime.mode, "local");
  assert.equal(session.kanjiRuntime.active, false);
  assert.match(dom.window.document.querySelector("[data-yomi-ruby-status]").textContent, /dictionary unavailable/u);
});

test("provider replacement is inert while disabled and an active replacement clears only katakana", async () => {
  const dom = new JSDOM("<main>ゲーム</main>");
  const coordinator = coordinatorHarness();
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    kanjiAnalyzerFactories: { local: async () => (text) => [{ type: "text", text }] },
    translationProvider: "google",
    translationProviderFactories: {
      google: () => async () => new Map(),
      bing: () => async () => new Map(),
    },
  });

  await session.katakana.setProvider("bing");
  assert.equal(session.katakanaRuntime.provider, "bing");
  assert.equal(coordinator.katakana.length, 0);
  await session.katakana.enable();
  await session.kanji.enable();
  await session.katakana.setProvider("google");
  assert.equal(session.katakanaRuntime.provider, "google");
  assert.equal(session.kanjiRuntime.active, true);
  assert.equal(coordinator.kanjiDisables, 0);
  assert.equal(coordinator.katakanaDisables, 1);
});

function coordinatorHarness() {
  return {
    kanji: [],
    katakana: [],
    kanjiDisables: 0,
    katakanaDisables: 0,
    enableKanji(runtime) { this.kanji.push(runtime); },
    disableKanji() { this.kanjiDisables += 1; },
    enableKatakana(runtime) { this.katakana.push(runtime); },
    disableKatakana() { this.katakanaDisables += 1; },
    refresh() {},
    stop() {},
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
