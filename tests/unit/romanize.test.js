import test from "node:test";
import assert from "node:assert/strict";

import { kanaToHepburn } from "../../src/romanize.js";

test("converts common Kuromoji readings to modified Hepburn with macrons", () => {
  assert.equal(kanaToHepburn("キョウ"), "kyō");
  assert.equal(kanaToHepburn("トウキョウ"), "tōkyō");
  assert.equal(kanaToHepburn("ベンキョウ"), "benkyō");
  assert.equal(kanaToHepburn("ホウホウ"), "hōhō");
});

test("handles mixed kana conventions, sokuon, syllabic n, and foreign sounds", () => {
  assert.equal(kanaToHepburn("ガッコウ"), "gakkō");
  assert.equal(kanaToHepburn("マッチャ"), "matcha");
  assert.equal(kanaToHepburn("シンヨウ"), "shin'yō");
  assert.equal(kanaToHepburn("コンピューター"), "konpyūtā");
  assert.equal(kanaToHepburn("ティッシュ"), "tisshu");
});

test("does not collapse conventional ei, adjective-final ii, or verb-final ou", () => {
  assert.equal(kanaToHepburn("センセイ"), "sensei");
  assert.equal(
    kanaToHepburn("オオキイ", { surface: "大きい", partOfSpeech: "形容詞" }),
    "ōkii",
  );
  assert.equal(
    kanaToHepburn("オモウ", { surface: "思う", partOfSpeech: "動詞" }),
    "omou",
  );
});

test("rejects non-kana input rather than inventing a reading", () => {
  assert.equal(kanaToHepburn(""), null);
  assert.equal(kanaToHepburn("東京"), null);
  assert.equal(kanaToHepburn(undefined), null);
});
