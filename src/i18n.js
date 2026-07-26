import { getStoredLocale, isSupportedLocale, setStoredLocale } from "./settings.js";

const MESSAGES = Object.freeze({
  en: Object.freeze({
    "menu.enableKanji": "Enable Kanji Romaji on this site",
    "menu.disableKanji": "Disable Kanji Romaji on this site",
    "menu.enableKatakana": "Enable Online Katakana English on this site",
    "menu.disableKatakana": "Disable Online Katakana English on this site",
    "menu.language": "语言 / Language: 切换到简体中文",
    "error.localePersistence": ({ error }) => `Could not save the language setting: ${error}`,
    "error.kanjiEnablePersistence": ({ error }) => `Could not save the Kanji Romaji setting: ${error}. The feature remains disabled.`,
    "error.kanjiDisablePersistence": ({ error }) => `Could not save the Kanji Romaji setting: ${error}. This page is disabled, but the feature may start again after reload.`,
    "error.katakanaEnablePersistence": ({ error }) => `Could not save the Online Katakana English setting: ${error}. The feature remains disabled.`,
    "error.katakanaDisablePersistence": ({ error }) => `Could not save the Online Katakana English setting: ${error}. This page is disabled, but the feature may start again after reload.`,
    "error.kanjiReadPersistence": ({ error }) => `Could not read the Kanji Romaji setting. The feature remains disabled: ${error}`,
    "error.katakanaReadPersistence": ({ error }) => `Could not read the Online Katakana English setting. The feature remains disabled: ${error}`,
    "error.kanjiStartup": ({ error }) => `Could not safely start Kanji Romaji: ${error}`,
    "error.katakanaStartup": ({ error }) => `Could not safely start Online Katakana English: ${error}`,
  }),
  zh: Object.freeze({
    "menu.enableKanji": "开启本网站汉字罗马音",
    "menu.disableKanji": "关闭本网站汉字罗马音",
    "menu.enableKatakana": "开启本网站联网片假名英文",
    "menu.disableKatakana": "关闭本网站联网片假名英文",
    "menu.language": "语言 / Language: Switch to English",
    "error.localePersistence": ({ error }) => `无法保存语言设置：${error}`,
    "error.kanjiEnablePersistence": ({ error }) => `无法保存本网站汉字罗马音设置：${error}。功能保持关闭。`,
    "error.kanjiDisablePersistence": ({ error }) => `无法保存本网站汉字罗马音设置：${error}。本页已关闭，但刷新后可能再次启用。`,
    "error.katakanaEnablePersistence": ({ error }) => `无法保存本网站联网片假名英文设置：${error}。功能保持关闭。`,
    "error.katakanaDisablePersistence": ({ error }) => `无法保存本网站联网片假名英文设置：${error}。本页已关闭，但刷新后可能再次启用。`,
    "error.kanjiReadPersistence": ({ error }) => `无法读取本网站汉字罗马音设置，功能保持关闭：${error}`,
    "error.katakanaReadPersistence": ({ error }) => `无法读取本网站联网片假名英文设置，功能保持关闭：${error}`,
    "error.kanjiStartup": ({ error }) => `无法安全启动汉字罗马音：${error}`,
    "error.katakanaStartup": ({ error }) => `无法安全启动联网片假名英文：${error}`,
  }),
});

export function createLocalizer(initialLocale = "en", messages = MESSAGES) {
  let locale = isSupportedLocale(initialLocale) ? initialLocale : "en";
  return {
    getLocale: () => locale,
    setLocale(nextLocale) {
      locale = isSupportedLocale(nextLocale) ? nextLocale : "en";
    },
    t(key, values = {}) {
      const message = messages[locale]?.[key] ?? messages.en?.[key];
      if (message == null) {
        return key;
      }
      return typeof message === "function" ? message(values) : message;
    },
  };
}

export async function initializeLocale({ getValue, setValue, primaryLanguage }) {
  let storedLocale;
  try {
    storedLocale = await getStoredLocale(getValue);
  } catch (persistenceError) {
    return { locale: "en", persistenceError };
  }
  if (isSupportedLocale(storedLocale)) {
    return { locale: storedLocale, persistenceError: null };
  }

  const locale = storedLocale == null
    && typeof primaryLanguage === "string"
    && primaryLanguage.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";
  try {
    await setStoredLocale(setValue, locale);
    return { locale, persistenceError: null };
  } catch (persistenceError) {
    return { locale, persistenceError };
  }
}
