import assert from "node:assert/strict";
import test from "node:test";

import {
  getFeatureEnabledForOrigin,
  initializeKanjiRomajiMode,
  initializeTranslationProvider,
  originSettingKey,
  setFeatureEnabledForOrigin,
  setStoredKanjiRomajiMode,
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
    /Unsupported Japanese Reading Helper locale/u,
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
    /Unsupported Japanese Reading Helper translation provider/u,
  );

  assert.deepEqual(writes, [
    ["yomi-ruby:translation-provider", "bing"],
    ["yomi-ruby:translation-provider", "google"],
  ]);
});

test("the kanji romaji mode persistence boundary accepts only google, bing, and local", async () => {
  const writes = [];
  const setValue = async (...values) => writes.push(values);

  await setStoredKanjiRomajiMode(setValue, "google");
  await setStoredKanjiRomajiMode(setValue, "bing");
  await setStoredKanjiRomajiMode(setValue, "local");
  await assert.rejects(
    setStoredKanjiRomajiMode(setValue, "azure"),
    /Unsupported Japanese Reading Helper kanji romaji mode/u,
  );

  assert.deepEqual(writes, [
    ["yomi-ruby:kanji-romaji-mode", "google"],
    ["yomi-ruby:kanji-romaji-mode", "bing"],
    ["yomi-ruby:kanji-romaji-mode", "local"],
  ]);
});

test("fresh kanji mode initialization uses the language-derived online provider", async () => {
  for (const [primaryLanguage, expected] of [["zh-CN", "bing"], ["en-US", "google"]]) {
    const writes = [];
    const result = await initializeKanjiRomajiMode({
      getValue: async (_key, fallback) => fallback,
      setValue: async (...values) => writes.push(values),
      primaryLanguage,
    });

    assert.deepEqual(result, {
      mode: expected,
      readError: null,
      persistenceError: null,
    });
    assert.deepEqual(writes, [["yomi-ruby:kanji-romaji-mode", expected]]);
  }
});

test("an upgrade without a kanji mode migrates to local without expanding disclosure", async () => {
  for (const legacyKey of ["yomi-ruby:locale", "yomi-ruby:translation-provider"]) {
    const writes = [];
    const result = await initializeKanjiRomajiMode({
      getValue: async (key, fallback) => key === legacyKey ? "legacy-value" : fallback,
      setValue: async (...values) => writes.push(values),
      primaryLanguage: "zh-CN",
    });

    assert.deepEqual(result, {
      mode: "local",
      readError: null,
      persistenceError: null,
    });
    assert.deepEqual(writes, [["yomi-ruby:kanji-romaji-mode", "local"]]);
  }
});

test("kanji mode initialization keeps a valid value and repairs an invalid value to local", async () => {
  const validWrites = [];
  const valid = await initializeKanjiRomajiMode({
    getValue: async (key, fallback) => key === "yomi-ruby:kanji-romaji-mode" ? "google" : fallback,
    setValue: async (...values) => validWrites.push(values),
    primaryLanguage: "zh-CN",
  });
  assert.deepEqual(valid, {
    mode: "google",
    readError: null,
    persistenceError: null,
  });
  assert.deepEqual(validWrites, []);

  const repairWrites = [];
  const repaired = await initializeKanjiRomajiMode({
    getValue: async (key, fallback) => key === "yomi-ruby:kanji-romaji-mode" ? "azure" : fallback,
    setValue: async (...values) => repairWrites.push(values),
    primaryLanguage: "en-US",
  });
  assert.deepEqual(repaired, {
    mode: "local",
    readError: null,
    persistenceError: null,
  });
  assert.deepEqual(repairWrites, [["yomi-ruby:kanji-romaji-mode", "local"]]);
});

test("kanji mode storage failures stay local when installation history is uncertain", async () => {
  const readError = new Error("storage unavailable");
  const failedRead = await initializeKanjiRomajiMode({
    getValue: async () => { throw readError; },
    setValue: async () => assert.fail("a failed read must not be followed by a write"),
    primaryLanguage: "en-US",
  });
  assert.deepEqual(failedRead, {
    mode: "local",
    readError,
    persistenceError: null,
  });

  const writeError = new Error("storage denied");
  const failedWrite = await initializeKanjiRomajiMode({
    getValue: async (key, fallback) => key === "yomi-ruby:locale" ? "en" : fallback,
    setValue: async () => { throw writeError; },
    primaryLanguage: "en-US",
  });
  assert.deepEqual(failedWrite, {
    mode: "local",
    readError: null,
    persistenceError: writeError,
  });
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
