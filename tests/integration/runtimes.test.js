import assert from "node:assert/strict";
import test from "node:test";

import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { KatakanaRuntime } from "../../src/katakana-runtime.js";

test("KanjiRuntime shares one pending exact-text analysis and caches failure for its enable cycle", async () => {
  const gate = deferred();
  const calls = [];
  const changed = [];
  const runtime = new KanjiRuntime({
    mode: "google",
    analyzerFactories: {
      google: async () => async (text, { signal }) => {
        calls.push({ text, signal });
        return gate.promise;
      },
    },
    onPlanChanged: (record) => changed.push(record),
  });
  const first = { text: "東京" };
  const second = { text: "東京" };

  await runtime.enable();
  assert.equal(runtime.plan(first).status, "pending");
  assert.equal(runtime.plan(second).status, "pending");
  await tick();
  assert.deepEqual(calls.map(({ text }) => text), ["東京"]);

  gate.resolve([{ type: "text", text: "東京" }]);
  await tick();
  assert.equal(runtime.plan(first).status, "failure");
  assert.equal(runtime.plan(second).status, "failure");
  assert.deepEqual(new Set(changed), new Set([first, second]));
  assert.equal(calls.length, 1, "failure is not retried during the same enable cycle");
});

test("KanjiRuntime mode replacement aborts only its own work and clears its page cache", async () => {
  const oldGate = deferred();
  const calls = [];
  const runtime = new KanjiRuntime({
    mode: "google",
    analyzerFactories: {
      google: async () => async (_text, { signal }) => {
        calls.push({ mode: "google", signal });
        return oldGate.promise;
      },
      local: async () => (text) => [{
        type: "annotation", surface: text, reading: "トウキョウ", romaji: "Tōkyō",
      }],
    },
  });

  await runtime.enable();
  runtime.plan({ text: "東京" });
  await tick();
  await runtime.setMode("local");
  assert.equal(calls[0].signal.aborted, true);
  const current = runtime.plan({ text: "東京" });
  assert.equal(current.status, "success");
  assert.equal(current.ranges[0].romaji, "Tōkyō");
});

test("KatakanaRuntime deduplicates pending positions, preserves FIFO, and caches failure", async () => {
  const gate = deferred();
  const calls = [];
  const changed = [];
  const runtime = new KatakanaRuntime({
    provider: "google",
    translatorFactories: {
      google: () => async (phrases, { signal }) => {
        calls.push({ phrases, signal });
        return gate.promise;
      },
    },
    onPlanChanged: (record) => changed.push(record),
  });
  const first = { text: "ゲームとテレビ" };
  const second = { text: "ゲーム" };

  await runtime.enable();
  assert.deepEqual(runtime.plan(first).reservations.map(({ text }) => text), ["ゲーム", "テレビ"]);
  runtime.plan(second);
  await tick();
  assert.deepEqual(calls.map(({ phrases }) => phrases), [["ゲーム", "テレビ"]]);

  gate.resolve(new Map([["ゲーム", "game"]]));
  await tick();
  assert.deepEqual(runtime.plan(first).ranges.map(({ annotation }) => annotation), ["game"]);
  assert.equal(runtime.plan(first).reservations.length, 1);
  assert.deepEqual(new Set(changed), new Set([first, second]));
  assert.equal(calls.length, 1, "missing translation is a cached failure");
});

test("separate runtimes can start the same provider concurrently without sharing state", async () => {
  const kanjiGate = deferred();
  const katakanaGate = deferred();
  let kanjiStarted = false;
  let katakanaStarted = false;
  const kanji = new KanjiRuntime({
    mode: "bing",
    analyzerFactories: {
      bing: async () => async () => {
        kanjiStarted = true;
        return kanjiGate.promise;
      },
    },
  });
  const katakana = new KatakanaRuntime({
    provider: "bing",
    translatorFactories: {
      bing: () => async () => {
        katakanaStarted = true;
        return katakanaGate.promise;
      },
    },
  });

  await Promise.all([kanji.enable(), katakana.enable()]);
  kanji.plan({ text: "東京" });
  katakana.plan({ text: "ゲーム" });
  await tick();
  assert.equal(kanjiStarted, true);
  assert.equal(katakanaStarted, true);

  kanji.disable();
  assert.equal(katakana.plan({ text: "ゲーム" }).status, "pending");
  katakanaGate.resolve(new Map([["ゲーム", "game"]]));
  kanjiGate.resolve([{ type: "text", text: "東京" }]);
});

test("KatakanaRuntime keeps full-width and half-width source identities separate", async () => {
  const calls = [];
  const runtime = new KatakanaRuntime({
    provider: "google",
    translatorFactories: {
      google: () => async (phrases) => {
        calls.push(phrases);
        return new Map(phrases.map((phrase) => [phrase, `en:${phrase}`]));
      },
    },
  });
  await runtime.enable();

  runtime.plan({ text: "ゲームとｹﾞｰﾑ" });
  await tick();
  assert.deepEqual(calls, [["ゲーム", "ｹﾞｰﾑ"]]);
});

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

async function tick() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
