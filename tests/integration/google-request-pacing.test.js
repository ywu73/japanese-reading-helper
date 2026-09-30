import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleKanjiRomajiClient } from "../../src/google-kanji-romaji.js";
import { createGoogleTranslationClient } from "../../src/katakana-translation.js";
import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";
import { KanjiRuntime } from "../../src/kanji-runtime.js";
import { KatakanaRuntime } from "../../src/katakana-runtime.js";

const features = [
  {
    name: "kanji",
    words: ["東京", "大阪"],
    createRuntime(options) {
      return new KanjiRuntime({ mode: "google", analyzerFactories: {
        google: () => createOnlineKanjiAnalyzer({
          romanizeWords: createGoogleKanjiRomajiClient(options).romanizeWords,
        }),
      } });
    },
    response(word) { return JSON.stringify([[[word, word], [null, null, "reading"]], null, "ja"]); },
  },
  {
    name: "katakana",
    words: ["ゲーム", "テレビ"],
    createRuntime(options) {
      return new KatakanaRuntime({ provider: "google", translatorFactories: {
        google: () => createGoogleTranslationClient(options).translatePhrases,
      } });
    },
    response(word) { return JSON.stringify([[["translation", word]]]); },
  },
];

for (const feature of features) {
  test(`Google ${feature.name} throttles a later runtime operation on the same client`, async () => {
    const harness = createHarness(feature);
    const first = { text: feature.words[0] };
    const later = { text: feature.words[1] };
    try {
      await harness.runtime.enable();
      harness.runtime.plan(first);
      await settle();
      assert.equal(harness.requests.length, 1);
      harness.respond(0);
      await settle();
      assert.equal(harness.runtime.plan(first).status, "success");

      harness.runtime.plan(later);
      await settle();
      assert.deepEqual(harness.waits.map(({ milliseconds }) => milliseconds), [250]);
      assert.equal(harness.requests.length, 1, "dynamic content must wait before another request");
      harness.waits[0].resolve();
      await settle();
      assert.equal(harness.requests.length, 2);
      harness.respond(1);
      await settle();
      assert.equal(harness.runtime.plan(later).status, "success");
    } finally { harness.runtime.stop(); }
  });

  test(`Google ${feature.name} cancels an inter-operation wait without dispatch or late progress`, async () => {
    const harness = createHarness(feature);
    try {
      await harness.runtime.enable();
      harness.runtime.plan({ text: feature.words[0] });
      await settle();
      harness.respond(0);
      await settle();
      harness.runtime.plan({ text: feature.words[1] });
      await settle();
      assert.equal(harness.waits.length, 1);
      harness.runtime.disable();
      assert.equal(harness.waits[0].signal.aborted, true);
      // A late timer completion must still fail the request's signal check.
      harness.waits[0].resolve();
      await settle();
      assert.equal(harness.requests.length, 1);
      assert.equal(harness.runtime.cache.size, 0);

      await harness.runtime.enable();
      harness.runtime.plan({ text: feature.words[1] });
      await settle();
      assert.equal(harness.requests.length, 2, "a new enable cycle has an independent client");
      assert.equal(harness.waits.length, 1);
      harness.respond(1);
      await settle();
    } finally { harness.runtime.stop(); }
  });
}

test("Google kanji and katakana keep independent pacing state", async () => {
  const harnesses = features.map(createHarness);
  try {
    for (const [index, harness] of harnesses.entries()) {
      await harness.runtime.enable();
      harness.runtime.plan({ text: features[index].words[0] });
      await settle();
    }
    assert.deepEqual(harnesses.map(({ requests }) => requests.length), [1, 1]);
    assert.deepEqual(harnesses.map(({ waits }) => waits.length), [0, 0]);
    for (const harness of harnesses) harness.respond(0);
    await settle();
  } finally { for (const harness of harnesses) harness.runtime.stop(); }
});

function createHarness(feature) {
  const requests = [], waits = [];
  const runtime = feature.createRuntime({
    gmRequest(options) { requests.push(options); return { abort() {} }; },
    sleep(milliseconds, { signal }) {
      return new Promise((resolve) => waits.push({ milliseconds, signal, resolve }));
    },
  });
  return { runtime, requests, waits, respond(index) {
    const request = requests[index];
    const word = new URL(request.url).searchParams.get("q");
    request.onload({ status: 200, finalUrl: request.url, responseText: feature.response(word) });
  } };
}

async function settle() { for (let index = 0; index < 100; index++) await Promise.resolve(); }
