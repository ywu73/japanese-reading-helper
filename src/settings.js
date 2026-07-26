const SETTING_PREFIXES = Object.freeze({
  kanji: "yomi-ruby:auto-origin:",
  katakana: "yomi-ruby:katakana-origin:",
});

export function originSettingKey(feature, origin) {
  const prefix = SETTING_PREFIXES[feature];
  if (!prefix) {
    throw new TypeError(`Unknown YomiRuby feature: ${feature}`);
  }
  return `${prefix}${origin}`;
}

export async function getFeatureEnabledForOrigin(gmGetValue, feature, origin = location.origin) {
  return Boolean(await gmGetValue(originSettingKey(feature, origin), false));
}

export async function setFeatureEnabledForOrigin(
  gmSetValue,
  feature,
  enabled,
  origin = location.origin,
) {
  await gmSetValue(originSettingKey(feature, origin), Boolean(enabled));
}
