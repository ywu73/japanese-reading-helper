const SETTING_PREFIXES = Object.freeze({
  kanji: "yomi-ruby:auto-origin:",
  katakana: "yomi-ruby:katakana-origin:",
});

export const LOCALE_SETTING_KEY = "yomi-ruby:locale";
export const SUPPORTED_LOCALES = Object.freeze(["en", "zh"]);
export const KANJI_ROMAJI_MODE_SETTING_KEY = "yomi-ruby:kanji-romaji-mode";
export const SUPPORTED_KANJI_ROMAJI_MODES = Object.freeze(["bing", "google", "local"]);
export const TRANSLATION_PROVIDER_SETTING_KEY = "yomi-ruby:translation-provider";
export const SUPPORTED_TRANSLATION_PROVIDERS = Object.freeze(["bing", "google"]);

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

export function isSupportedTranslationProvider(value) {
  return SUPPORTED_TRANSLATION_PROVIDERS.includes(value);
}

export function isSupportedKanjiRomajiMode(value) {
  return SUPPORTED_KANJI_ROMAJI_MODES.includes(value);
}

export function originSettingKey(feature, origin) {
  const prefix = SETTING_PREFIXES[feature];
  if (!prefix) {
    throw new TypeError(`Unknown Japanese Reading Helper feature: ${feature}`);
  }
  return `${prefix}${origin}`;
}

export async function getFeatureEnabledForOrigin(gmGetValue, feature, origin = location.origin) {
  return await gmGetValue(originSettingKey(feature, origin), false) === true;
}

export async function setFeatureEnabledForOrigin(
  gmSetValue,
  feature,
  enabled,
  origin = location.origin,
) {
  await gmSetValue(originSettingKey(feature, origin), Boolean(enabled));
}

export async function getStoredLocale(gmGetValue) {
  return gmGetValue(LOCALE_SETTING_KEY, null);
}

export async function setStoredLocale(gmSetValue, locale) {
  if (!isSupportedLocale(locale)) {
    throw new TypeError(`Unsupported Japanese Reading Helper locale: ${locale}`);
  }
  await gmSetValue(LOCALE_SETTING_KEY, locale);
}

export async function getStoredTranslationProvider(gmGetValue) {
  return gmGetValue(TRANSLATION_PROVIDER_SETTING_KEY, null);
}

export async function setStoredTranslationProvider(gmSetValue, provider) {
  if (!isSupportedTranslationProvider(provider)) {
    throw new TypeError(`Unsupported Japanese Reading Helper translation provider: ${provider}`);
  }
  await gmSetValue(TRANSLATION_PROVIDER_SETTING_KEY, provider);
}

export async function getStoredKanjiRomajiMode(gmGetValue) {
  return gmGetValue(KANJI_ROMAJI_MODE_SETTING_KEY, null);
}

export async function setStoredKanjiRomajiMode(gmSetValue, mode) {
  if (!isSupportedKanjiRomajiMode(mode)) {
    throw new TypeError(`Unsupported Japanese Reading Helper kanji romaji mode: ${mode}`);
  }
  await gmSetValue(KANJI_ROMAJI_MODE_SETTING_KEY, mode);
}

export async function initializeKanjiRomajiMode({
  getValue,
  setValue,
  primaryLanguage,
}) {
  let storedMode;
  let storedLocale;
  let storedTranslationProvider;
  try {
    [storedMode, storedLocale, storedTranslationProvider] = await Promise.all([
      getStoredKanjiRomajiMode(getValue),
      getStoredLocale(getValue),
      getStoredTranslationProvider(getValue),
    ]);
  } catch (readError) {
    return {
      mode: "local",
      readError,
      persistenceError: null,
    };
  }

  if (isSupportedKanjiRomajiMode(storedMode)) {
    return {
      mode: storedMode,
      readError: null,
      persistenceError: null,
    };
  }

  const hasLegacySettings = storedMode != null
    || storedLocale != null
    || storedTranslationProvider != null;
  const mode = hasLegacySettings
    ? "local"
    : typeof primaryLanguage === "string" && primaryLanguage.toLowerCase().startsWith("zh")
      ? "bing"
      : "google";
  try {
    await setStoredKanjiRomajiMode(setValue, mode);
    return {
      mode,
      readError: null,
      persistenceError: null,
    };
  } catch (persistenceError) {
    return {
      mode,
      readError: null,
      persistenceError,
    };
  }
}

export async function initializeTranslationProvider({ getValue, setValue, locale }) {
  const defaultProvider = locale === "zh" ? "bing" : "google";
  let storedProvider;
  try {
    storedProvider = await getStoredTranslationProvider(getValue);
  } catch (readError) {
    return {
      provider: defaultProvider,
      readError,
      persistenceError: null,
    };
  }

  if (isSupportedTranslationProvider(storedProvider)) {
    return {
      provider: storedProvider,
      readError: null,
      persistenceError: null,
    };
  }

  try {
    await setStoredTranslationProvider(setValue, defaultProvider);
    return {
      provider: defaultProvider,
      readError: null,
      persistenceError: null,
    };
  } catch (persistenceError) {
    return {
      provider: defaultProvider,
      readError: null,
      persistenceError,
    };
  }
}
