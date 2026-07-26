import assert from "node:assert/strict";
import test from "node:test";

import {
  getFeatureEnabledForOrigin,
  initializeTranslationProvider,
  originSettingKey,
  setFeatureEnabledForOrigin,
  setStoredLocale,
  setStoredTranslationProvider,
} from "../../src/settings.js";

test("kanji and online katakana feature states use independent exact-origin keys", async () => {
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

test("invalid persisted feature values fail closed instead of becoming truthy", async () => {
  const getValue = async () => "false";

  assert.equal(await getFeatureEnabledForOrigin(getValue, "kanji", "https://x.com"), false);
});

test("the locale persistence boundary rejects values outside the supported enum", async () => {
  const writes = [];

  await assert.rejects(
    setStoredLocale(async (...values) => writes.push(values), "ja"),
    /Unsupported YomiRuby locale/u,
  );
  assert.deepEqual(writes, []);
});

test("the translation provider persistence boundary accepts only bing and google", async () => {
  const writes = [];
  const setValue = async (...values) => writes.push(values);

  await setStoredTranslationProvider(setValue, "bing");
  await setStoredTranslationProvider(setValue, "google");
  await assert.rejects(
    setStoredTranslationProvider(setValue, "baidu"),
    /Unsupported YomiRuby translation provider/u,
  );

  assert.deepEqual(writes, [
    ["yomi-ruby:translation-provider", "bing"],
    ["yomi-ruby:translation-provider", "google"],
  ]);
});

test("provider initialization keeps a valid stored provider without another write", async () => {
  const writes = [];

  const result = await initializeTranslationProvider({
    getValue: async () => "google",
    setValue: async (...values) => writes.push(values),
    locale: "zh",
  });

  assert.deepEqual(result, {
    provider: "google",
    readError: null,
    persistenceError: null,
  });
  assert.deepEqual(writes, []);
});

test("provider initialization persists the locale-derived default once", async () => {
  for (const [locale, expected] of [["zh", "bing"], ["en", "google"]]) {
    const writes = [];
    const result = await initializeTranslationProvider({
      getValue: async (_key, fallback) => fallback,
      setValue: async (...values) => writes.push(values),
      locale,
    });

    assert.deepEqual(result, {
      provider: expected,
      readError: null,
      persistenceError: null,
    });
    assert.deepEqual(writes, [["yomi-ruby:translation-provider", expected]]);
  }
});

test("provider initialization repairs an invalid stored value to the locale default", async () => {
  const writes = [];

  const result = await initializeTranslationProvider({
    getValue: async () => "baidu",
    setValue: async (...values) => writes.push(values),
    locale: "zh",
  });

  assert.equal(result.provider, "bing");
  assert.equal(result.readError, null);
  assert.equal(result.persistenceError, null);
  assert.deepEqual(writes, [["yomi-ruby:translation-provider", "bing"]]);
});

test("provider initialization exposes repair-write and read failures without changing feature consent", async () => {
  const writeError = new Error("storage denied");
  const failedWrite = await initializeTranslationProvider({
    getValue: async (_key, fallback) => fallback,
    setValue: async () => { throw writeError; },
    locale: "zh",
  });
  assert.deepEqual(failedWrite, {
    provider: "bing",
    readError: null,
    persistenceError: writeError,
  });

  const readError = new Error("storage unavailable");
  const writes = [];
  const failedRead = await initializeTranslationProvider({
    getValue: async () => { throw readError; },
    setValue: async (...values) => writes.push(values),
    locale: "en",
  });
  assert.deepEqual(failedRead, {
    provider: "google",
    readError,
    persistenceError: null,
  });
  assert.deepEqual(writes, []);
});
