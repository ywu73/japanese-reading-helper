const SETTING_PREFIXES = Object.freeze({
  kanji: "yomi-ruby:auto-origin:",
  katakana: "yomi-ruby:katakana-origin:",
});

export const LOCALE_SETTING_KEY = "yomi-ruby:locale";
export const SUPPORTED_LOCALES = Object.freeze(["en", "zh"]);
export const TRANSLATION_PROVIDER_SETTING_KEY = "yomi-ruby:translation-provider";
export const SUPPORTED_TRANSLATION_PROVIDERS = Object.freeze(["bing", "google"]);

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

export function isSupportedTranslationProvider(value) {
  return SUPPORTED_TRANSLATION_PROVIDERS.includes(value);
}

export function originSettingKey(feature, origin) {
  const prefix = SETTING_PREFIXES[feature];
  if (!prefix) {
    throw new TypeError(`Unknown YomiRuby feature: ${feature}`);
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
    throw new TypeError(`Unsupported YomiRuby locale: ${locale}`);
  }
  await gmSetValue(LOCALE_SETTING_KEY, locale);
}

export async function getStoredTranslationProvider(gmGetValue) {
  return gmGetValue(TRANSLATION_PROVIDER_SETTING_KEY, null);
}

export async function setStoredTranslationProvider(gmSetValue, provider) {
  if (!isSupportedTranslationProvider(provider)) {
    throw new TypeError(`Unsupported YomiRuby translation provider: ${provider}`);
  }
  await gmSetValue(TRANSLATION_PROVIDER_SETTING_KEY, provider);
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
