# Desktop Chrome + Tampermonkey manual test plan — YomiRuby 0.4.0

Do not install this candidate, mutate the user's Chrome/Tampermonkey state,
operate a real site, or disable a separately installed Katakana Terminator
until the user explicitly authorizes the relevant action. Record the exact
candidate path, size, SHA-256, Chrome version, Tampermonkey version, proxy state,
origin, and timestamps.

## 1. Artifact, metadata, install, and update

1. Confirm the installed file is byte-identical to `dist/yomi-ruby.user.js`.
2. Inspect `@name`, bilingual metadata, namespace, `@version 0.4.0`, MIT
   metadata, homepage/support/download/update URLs, two ordinary web `@match`
   values, `@noframes`, twelve SRI `@resource` values, exact grants, and exactly
   three `@connect` values: `translate.googleapis.com`, `www.bing.com`, and
   `cn.bing.com`.
3. Confirm there is one active YomiRuby entry and no obsolete Japanese Romaji
   Ruby candidate running at the same time.
4. Capture a fresh GitHub Raw install and automatic update from a controlled
   older test version. Distinguish userscript, resource, and page-runtime
   acquisition.
5. Confirm a Release artifact and checksum only after publication is separately
   authorized; both must match `main/dist/yomi-ruby.user.js` byte for byte.

## 2. Locale, provider initialization, and stable menus

Exercise fresh storage with English, `zh-CN`, another `zh*`, and a non-Chinese
primary language:

1. Confirm `zh* -> zh` and every other primary language maps to English once.
2. Confirm a missing provider maps resolved `zh` to Bing and every other locale
   to Google, then persists once.
3. Confirm valid stored locale/provider values win. Confirm invalid provider
   repairs to the locale default; a read failure uses the deterministic default
   for that page, reports an error, and does not enable a feature.
4. Confirm stable four-menu order: Kanji, Katakana, Translation Provider,
   Language, with exact English and Chinese copy and the provider command always
   naming the opposite provider.
5. Switch language both ways. Confirm menus and future error copy change while
   provider, feature booleans, DOM, observers, Kuromoji, and network remain
   unchanged.
6. With katakana disabled, switch provider. Confirm only the global provider
   write changes: no scan, observer, style, ruby, or network request.
7. Simulate provider write failure. Confirm the old provider/menu/session
   remain, the unpersisted provider receives no phrase, and one localized error
   appears.
8. Exercise rapid Bing/Google/Bing operations and interleave feature/language
   writes. Confirm the final persisted request wins and stale successful writes
   never restart an obsolete provider.

## 3. Default-off and exact-origin isolation

1. On an unconfigured origin, confirm both feature menus say Enable and neither
   feature starts.
2. Before a feature click, confirm no page scan, YomiRuby style/status, body
   MutationObserver/IntersectionObserver, dictionary read, Google request, or
   Bing initialization exists.
3. Preload each exact-origin boolean independently and confirm only that module
   starts after reload. Katakana-only must not load Kuromoji; Kanji-only must not
   initialize either provider.
4. Confirm protocol, host, and port differences remain separate origins.
5. Confirm `jrr:auto-origin:` is ignored and no feature consent is inferred
   from locale, provider, or another feature.

## 4. Silent control lifecycle and replacement

1. Click each feature enable once. Katakana starts only after its exact-origin
   boolean write succeeds and without `confirm()` or a second consent state.
2. Confirm normal enable, disable, loading, startup success, provider switch,
   and language switch create no popup, success banner, or status element.
3. Simulate feature enable-write failure: fail closed, restore Enable, do not
   start a session, and show one localized error.
4. Simulate disable-write failure: stop the current page immediately and report
   that reload may start the still-persisted feature.
5. While katakana is active, switch provider. Confirm persistence succeeds
   before old-request abort, queue/cache/failure clearing, ruby rollback,
   translator replacement, and eligible-content rescan.
6. Hold the old provider result after abort. Confirm the new provider can start
   immediately and the late old result cannot annotate or clear current state.
7. Force replacement startup failure after provider persistence. Confirm
   fail-closed runtime, retained persisted provider for refresh retry, no silent
   resurrection of the old provider, and independent Kanji continuity.

## 5. Extension-background network capture

Capture extension-background traffic, not only the page target.

### GitHub Raw and unpkg

1. Record install/update requests to the sole Raw URL.
2. Record all twelve fixed unpkg dictionary resources and compare URL, byte
   length, and SHA-256 with `vendor/manifest.json`.
