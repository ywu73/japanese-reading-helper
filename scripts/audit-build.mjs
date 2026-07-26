import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const outputUrl = new URL("../dist/yomi-ruby.user.js", import.meta.url);
const manifestUrl = new URL("../vendor/manifest.json", import.meta.url);
const source = await readFile(outputUrl, "utf8");
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const metadataEnd = source.indexOf("// ==/UserScript==");
assert.notEqual(metadataEnd, -1, "Userscript metadata block is incomplete.");
const metadata = source.slice(0, metadataEnd);
const runtime = source.slice(metadataEnd);

assert.match(source, /@match\s+http:\/\/\*\/\*/u);
assert.match(source, /@match\s+https:\/\/\*\/\*/u);
assert.match(source, /@noframes/u);
assert.match(metadata, /^\/\/ @name\s+YomiRuby$/mu);
assert.match(metadata, /^\/\/ @name:zh-CN\s+日语网页注音助手$/mu);
assert.match(metadata, /^\/\/ @namespace\s+yomi-ruby\.local$/mu);
assert.match(metadata, /^\/\/ @version\s+0\.1\.4$/mu);
assert.doesNotMatch(metadata, /Japanese Romaji Ruby|日语汉字罗马音注音/u);
assert.doesNotMatch(metadata, /@connect\b/u);
assert.match(metadata, /@grant\s+GM_getResourceURL/u);
assert.doesNotMatch(source, /@require/u);
assert.doesNotMatch(source, /fetch\s*\(/u);
assert.doesNotMatch(source, /navigator\.sendBeacon/u);
assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/u);
assert.doesNotMatch(source, /\beval\s*\(/u);
assert.doesNotMatch(source, /\bnew\s+Function\b/u);
assert.doesNotMatch(source, /\bFunction\s*\(\s*["']return this/u);
assert.doesNotMatch(source, /build\/kuromoji\.js/u);
assert.doesNotMatch(source, /切换当前页罗马音标注/u);
assert.match(source, /\? "关闭" : "开启"\}本网站自动标注/u);
assert.match(source, /yomi-ruby:auto-origin:/u);
assert.match(source, /data-yomi-ruby-generated/u);
assert.doesNotMatch(source, /japanese-romaji-ruby\.local|jrr:auto-origin:|data-jrr-|\bjrr-/iu);

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
  1,
  "Expected one internal local-resource request call site.",
);
assert.equal(
  [...source.matchAll(/gmRequest:\s*GM_xmlhttpRequest/g)].length,
  1,
  "Expected GM_xmlhttpRequest to be injected only into the verified loader.",
);
assert.doesNotMatch(source, /gmRequest\(\{[^}]*\b(?:data|body|headers)\s*:/su);

console.log(
  "build audit passed: YomiRuby 0.1.4 metadata and internal IDs, single origin menu, 12 SRI resources, and no unsafe runtime paths",
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
