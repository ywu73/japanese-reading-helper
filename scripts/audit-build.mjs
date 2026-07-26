import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { asLineComments } from "./legal-comments.mjs";

const projectRoot = new URL("../", import.meta.url);
const source = await readFile(new URL("dist/yomi-ruby.user.js", projectRoot), "utf8");
const manifest = JSON.parse(await readFile(new URL("vendor/manifest.json", projectRoot), "utf8"));
const packageJson = JSON.parse(await readFile(new URL("package.json", projectRoot), "utf8"));
const legalFiles = [
  "LICENSE",
  "licenses/Apache-2.0.txt",
  "licenses/Kuromoji-COPYRIGHT.txt",
  "licenses/Kuromoji-NOTICE.md",
  "licenses/doublearray-MIT.txt",
  "licenses/zlibjs-MIT.txt",
  "third_party/katakana-terminator/LICENSE",
];
const metadataEnd = source.indexOf("// ==/UserScript==");
assert.notEqual(metadataEnd, -1, "Userscript metadata block is incomplete.");
const metadata = source.slice(0, metadataEnd);
const runtime = source.slice(metadataEnd);

assert.equal(packageJson.version, "0.3.0");
assert.equal(packageJson.private, true);
assert.equal(packageJson.license, "MIT");
assert.match(metadata, /^\/\/ @name\s+YomiRuby$/mu);
assert.match(metadata, /^\/\/ @name:zh-CN\s+日语网页注音助手$/mu);
assert.match(metadata, /^\/\/ @namespace\s+yomi-ruby\.local$/mu);
assert.match(metadata, /^\/\/ @version\s+0\.3\.0$/mu);
assert.match(metadata, /^\/\/ @description\s+Add local Kanji Romaji and optional online Katakana English ruby to Japanese web text\.$/mu);
assert.match(metadata, /^\/\/ @description:zh-CN\s+为日语网页添加本地汉字罗马音和可选的联网片假名英文注音。$/mu);
assert.match(metadata, /^\/\/ @homepageURL\s+https:\/\/github\.com\/ywu73\/yomi-ruby$/mu);
assert.match(metadata, /^\/\/ @supportURL\s+https:\/\/github\.com\/ywu73\/yomi-ruby\/issues$/mu);
assert.match(metadata, /^\/\/ @downloadURL\s+https:\/\/raw\.githubusercontent\.com\/ywu73\/yomi-ruby\/main\/dist\/yomi-ruby\.user\.js$/mu);
assert.match(metadata, /^\/\/ @updateURL\s+https:\/\/raw\.githubusercontent\.com\/ywu73\/yomi-ruby\/main\/dist\/yomi-ruby\.user\.js$/mu);
assert.match(metadata, /^\/\/ @license\s+MIT$/mu);
assert.match(metadata, /^\/\/ @match\s+http:\/\/\*\/\*$/mu);
assert.match(metadata, /^\/\/ @match\s+https:\/\/\*\/\*$/mu);
assert.match(metadata, /^\/\/ @noframes$/mu);
assert.doesNotMatch(metadata, /Japanese Romaji Ruby|日语汉字罗马音注音/u);