3. On ordinary reload, confirm no runtime unpkg request and that local resource
   URLs pass exact length/digest verification before use.

### Google

1. With Google selected but katakana disabled, confirm no Google request.
2. After enable, record exact GET host/path/query, no body/custom headers, and
   only matched deduplicated phrases joined by newlines in `q`.
3. Prove surrounding sentence, kanji, hiragana, title, URL, origin, history,
   analytics, telemetry, and fallback traffic are absent. Record that phrases
   in the URL may enter logs.

### Bing

1. With Bing selected but katakana disabled, confirm no Bing request.
2. Verify no-proxy mainland-China reachability separately for `www.bing.com` and
   `cn.bing.com`; record actual redirect behavior without widening permissions.
3. After enable, capture anonymous GET
   `https://www.bing.com/translator`, its final exact allowed URL, and the
   anonymous POST to that same origin's `/ttranslatev3`.
4. Prove both requests are Cookie-free and account-free in extension context.
   Confirm the HTML is parsed but no Bing page script is executed.
5. Confirm GET sends no phrase. Confirm each POST sends exactly one matched
   phrase plus only fixed protocol fields and page-derived temporary config;
   no surrounding context or page metadata is present.
6. Confirm IID comes from `#rich_tta`, token expiry follows the page value with
   refresh skew, and SFX increases only in page memory.
7. Exercise token expiry and 401: exactly one config refresh and one phrase
   retry. Exercise second 401, 429, `ShowCaptcha`, malformed HTML/JSON, wrong
   language/target, timeout, network error, and abort: fail closed, no retry
   storm, CAPTCHA bypass, host widening, Cookie use, or Google fallback.
8. Confirm no Bing spell-check, lookup, examples, telemetry, logging, history,
   ads, account, or other endpoint traffic.

## 6. Matching, validation, scheduling, and failure silence

Check full-width and half-width katakana, long marks, combination marks, brand
names, non-English loanwords, onomatopoeia, and excluded single-character cases.

1. Verify only an explicit requested phrase maps to a non-empty, changed,
   Latin-containing English result.
2. Verify empty, unchanged, non-Latin, missing, duplicate, malformed, wrong
   target, contradictory language, HTTP failure, timeout, and unknown structure
   preserve source text without repeated user-facing errors.
3. Confirm off-screen content is not sent before reaching the viewport margin.
4. Confirm one network request maximum in flight per adapter, configured delay,
   Google batch limits, and Bing one-phrase serialization.
5. Disable during queued work, delay, initialization, and active POST. Confirm
   work clears, supported GM handles abort, and late results are discarded.

## 7. Dual-feature DOM matrix and rollback

Exercise Kanji off/on x Katakana off/on in both activation orders and across
Google/Bing switches. Confirm local-only Kanji, selected-provider Katakana, and
a single non-nested coordinated plan when both features are enabled.

Check ordinary text, links, nested inline markup, author ruby, Katakana
Terminator ruby, forms, editable regions, code/pre, hidden/inert/aria-hidden
content, script/style/template, SVG/MathML, media, dynamic content, and
YomiRuby-owned UI. Confirm:

- all ownership names use the YomiRuby prefix;
- pending katakana overlap renders no placeholder;
- success wins its overlap; failure releases it to reliable whole-token Kanji;
- disabling either feature preserves the other;
- provider switch removes old translations before applying new ones;
- source changes and detach/reinsert invalidate stale ownership;
- repeated enable/disable/language/provider/failure cycles restore exact source.

## 8. Failure, CSP, and real-site gates

Simulate dictionary absence, wrong size/digest, unsupported resource URL,
provider config/translation failures, setting read/write failures, observer
startup failure, and cancellation. Confirm fail-closed behavior without stopping
an unrelated active module.

Repeat the matrix on the controlled strict-CSP fixture, then on x.com only after
explicit authorization. Include dynamic posts, links, editor exclusion,
scrolling, reload, new tabs, cross-origin isolation, rollback, performance, and
extension-background capture.

A coexistence check may prove YomiRuby preserves existing Katakana Terminator
annotations. Disabling that separate script is a distinct, separately
authorized migration. Do not claim Chrome/Tampermonkey compatibility, anonymous
Bing behavior, privacy capture, China reachability, update behavior,
performance, accuracy, or complete rollback until actual evidence is recorded
in a new browser verification report.
