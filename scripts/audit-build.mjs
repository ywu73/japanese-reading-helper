import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { asLineComments } from "./legal-comments.mjs";

const projectRoot = new URL("../", import.meta.url);
const source = await readFile(new URL("dist/yomi-ruby.user.js", projectRoot), "utf8");
const coordinatorSource = await readFile(new URL("src/coordinator.js", projectRoot), "utf8");
const bingTranslationSource = await readFile(new URL("src/bing-translation.js", projectRoot), "utf8");
const bingKanjiRomajiSource = await readFile(new URL("src/bing-kanji-romaji.js", projectRoot), "utf8");
const googleKanjiRomajiSource = await readFile(new URL("src/google-kanji-romaji.js", projectRoot), "utf8");
const kanjiRuntimeSource = await readFile(new URL("src/kanji-runtime.js", projectRoot), "utf8");
const katakanaRuntimeSource = await readFile(new URL("src/katakana-runtime.js", projectRoot), "utf8");
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

assert.equal(packageJson.version, "0.6.1");
assert.equal(packageJson.private, true);
assert.equal(packageJson.license, "MIT");
assert.match(metadata, /^\/\/ @name\s+日语网页汉字罗马音与片假名英译 ｜ YomiRuby$/mu);
assert.match(metadata, /^\/\/ @name:zh-CN\s+日语网页汉字罗马音与片假名英译 ｜ YomiRuby$/mu);
assert.match(metadata, /^\/\/ @name:en\s+YomiRuby$/mu);
assert.match(metadata, /^\/\/ @namespace\s+yomi-ruby\.local$/mu);
assert.match(metadata, /^\/\/ @version\s+0\.6\.1$/mu);
assert.match(metadata, /^\/\/ @description\s+Add selectable local or online Kanji Romaji and optional online Katakana English ruby to Japanese web text\.$/mu);
assert.match(metadata, /^\/\/ @description:en\s+Add selectable local or online Kanji Romaji and optional online Katakana English ruby to Japanese web text\.$/mu);
assert.match(metadata, /^\/\/ @description:zh-CN\s+为日语网页添加可选的本地或联网汉字罗马音，以及可选的联网片假名英译。$/mu);
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
assert.deepEqual(connectLines, [
  "// @connect      translate.googleapis.com",
  "// @connect      www.bing.com",
  "// @connect      cn.bing.com",
]);
const grantLines = metadata.match(/^\/\/ @grant\s+.+$/gmu) ?? [];
assert.deepEqual(grantLines, [
  "// @grant        GM_xmlhttpRequest",
  "// @grant        GM_getResourceURL",
  "// @grant        GM_registerMenuCommand",
  "// @grant        GM_unregisterMenuCommand",
  "// @grant        GM_getValue",
  "// @grant        GM_setValue",
  "// @grant        GM_addValueChangeListener",
  "// @grant        GM_removeValueChangeListener",
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
  "Kanji Romaji: ",
  "Local Dictionary",
  "Enable Online Katakana English on this site",
  "Disable Online Katakana English on this site",
  "Katakana Translator: ",
  "(switch to ",
  "语言 / Language: 切换到简体中文",
  "开启本网站汉字罗马音",
  "关闭本网站汉字罗马音",
  "汉字罗马音模式：",
  "本地字典",
  "开启本网站联网片假名英文",
  "关闭本网站联网片假名英文",
  "片假名翻译服务：",
  "（切换到 ",
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
assert.equal(
  [...runtime.matchAll(/registerMenuCommand\(\s*localizer\d*\.t\("menu\.kanjiRomajiMode"/gu)].length,
  1,
  "Expected exactly one kanji-romaji-mode menu command.",
);
assert.equal(
  [...runtime.matchAll(/registerMenuCommand\(\s*localizer\d*\.t\("menu\.translationProvider"/gu)].length,
  1,
  "Expected exactly one translation-provider menu command.",
);
assert.match(
  runtime,
  /refreshMenus = \(\) => \{\s*controls\[0\]\.register\(\);\s*registerKanjiMode\(\);\s*controls\[1\]\.register\(\);\s*registerProvider\(\);\s*registerLanguage\(\);\s*\}/su,
  "Expected stable Kanji, Kanji Mode, Katakana, provider, language menu order.",
);
for (const storageKey of [
  "yomi-ruby:auto-origin:",
  "yomi-ruby:katakana-origin:",
  "yomi-ruby:locale",
  "yomi-ruby:kanji-romaji-mode",
  "yomi-ruby:translation-provider",
]) {
  assert.ok(source.includes(storageKey), `Missing approved storage key: ${storageKey}`);
}
const yomiRubyStorageLiterals = [...new Set(
  [...source.matchAll(/"(yomi-ruby:[^"]+)"/gu)].map((match) => match[1]),
)].sort();
assert.deepEqual(yomiRubyStorageLiterals, [
  "yomi-ruby:auto-origin:",
  "yomi-ruby:kanji-romaji-mode",
  "yomi-ruby:katakana-origin:",
  "yomi-ruby:locale",
  "yomi-ruby:translation-provider",
]);
assert.equal([...source.matchAll(/\bgmGetValue\(/gu)].length, 4, "Expected only feature, locale, kanji-mode, and provider GM reads.");
assert.equal([...source.matchAll(/\bgmSetValue\(/gu)].length, 4, "Expected only feature, locale, kanji-mode, and provider GM writes.");
assert.equal([...source.matchAll(/\bGM_(?:get|set)Value\b/gu)].length, 10, "Unexpected direct GM storage access.");
assert.match(source, /gmGetValue\(originSettingKey\(feature, origin\), false\) === true/u);
assert.match(source, /gmSetValue\(originSettingKey\(feature, origin\), Boolean\(enabled\)\)/u);
assert.match(source, /gmGetValue\(LOCALE_SETTING_KEY, null\)/u);
assert.match(source, /gmSetValue\(LOCALE_SETTING_KEY, locale\)/u);
assert.match(source, /gmGetValue\(TRANSLATION_PROVIDER_SETTING_KEY, null\)/u);
assert.match(source, /gmSetValue\(TRANSLATION_PROVIDER_SETTING_KEY, provider\)/u);
assert.match(source, /gmGetValue\(KANJI_ROMAJI_MODE_SETTING_KEY, null\)/u);
assert.match(source, /gmSetValue\(KANJI_ROMAJI_MODE_SETTING_KEY, mode\)/u);
assert.match(source, /Object\.freeze\(\["bing", "google"\]\)/u);
assert.match(source, /Object\.freeze\(\["bing", "google", "local"\]\)/u);
assert.match(runtime, /addValueChangeListener\(\s*KANJI_ROMAJI_MODE_SETTING_KEY/gu);
assert.match(runtime, /addValueChangeListener\(\s*TRANSLATION_PROVIDER_SETTING_KEY/gu);
assert.match(runtime, /remote !== true/gu);
assert.doesNotMatch(source, /japanese-romaji-ruby\.local|jrr:auto-origin:|data-jrr-|\bjrr-/iu);
assert.match(source, /navigator\.languages/iu);
assert.match(source, /data-yomi-ruby-generated/u);
assert.match(source, /data-yomi-ruby-feature/u);

assert.equal(
  [...runtime.matchAll(/https:\/\/translate\.googleapis\.com\/translate_a\/single/g)].length,
  2,
  "Expected one fixed Google endpoint per katakana and kanji adapter.",
);
assert.equal(
  [...runtime.matchAll(/https:\/\/www\.bing\.com\/translator/g)].length,
  2,
  "Expected one fixed Bing initialization URL per katakana and kanji adapter.",
);
assert.equal(
  [...runtime.matchAll(/["']\/ttranslatev3["']/g)].length,
  2,
  "Expected one fixed Bing translation path per katakana and kanji adapter.",
);
assert.equal([...runtime.matchAll(/new Set\(\["www\.bing\.com", "cn\.bing\.com"\]\)/gu)].length, 2);
assert.doesNotMatch(metadata, /@connect\s+(?:\*|\.bing\.com|\*\.bing\.com)/u);
assert.match(runtime, /querySelectorAll\("#rich_tta\[data-iid\]"\)/u);
assert.match(runtime, /params_AbusePreventionHelper/u);
assert.match(runtime, /MAX_GLOBAL_OBJECT_CHARACTERS/u);
assert.match(runtime, /inputTransliteration/u);
assert.match(runtime, /MAX_TRANSLITERATION_CHARACTERS/u);
assert.match(bingTranslationSource, /maxPhrasesPerRequest = 50/u);
assert.match(bingTranslationSource, /maxEncodedTextLength = 1800/u);
assert.match(bingTranslationSource, /minimumIntervalMs = 250/u);
assert.match(bingTranslationSource, /requestTimeoutMs = 8000/u);
assert.match(bingTranslationSource, /text: phrases\.join\("\\n"\)/u);
assert.match(bingTranslationSource, /candidate\.text\.split\(\/\\r\?\\n\/u\)/u);
assert.match(bingTranslationSource, /translatedLines\.length !== phrases\.length/u);
assert.match(bingKanjiRomajiSource, /maxPhrasesPerRequest = 50/u);
assert.match(bingKanjiRomajiSource, /maxEncodedTextLength = 1800/u);
assert.match(bingKanjiRomajiSource, /minimumIntervalMs = 250/u);
assert.match(bingKanjiRomajiSource, /requestTimeoutMs = 8000/u);
assert.match(bingKanjiRomajiSource, /text: words\.join\("\\n"\)/u);
assert.match(bingKanjiRomajiSource, /translation\.text\.split\(\/\\r\?\\n\/u\)/u);
assert.match(bingKanjiRomajiSource, /metadata\.inputTransliteration\.split\(\/\\r\?\\n\/u\)/u);
assert.match(
  bingKanjiRomajiSource,
  /echoedLines\.length !== words\.length \|\| romajiLines\.length !== words\.length/u,
);
assert.match(googleKanjiRomajiSource, /const BATCH_SEPARATOR = "🧩"/u);
assert.match(googleKanjiRomajiSource, /maxPhrasesPerRequest = 50/u);
assert.match(googleKanjiRomajiSource, /maxEncodedUrlLength = 1800/u);
assert.match(googleKanjiRomajiSource, /minimumIntervalMs = 250/u);
assert.match(googleKanjiRomajiSource, /requestTimeoutMs = 8000/u);
assert.match(googleKanjiRomajiSource, /url\.searchParams\.set\("tl", "ja"\)/u);
assert.match(googleKanjiRomajiSource, /words\.join\(BATCH_SEPARATOR\)/u);
assert.match(googleKanjiRomajiSource, /typeof item\[2\] === "string"/u);
assert.match(googleKanjiRomajiSource, /sourceCandidates\.length !== 1/u);
assert.match(googleKanjiRomajiSource, /romajiCandidates\.length !== 1/u);
assert.match(googleKanjiRomajiSource, /segments\.length !== words\.length/u);
assert.match(googleKanjiRomajiSource, /SAFE_BATCH_ROMAJI = \/\^\[A-Za-zĀĪŪĒŌāīūēō'’ -\]\+\$\//u);
assert.match(googleKanjiRomajiSource, /!word\.includes\(BATCH_SEPARATOR\)/u);
assert.match(googleKanjiRomajiSource, /url\.searchParams\.set\("tl", "en"\)/u);
assert.match(googleKanjiRomajiSource, /typeof item\[3\] === "string"/u);
assert.match(googleKanjiRomajiSource, /sourceFragments\.join\(""\) !== word/u);
assert.match(runtime, /response\.finalUrl \?\? response\.responseURL/u);
assert.match(runtime, /anonymous: true/u);
assert.doesNotMatch(runtime, /user-agent|User-Agent/u);
assert.equal([...runtime.matchAll(/redirect: "follow"/gu)].length, 2);
assert.equal([...runtime.matchAll(/redirect: "error"/gu)].length, 3);
assert.match(runtime, /validateTranslationResponseUrl\(response\.finalUrl \?\? response\.responseURL, url\)/u);
assert.match(runtime, /!Number\.isInteger\(response\?\.status\) \|\| response\.status < 200 \|\| response\.status >= 300/u);
assert.match(runtime, /new KanjiRuntime\(/u);
assert.match(runtime, /new KatakanaRuntime\(/u);
assert.match(runtime, /translatorFactories\[this\.provider\]\(\)/u);
assert.match(runtime, /kanjiAnalyzerFactories/u);
assert.match(runtime, /Segmenter = globalThis\.Intl\?\.Segmenter/u);
assert.match(runtime, /new Segmenter\("ja", \{ granularity: "word" \}\)/u);
assert.match(runtime, /isWordLike === true && HAS_KANJI\d*\.test\(segment\)/u);
assert.match(runtime, /url\.searchParams\.append\("dt", "rm"\)/u);
assert.match(runtime, /new URLSearchParams\(\{\s*fromLang: "ja",\s*to: "ja",\s*text: words\.join\("\\n"\)/su);
assert.match(runtime, /echoedLines\[index\]\.trim\(\) !== word/u);
assert.match(runtime, /echoedLines\.length !== words\.length \|\| romajiLines\.length !== words\.length/u);
assert.match(runtime, /metadata\.script !== "Latn"/u);
assert.doesNotMatch(runtime, /baidu|azure|ShowCaptcha[^\n]*(?:retry|bypass)/iu);
assert.doesNotMatch(coordinatorSource, /IntersectionObserver|translationCache|translationQueue|provider|romanize|translatePhrases/u);
assert.match(coordinatorSource, /visibilitychange/u);
assert.match(coordinatorSource, /flushDelayMs = 500/u);
assert.match(coordinatorSource, /pendingRoots/u);
assert.match(kanjiRuntimeSource, /this\.cache = new Map\(\)/u);
assert.match(kanjiRuntimeSource, /this\.queue = \[\]/u);
assert.match(katakanaRuntimeSource, /this\.cache = new Map\(\)/u);
assert.match(katakanaRuntimeSource, /this\.queue = \[\]/u);
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
  5,
  "Expected local resource plus independent Google/Bing katakana and kanji GM request call sites.",
);
assert.equal(
  [...source.matchAll(/gmRequest:\s*GM_xmlhttpRequest/g)].length,
  5,
  "Expected separate GM_xmlhttpRequest injection into the loader and four provider clients.",
);
assert.match(source, /handle = gmRequest\(\{\s*method: "GET",\s*url,\s*timeout,\s*anonymous: true/su);
assert.match(source, /handle = gmRequest\(\{\s*\.\.\.options,/su);
assert.match(source, /method: "POST",\s*url: url\.href,\s*headers: \{\s*"Content-Type": "application\/x-www-form-urlencoded;charset=UTF-8",\s*Referer: activeConfig\.pageUrl\s*\},\s*data: data\.toString\(\),\s*timeout: requestTimeoutMs,\s*anonymous: true/su);
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
  "build audit passed: YomiRuby 0.6.1 metadata, five bilingual controls, aligned bounded Google/Bing katakana and kanji batches, independent kanji/provider settings, strict Google/Bing source-romaji boundaries, 12 preloaded SRI resources, five audited GM request paths, and embedded canonical licenses/notices",
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
