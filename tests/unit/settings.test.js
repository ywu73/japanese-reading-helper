import assert from "node:assert/strict";
import test from "node:test";

import {
  getFeatureEnabledForOrigin,
  originSettingKey,
  setFeatureEnabledForOrigin,
} from "../../src/settings.js";

test("kanji compatibility state and katakana network consent use independent exact-origin keys", async () => {
  const values = new Map([
    ["yomi-ruby:auto-origin:https://x.com", true],
    ["yomi-ruby:katakana-origin:https://news.example", true],
  ]);
  const getValue = async (key, fallback) => values.get(key) ?? fallback;
  const setValue = async (key, value) => values.set(key, value);

  assert.equal(originSettingKey("kanji", "https://x.com"), "yomi-ruby:auto-origin:https://x.com");
  assert.equal(
    originSettingKey("katakana", "https://x.com"),
    "yomi-ruby:katakana-origin:https://x.com",
  );
  assert.equal(await getFeatureEnabledForOrigin(getValue, "kanji", "https://x.com"), true);
  assert.equal(await getFeatureEnabledForOrigin(getValue, "katakana", "https://x.com"), false);

  await setFeatureEnabledForOrigin(setValue, "katakana", true, "https://x.com");
  assert.equal(values.get("yomi-ruby:katakana-origin:https://x.com"), true);
  assert.equal(values.get("yomi-ruby:auto-origin:https://x.com"), true);
});