const connectLines = metadata.match(/^\/\/ @connect\s+.+$/gmu) ?? [];
assert.deepEqual(connectLines, ["// @connect      translate.googleapis.com"]);
const grantLines = metadata.match(/^\/\/ @grant\s+.+$/gmu) ?? [];
assert.deepEqual(grantLines, [
  "// @grant        GM_xmlhttpRequest",
  "// @grant        GM_getResourceURL",
  "// @grant        GM_registerMenuCommand",
  "// @grant        GM_unregisterMenuCommand",
  "// @grant        GM_getValue",
  "// @grant        GM_setValue",
]);
assert.doesNotMatch(source, /@require/u);
assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/u);
assert.doesNotMatch(source, /navigator\.sendBeacon/u);
assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/u);
assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(\s*["']return this/u);
assert.doesNotMatch(source, /build\/kuromoji\.js/u);
assert.doesNotMatch(source, /globalThis\.confirm|confirmKatakana|KATAKANA_CONSENT/u);

for (const menuCopy of [
  "Enable Kanji Romaji on this site",
  "Disable Kanji Romaji on this site",
  "Enable Online Katakana English on this site",
  "Disable Online Katakana English on this site",
  "语言 / Language: 切换到简体中文",
  "开启本网站汉字罗马音",
  "关闭本网站汉字罗马音",
  "开启本网站联网片假名英文",
  "关闭本网站联网片假名英文",
  "语言 / Language: Switch to English",
]) {
  assert.ok(source.includes(menuCopy), `Missing exact menu copy: ${menuCopy}`);
}
for (const forbiddenStatus of [
  "正在读取并校验",
  "汉字罗马音已开启",
  "片假名英文已开启",
]) {
  assert.ok(!source.includes(forbiddenStatus), `Normal-operation status copy remains: ${forbiddenStatus}`);
}
for (const storageKey of [
  "yomi-ruby:auto-origin:",
  "yomi-ruby:katakana-origin:",
  "yomi-ruby:locale",
]) {
  assert.ok(source.includes(storageKey), `Missing approved storage key: ${storageKey}`);
}
const yomiRubyStorageLiterals = [...new Set(
  [...source.matchAll(/"(yomi-ruby:[^"]+)"/gu)].map((match) => match[1]),
)].sort();
assert.deepEqual(yomiRubyStorageLiterals, [
  "yomi-ruby:auto-origin:",
  "yomi-ruby:katakana-origin:",
  "yomi-ruby:locale",
]);
assert.equal([...source.matchAll(/\bgmGetValue\(/gu)].length, 2, "Expected only feature and locale GM reads.");
assert.equal([...source.matchAll(/\bgmSetValue\(/gu)].length, 2, "Expected only feature and locale GM writes.");
assert.equal([...source.matchAll(/\bGM_(?:get|set)Value\b/gu)].length, 6, "Unexpected direct GM storage access.");
assert.match(source, /gmGetValue\(originSettingKey\(feature, origin\), false\) === true/u);
assert.match(source, /gmSetValue\(originSettingKey\(feature, origin\), Boolean\(enabled\)\)/u);
assert.match(source, /gmGetValue\(LOCALE_SETTING_KEY, null\)/u);
assert.match(source, /gmSetValue\(LOCALE_SETTING_KEY, locale\)/u);
assert.doesNotMatch(source, /japanese-romaji-ruby\.local|jrr:auto-origin:|data-jrr-|\bjrr-/iu);
assert.match(source, /navigator\.languages/iu);
assert.match(source, /data-yomi-ruby-generated/u);
assert.match(source, /data-yomi-ruby-feature/u);

assert.equal(
  [...runtime.matchAll(/https:\/\/translate\.googleapis\.com\/translate_a\/single/g)].length,
  1,
  "Expected one fixed Google Translate endpoint in the runtime.",
);
const resourceLines = metadata.match(/^\/\/ @resource\s+.+$/gmu) ?? [];
assert.equal(resourceLines.length, manifest.dictionary.length, "Expected one SRI @resource per dictionary asset.");
for (const asset of manifest.dictionary) {
  assert.ok(
    resourceLines.includes(`// @resource     ${asset.resourceName} ${asset.url}#sha256=${asset.sha256}`),
    `Missing exact SRI metadata for ${asset.name}`,
  );
  assert.doesNotMatch(runtime, new RegExp(escapeRegex(asset.url), "u"));
}

assert.equal(
  [...source.matchAll(/gmRequest\(\{/g)].length,
  2,
  "Expected exactly one local-resource reader and one Katakana translation request call site.",
);
assert.equal(
  [...source.matchAll(/gmRequest:\s*GM_xmlhttpRequest/g)].length,
  2,
  "Expected separate GM_xmlhttpRequest injection into the verified loader and translator.",
);
assert.doesNotMatch(source, /gmRequest\(\{[^}]*\b(?:data|body|headers)\s*:/su);
assert.match(source, /handle = gmRequest\(\{\s*method: "GET",\s*url,\s*timeout,\s*anonymous: true/su);
assert.match(source, /requestHandle = gmRequest\(\{\s*method: "GET",\s*url,\s*responseType: "arraybuffer",\s*timeout: [^,]+,\s*anonymous: true/su);

for (const legalFile of legalFiles) {
  const legalText = await readFile(new URL(legalFile, projectRoot), "utf8");
  assert.ok(
    source.includes(asLineComments(legalText)),
    `Generated userscript does not embed canonical legal file: ${legalFile}`,
  );
}
assert.match(source, /Copyright \(c\) 2026 ywu73/u);
assert.match(source, /mecab-ipadic-2\.7\.0-20070801/u);
assert.match(source, /Copyright 2014 Takuya Asano/u);
assert.match(source, /Copyright 2010-2014 Atilika Inc\. and contributors/u);
assert.match(source, /Copyright \(c\) 2012 imaya/u);
assert.match(source, /Copyright \(c\) 2017-2022 Katakana Terminator Contributors/u);

console.log(
  "build audit passed: YomiRuby 0.3.0 metadata, bilingual controls, approved storage and network boundaries, 12 SRI resources, two audited GM request paths, and embedded canonical licenses/notices",
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
