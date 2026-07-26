const PREFIX = "yomi-ruby:auto-origin:";

export function originSettingKey(origin) {
  return `${PREFIX}${origin}`;
}

export async function getAutoRunForOrigin(gmGetValue, origin = location.origin) {
  return Boolean(await gmGetValue(originSettingKey(origin), false));
}

export async function setAutoRunForOrigin(gmSetValue, enabled, origin = location.origin) {
  await gmSetValue(originSettingKey(origin), Boolean(enabled));
}
