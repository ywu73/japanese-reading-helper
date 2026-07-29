import assert from "node:assert/strict";
import test from "node:test";

import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";

test("sends only complete deduplicated isWordLike segments containing kanji", async () => {
  const calls = [];
  const analyze = createOnlineKanjiAnalyzer({
    Segmenter: fixedSegmenter([
      { segment: "私は", index: 0, isWordLike: true },
      { segment: "食べる", index: 2, isWordLike: true },
      { segment: "。", index: 5, isWordLike: false },
      { segment: "食べる", index: 6, isWordLike: true },
    ]),
    async romanizeWords(words) {
      calls.push(words);
      return new Map([
        ["私は", "watashiwa"],
        ["食べる", "taberu"],
      ]);
    },
  });

  assert.deepEqual(await analyze("私は食べる。食べる"), [
    { type: "annotation", surface: "私は", romaji: "watashiwa" },
    { type: "annotation", surface: "食べる", romaji: "taberu" },
    { type: "text", text: "。" },
    { type: "annotation", surface: "食べる", romaji: "taberu" },
  ]);
  assert.deepEqual(calls, [["私は", "食べる"]]);
});

test("preserves source text when the provider omits a reading or fails", async () => {
  const Segmenter = fixedSegmenter([
    { segment: "日本語", index: 0, isWordLike: true },
    { segment: "です", index: 3, isWordLike: true },
  ]);
  const partial = createOnlineKanjiAnalyzer({
    Segmenter,
    romanizeWords: async () => new Map(),
  });
  assert.deepEqual(await partial("日本語です"), [{ type: "text", text: "日本語です" }]);

  const failed = createOnlineKanjiAnalyzer({
    Segmenter,
    romanizeWords: async () => { throw new Error("offline"); },
  });
  assert.deepEqual(await failed("日本語です"), [{ type: "text", text: "日本語です" }]);
});

test("fails closed before network when segment offsets do not exactly cover the source", async () => {
  let calls = 0;
  const analyze = createOnlineKanjiAnalyzer({
    Segmenter: fixedSegmenter([
      { segment: "東京", index: 1, isWordLike: true },
    ]),
    async romanizeWords() {
      calls += 1;
      return new Map();
    },
  });

  assert.deepEqual(await analyze("東京"), [{ type: "text", text: "東京" }]);
  assert.equal(calls, 0);
});

test("keeps successful and failed word results in page memory to avoid repeated disclosure", async () => {
  const calls = [];
  const analyze = createOnlineKanjiAnalyzer({
    Segmenter: fixedSegmenter([{ segment: "東京", index: 0, isWordLike: true }]),
    async romanizeWords(words) {
      calls.push(words);
      return new Map([["東京", "Tōkyō"]]);
    },
  });

  await Promise.all([analyze("東京"), analyze("東京")]);
  assert.deepEqual(await analyze("東京"), [
    { type: "annotation", surface: "東京", romaji: "Tōkyō" },
  ]);
  assert.deepEqual(calls, [["東京"]]);

  let failureCalls = 0;
  const failed = createOnlineKanjiAnalyzer({
    Segmenter: fixedSegmenter([{ segment: "龘べる", index: 0, isWordLike: true }]),
    async romanizeWords() {
      failureCalls += 1;
      throw new Error("provider rejected the word");
    },
  });
  await failed("龘べる");
  await failed("龘べる");
  assert.equal(failureCalls, 1);
});

test("requires local Intl.Segmenter support and forwards cancellation to the provider", async () => {
  assert.throws(
    () => createOnlineKanjiAnalyzer({ Segmenter: null, romanizeWords: async () => new Map() }),
    /Intl.Segmenter/u,
  );

  let receivedSignal;
  const analyze = createOnlineKanjiAnalyzer({
    Segmenter: fixedSegmenter([{ segment: "今日", index: 0, isWordLike: true }]),
    async romanizeWords(_words, { signal }) {
      receivedSignal = signal;
      throw new DOMException("aborted", "AbortError");
    },
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(analyze("今日", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(receivedSignal, controller.signal);
});

function fixedSegmenter(segments) {
  return class FixedSegmenter {
    segment() {
      return segments;
    }
  };
}
