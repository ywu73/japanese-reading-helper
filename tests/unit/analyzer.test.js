import test from "node:test";
import assert from "node:assert/strict";

import { segmentsFromTokens } from "../../src/analyzer.js";

test("annotates only reliable known tokens containing kanji and preserves gaps", () => {
  const text = " 今日は 日本語を勉強します。";
  const tokens = [
    token("今日", "キョウ", 2),
    token("は", "ハ", 4),
    token("日本語", "ニホンゴ", 6),
    token("を", "ヲ", 9),
    token("勉強", "ベンキョウ", 10),
    token("し", "シ", 12),
    token("ます", "マス", 13),
    token("。", "。", 15),
  ];

  assert.deepEqual(segmentsFromTokens(text, tokens), [
    { type: "text", text: " " },
    { type: "annotation", surface: "今日", reading: "キョウ", romaji: "kyō" },
    { type: "text", text: "は " },
    { type: "annotation", surface: "日本語", reading: "ニホンゴ", romaji: "nihongo" },
    { type: "text", text: "を" },
    { type: "annotation", surface: "勉強", reading: "ベンキョウ", romaji: "benkyō" },
    { type: "text", text: "します。" },
  ]);
});

test("uses the whole mixed token and skips unknown or unreadable kanji", () => {
  const text = "食べる 小鳥遊";
  const tokens = [
    token("食べる", "タベル", 1),
    token("小鳥", "コトリ", 5),
    token("遊", undefined, 7, "UNKNOWN"),
  ];

  assert.deepEqual(segmentsFromTokens(text, tokens), [
    { type: "annotation", surface: "食べる", reading: "タベル", romaji: "taberu" },
    { type: "text", text: " " },
    { type: "annotation", surface: "小鳥", reading: "コトリ", romaji: "kotori" },
    { type: "text", text: "遊" },
  ]);
});

test("fails closed when token positions do not match the source", () => {
  assert.deepEqual(segmentsFromTokens("東京", [token("大阪", "オオサカ", 1)]), [
    { type: "text", text: "東京" },
  ]);
});

test("converts Kuromoji code-point positions safely after astral characters", () => {
  const text = "😀東京";
  assert.deepEqual(segmentsFromTokens(text, [
    token("😀", undefined, 1, "UNKNOWN"),
    token("東京", "トウキョウ", 2),
  ]), [
    { type: "text", text: "😀" },
    { type: "annotation", surface: "東京", reading: "トウキョウ", romaji: "tōkyō" },
  ]);
});

function token(surface_form, reading, word_position, word_type = "KNOWN") {
  return {
    surface_form,
    reading,
    word_position,
    word_type,
    pos: "名詞",
  };
}
