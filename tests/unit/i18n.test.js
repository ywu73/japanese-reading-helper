import assert from "node:assert/strict";
import test from "node:test";

import { createLocalizer, initializeLocale } from "../../src/i18n.js";

test("first initialization maps a zh primary browser language to Simplified Chinese and persists it", async () => {
  const values = new Map();

  const result = await initializeLocale({
    getValue: async (key, fallback) => values.get(key) ?? fallback,
    setValue: async (key, value) => values.set(key, value),
    primaryLanguage: "zh-TW",
  });

  assert.deepEqual(result, { locale: "zh", persistenceError: null });
  assert.equal(values.get("yomi-ruby:locale"), "zh");
});

test("first initialization maps every non-zh primary browser language to English", async () => {
  const values = new Map();

  const result = await initializeLocale({
    getValue: async (key, fallback) => values.get(key) ?? fallback,
    setValue: async (key, value) => values.set(key, value),
    primaryLanguage: "ja-JP",
  });

  assert.deepEqual(result, { locale: "en", persistenceError: null });
  assert.equal(values.get("yomi-ruby:locale"), "en");
});

test("a stored locale wins permanently without another browser-language detection write", async () => {
  const writes = [];

  const result = await initializeLocale({
    getValue: async () => "en",
    setValue: async (...values) => writes.push(values),
    primaryLanguage: "zh-CN",
  });

  assert.deepEqual(result, { locale: "en", persistenceError: null });
  assert.deepEqual(writes, []);
});

test("an invalid stored locale falls back to English instead of re-detecting the browser", async () => {
  const writes = [];

  const result = await initializeLocale({
    getValue: async () => "fr",
    setValue: async (...values) => writes.push(values),
    primaryLanguage: "zh-CN",
  });

  assert.deepEqual(result, { locale: "en", persistenceError: null });
  assert.deepEqual(writes, [["yomi-ruby:locale", "en"]]);
});

test("a first-run locale write failure keeps the detected language for this page and exposes the error", async () => {
  const storageError = new Error("storage denied");

  const result = await initializeLocale({
    getValue: async (_key, fallback) => fallback,
    setValue: async () => { throw storageError; },
    primaryLanguage: "zh-Hans",
  });

  assert.deepEqual(result, { locale: "zh", persistenceError: storageError });
});

test("a locale read failure falls back to English without attempting another storage operation", async () => {
  const storageError = new Error("storage unavailable");
  const writes = [];

  const result = await initializeLocale({
    getValue: async () => { throw storageError; },
    setValue: async (...values) => writes.push(values),
    primaryLanguage: "zh-CN",
  });

  assert.deepEqual(result, { locale: "en", persistenceError: storageError });
  assert.deepEqual(writes, []);
});

test("the localizer exposes the settled menu copy and changes language in page memory", () => {
  const localizer = createLocalizer("en");

  assert.equal(localizer.t("menu.enableKanji"), "Enable Kanji Romaji on this site");
  assert.equal(localizer.t("menu.language"), "语言 / Language: 切换到简体中文");

  localizer.setLocale("zh");

  assert.equal(localizer.getLocale(), "zh");
  assert.equal(localizer.t("menu.enableKatakana"), "开启本网站联网片假名英文");
  assert.equal(localizer.t("menu.language"), "语言 / Language: Switch to English");
});

test("the localizer renders the opposite translation provider and provider persistence errors", () => {
  const localizer = createLocalizer("en");

  assert.equal(
    localizer.t("menu.translationProvider", { nextProvider: "bing" }),
    "Katakana Translator: Switch to Bing",
  );
  assert.equal(
    localizer.t("error.translationProviderPersistence", { error: "storage denied" }),
    "Could not save the translation provider: storage denied. The previous provider remains active.",
  );

  localizer.setLocale("zh");
  assert.equal(
    localizer.t("menu.translationProvider", { nextProvider: "google" }),
    "片假名翻译服务：切换到 Google",
  );
  assert.equal(
    localizer.t("error.translationProviderRead", { error: "storage unavailable" }),
    "无法读取片假名翻译服务设置，本页使用语言对应的默认服务：storage unavailable",
  );
});

test("a missing translation in the active language falls back to the English catalog", () => {
  const localizer = createLocalizer("zh", {
    en: { example: "English fallback" },
    zh: {},
  });

  assert.equal(localizer.t("example"), "English fallback");
});
