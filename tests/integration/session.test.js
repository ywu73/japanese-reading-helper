import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createYomiRubySession } from "../../src/session.js";

test("katakana-only activation does not load Kuromoji and enables only the coordinator translation path", async () => {
  const dom = new JSDOM("<main>ゲーム</main>");
  let tokenizerLoads = 0;
  let kanjiEnables = 0;
  let katakanaEnables = 0;
  const coordinator = {
    enableKanji() { kanjiEnables += 1; },
    disableKanji() {},
    enableKatakana(translate) {
      katakanaEnables += 1;
      assert.equal(typeof translate, "function");
    },
    disableKatakana() {},
    stop() {},
  };
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => {
      tokenizerLoads += 1;
      return {};
    },
    createAnalyzer: () => () => [],
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.katakana.enable();

  assert.equal(tokenizerLoads, 0);
  assert.equal(kanjiEnables, 0);
  assert.equal(katakanaEnables, 1);
});

test("shared styles remain until both feature sessions are disabled", async () => {
  const dom = new JSDOM("<main>日本語とゲーム</main>");
  const coordinator = coordinatorHarness();
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => ({ id: "tokenizer" }),
    createAnalyzer: () => () => [],
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.kanji.enable();
  await session.katakana.enable();
  session.kanji.disable();

  assert.ok(dom.window.document.querySelector("[data-yomi-ruby-style]"));
  assert.equal(coordinator.kanjiDisables, 1);
  assert.equal(coordinator.katakanaDisables, 0);

  session.katakana.disable();
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-style]"), null);
});

test("disabling during tokenizer loading invalidates the late kanji result while katakana stays active", async () => {
  const dom = new JSDOM("<main>型ゲーム</main>");
  const tokenizerGate = deferred();
  const coordinator = coordinatorHarness();
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => tokenizerGate.promise,
    createAnalyzer: () => () => [],
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.katakana.enable();
  const enablingKanji = session.kanji.enable();
  session.kanji.disable();
  tokenizerGate.resolve({ id: "stale" });
  await enablingKanji;

  assert.equal(coordinator.kanjiEnables, 0);
  assert.equal(coordinator.katakanaEnables, 1);
  assert.ok(dom.window.document.querySelector("[data-yomi-ruby-style]"));
});

test("kanji disable releases the tokenizer path so a later enable loads a fresh analyzer", async () => {
  const dom = new JSDOM("<main>日本語</main>");
  const coordinator = coordinatorHarness();
  const loaded = [];
  const analyzed = [];
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => {
      const tokenizer = { id: loaded.length + 1 };
      loaded.push(tokenizer);
      return tokenizer;
    },
    createAnalyzer: (tokenizer) => {
      analyzed.push(tokenizer);
      return () => [];
    },
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.kanji.enable();
  session.kanji.disable();
  await session.kanji.enable();

  assert.deepEqual(loaded.map(({ id }) => id), [1, 2]);
  assert.deepEqual(analyzed.map(({ id }) => id), [1, 2]);
  assert.equal(coordinator.kanjiEnables, 2);
});

test("a failed kanji load remains fail closed and a later enable retries without stopping katakana", async () => {
  const dom = new JSDOM("<main>型ゲーム</main>");
  const coordinator = coordinatorHarness();
  let loadCount = 0;
  const errors = [];
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => {
      loadCount += 1;
      if (loadCount === 1) {
        throw new Error("dictionary unavailable");
      }
      return { id: "retry" };
    },
    createAnalyzer: () => () => [],
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
    logger: { error: (...values) => errors.push(values) },
  });

  await session.katakana.enable();
  await session.kanji.enable();
  assert.equal(coordinator.kanjiEnables, 0);
  assert.equal(coordinator.katakanaEnables, 1);

  await session.kanji.enable();
  assert.equal(loadCount, 2);
  assert.equal(coordinator.kanjiEnables, 1);
  assert.equal(coordinator.katakanaDisables, 0);
  assert.equal(errors.length, 1);
});

test("a katakana coordinator startup failure rolls back and reports fail-closed status", async () => {
  const dom = new JSDOM("<main>ゲーム</main>");
  const errors = [];
  let disableCount = 0;
  const coordinator = {
    enableKanji() {},
    disableKanji() {},
    enableKatakana() { throw new Error("observer unavailable"); },
    disableKatakana() { disableCount += 1; },
    stop() {},
  };
  const session = createYomiRubySession({
    document: dom.window.document,
    coordinator,
    loadTokenizer: async () => ({}),
    createAnalyzer: () => () => [],
    translatePhrases: async () => new Map(),
    setTimer: () => 1,
    clearTimer: () => {},
    logger: { error: (...values) => errors.push(values) },
  });

  await session.katakana.enable();

  assert.equal(disableCount, 1);
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-status]").getAttribute("role"), "alert");
  assert.match(dom.window.document.querySelector("[data-yomi-ruby-status]").textContent, /无法安全启动片假名英文/u);
  assert.equal(errors.length, 1);
});

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function coordinatorHarness() {
  return {
    kanjiEnables: 0,
    kanjiDisables: 0,
    katakanaEnables: 0,
    katakanaDisables: 0,
    enableKanji() { this.kanjiEnables += 1; },
    disableKanji() { this.kanjiDisables += 1; },
    enableKatakana() { this.katakanaEnables += 1; },
    disableKatakana() { this.katakanaDisables += 1; },
    stop() {},
  };
}
