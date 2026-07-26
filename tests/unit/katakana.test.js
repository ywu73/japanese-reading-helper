import assert from "node:assert/strict";
import test from "node:test";

import { findKatakanaMatches } from "../../src/katakana.js";

test("finds the original full-width and half-width katakana phrase ranges without surrounding text", () => {
  const source = "前ゲームとコンピューター、後 ｺﾝﾋﾟｭｰﾀｰ 終";

  assert.deepEqual(findKatakanaMatches(source), [
    { start: 1, end: 4, text: "ゲーム" },
    { start: 5, end: 12, text: "コンピューター" },
    { start: 15, end: 23, text: "ｺﾝﾋﾟｭｰﾀｰ" },
  ]);
});
