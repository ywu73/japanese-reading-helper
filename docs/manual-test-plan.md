# Desktop Chrome + Tampermonkey manual test plan — Japanese Reading Helper 0.6.2

Do not install this candidate, mutate the user's Chrome/Tampermonkey state,
operate a real site, or disable a separately installed Katakana Terminator
until the user explicitly authorizes the relevant action. Record the exact
candidate path, size, SHA-256, Chrome version, Tampermonkey version, proxy state,
origin, and timestamps.

## 1. Artifact, metadata, install, and update

1. Confirm the installed file is byte-identical to `dist/yomi-ruby.user.js`.
2. Inspect the combined public `@name`, localized name metadata, namespace,
   `@version 0.6.2`, MIT
   metadata, homepage/support/download/update URLs, two ordinary web `@match`
   values, `@noframes`, twelve SRI `@resource` values, exact grants, and exactly
   three `@connect` values: `translate.googleapis.com`, `www.bing.com`, and
   `cn.bing.com`.
3. Confirm there is one active Japanese Reading Helper entry and no duplicate
   YomiRuby or obsolete Japanese Romaji Ruby entry running at the same time.
4. Capture a fresh GitHub Raw install and automatic update from a controlled
   older test version. Distinguish userscript, resource, and page-runtime
   acquisition. Start from YomiRuby 0.6.1 with saved locale, both global provider/
   mode selections, and different feature choices on two exact origins. Verify
   that all values survive, disabled origins remain disabled, and no second
   script entry is created. Exercise both the old repository update URL and the
   renamed URL. Keeping the namespace alone is not proof of successful migration.
5. Confirm a Release artifact and checksum only after publication is separately
   authorized; both must match `main/dist/yomi-ruby.user.js` byte for byte.

## 2. Locale, mode/provider initialization, and stable menus

Exercise fresh storage with English, `zh-CN`, another `zh*`, and a non-Chinese
primary language:

1. Confirm `zh* -> zh` and every other primary language maps to English once.
2. On a completely fresh install, confirm missing kanji mode maps `zh*` to Bing
   and every other primary language to Google. With any legacy locale/provider
   setting present but no kanji-mode key, confirm migration to Local.
3. Confirm a missing katakana provider maps resolved `zh` to Bing and every
   other locale to Google, then persists once.
4. Confirm valid stored locale/mode/provider values win. Confirm invalid kanji
   mode repairs to Local and invalid provider repairs to the locale default; a
   read failure uses the deterministic default
   for that page, reports an error, and does not enable a feature.
5. Confirm stable five-menu order: Kanji, Kanji Mode, Katakana, Katakana
   Translator, Language. Confirm both selection menus show the current persisted
   value and next target. Confirm Chinese mode cycle `bing -> local -> google`
   and English cycle `google -> local -> bing`.
6. Switch language both ways. Confirm menus and future error copy change and the
   next kanji-mode action is immediately reordered, while current mode, provider,
   feature booleans, DOM, observers, Kuromoji, and network remain unchanged.
7. With kanji disabled, switch mode. Confirm only the global mode write changes:
   no analyzer creation, scan, observer, dictionary read, or network request.
8. With katakana disabled, switch provider. Confirm only the global provider
   write changes: no scan, observer, style, ruby, or network request.
9. Delay mode/provider writes and confirm menus do not optimistically display
   unpersisted values. Simulate write failure and confirm the old persisted selection,
   menu, and runtime remain, the unpersisted selection receives no word or
   phrase, and one localized error appears.
10. Exercise rapid mode/provider operations and interleave feature/language
   writes. Confirm each setting family has an independent persistence queue,
   the final persisted request wins, and stale successful writes never restart
   an obsolete provider.
11. Open two tabs on enabled origins. Change kanji mode and katakana provider in
   one tab. Confirm only `remote === true` value-change events replace the
   matching path in the other tab, no listener writes back, page caches clear,
   late results are discarded, and listener disposal removes both registrations.

## 3. Default-off and exact-origin isolation

1. On an unconfigured origin, confirm both feature menus say Enable and neither
   feature starts.
2. Before a feature click, confirm no page scan, Japanese Reading Helper style/status, body
   MutationObserver, dictionary read, Google request, or
   Bing initialization exists.
3. Preload each exact-origin boolean independently and confirm only that module
   starts after reload. Katakana-only must not load Kuromoji or a kanji client.
   Kanji-only in Local must not initialize either provider; Kanji-only in an
   online mode must not load Kuromoji or initialize the katakana adapter.
4. Confirm protocol, host, and port differences remain separate origins.
5. Confirm `jrr:auto-origin:` is ignored and no feature consent is inferred
   from locale, provider, or another feature.

## 4. Silent control lifecycle and replacement

1. Click each feature enable once. Katakana starts only after its exact-origin
   boolean write succeeds and without `confirm()` or a second consent state.
2. Confirm normal enable, disable, loading, startup success, mode switch,
   provider switch, and language switch create no popup, success banner, or
   status element.
3. Simulate feature enable-write failure: fail closed, restore Enable, do not
   start a session, and show one localized error.
4. Simulate disable-write failure: stop the current page immediately and report
   that reload may start the still-persisted feature.
5. While kanji is active, switch Local/Google/Bing modes. Confirm persistence
   succeeds before old startup/request abort, page-cache clearing, ruby rollback,
   analyzer replacement, and eligible-content rescan. Hold an old result and
   prove it cannot annotate after replacement.
6. While katakana is active, switch provider. Confirm persistence succeeds
   before old-request abort, queue/cache/failure clearing, ruby rollback,
   translator replacement, and eligible-content rescan.
7. Hold the old provider result after abort. Confirm the new provider can start
   immediately and the late old result cannot annotate or clear current state.
8. Force replacement startup failure after persistence. Confirm
   fail-closed runtime, retained persisted selection for refresh retry, no silent
   resurrection of the old path, and continuity of the independent feature.

## 5. Extension-background network capture

Capture extension-background traffic, not only the page target.

### GitHub Raw and unpkg

1. Record install/update requests to the sole Raw URL.
2. Record all twelve fixed unpkg dictionary resources and compare URL, byte
   length, and SHA-256 with `vendor/manifest.json`.
3. On ordinary reload, confirm no runtime unpkg request and that local resource
   URLs pass exact length/digest verification before use.

### Google

1. With Google selected but both matching exact-origin features disabled,
   confirm no Google request.
2. After katakana enable, record exact GET host/path/query, no body/custom
   headers, and only matched deduplicated phrases joined by newlines in `q`.
3. After Google kanji enable, confirm local `Intl.Segmenter` selects only
   complete, deduplicated, `isWordLike` words containing Han. Confirm each fast
   request uses fixed `sl=ja`, `tl=ja`, `dt=t`, and `dt=rm`, joins only those
   words with `🧩`, contains at most 50 words, keeps the encoded URL at or below
   1800 characters, waits at least 250 ms before the next request, and uses an
   8-second timeout. Exercise `日本語`, `食べる`, `申し込む`, `東京`, `今日`, and
   a rejected unknown word without using page-derived private content.
4. Require `payload[2] === "ja"`, exactly one complete joined-source echo,
   exactly one `item[2]` romaji field, and an exact output-segment count. Confirm
   internal ASCII spaces such as `Kanagawa ken` are accepted, while one unsafe
   aligned value such as `Ni~Tsu` skips only its own word without shifting
   another reading.
5. Exercise source mismatch, missing/duplicate echo or romaji, separator/count
   drift, malformed JSON, redirect, HTTP 429, timeout, and network error. Confirm
   the whole affected fast batch falls back only to serialized exact Google
   single-word requests with `tl=en` and `item[3]`. Confirm cancellation aborts
   the active request and starts no fallback, and ordinary translation never
   substitutes for romaji.
6. Prove surrounding sentence, unrelated text, title, URL, origin, history,
   analytics, telemetry, cross-provider fallback, and Local fallback traffic
   are absent. Record that phrases and words in the URL may enter logs.

### Bing

1. With Bing selected but both matching exact-origin features disabled, confirm
   no Bing request.
2. Verify no-proxy mainland-China reachability separately for `www.bing.com` and
   `cn.bing.com`; record actual redirect behavior without widening permissions.
3. After enable, capture anonymous GET
   `https://www.bing.com/translator`, its final exact allowed URL, and the
   anonymous POST to that same origin's `/ttranslatev3`.
4. Prove both requests are Cookie-free and account-free in extension context.
   Confirm Japanese Reading Helper does not set a custom User-Agent, record the browser/extension
   request's actual User-Agent behavior, and confirm the HTML is parsed but no
   Bing page script is executed.
5. Confirm GET sends no phrase. For katakana, confirm each POST sends a stable
   FIFO batch of at most 50 exact phrases joined only by newlines, with encoded
   `text` length at most 1800 characters, a minimum 250 ms inter-batch interval,
   and an 8-second timeout. Confirm each kanji POST sends a stable FIFO batch of
   at most 50 locally segmented complete words joined only by newlines, with
   encoded `text` length at most 1800 characters. Both paths include only fixed protocol fields
   and page-derived temporary config;
   no surrounding context or page metadata is present.
6. Confirm IID comes from `#rich_tta`, token expiry follows the page value with
   refresh skew, and SFX increases only in page memory. Exercise both the legacy
   direct `window._G.IG` assignment and the current bounded `_G` object
   initializer; duplicate candidates across either shape must fail closed.
7. Exercise token expiry and 401: exactly one config refresh and one affected
   katakana or kanji batch retry. Exercise second 401, 429, `ShowCaptcha`, malformed HTML/JSON, wrong
   language/target, timeout, network error, and abort: fail closed, no retry
   storm, CAPTCHA bypass, host widening, Cookie use, or Google fallback.
8. For katakana, require exactly one non-empty, changed, Latin-containing output
   line per input phrase. Reject missing, extra, blank, unchanged, or non-Latin
   lines as a whole batch without positional shifting or per-phrase resend.
   Accept the required translation object with or without one exact bounded
   Latin `inputTransliteration` metadata object. Confirm the metadata is ignored
   rather than displayed or routed into Local Kanji Romaji. Reject a wrong
   script, non-Latin value, unknown field, or third response item.
9. For kanji, require `fromLang=ja`, `to=ja`, exact newline source echo, and
   exactly one independent `{ inputTransliteration, script: "Latn" }` whose line
   count and order match the source batch. Do not hard-reject solely because
   `detectedLanguage` is `zh-Hans`. Reject rewritten source, line-count drift,
   missing/duplicate metadata, wrong script/target, unsafe romaji, HTTP 429,
   CAPTCHA, second 401, timeout, cancellation, and late results without Local or
   Google fallback.
10. Confirm no Bing spell-check, lookup, examples, telemetry, logging, history,
   ads, account, or other endpoint traffic.

## 6. Matching, validation, scheduling, and failure silence

Check full-width and half-width katakana, long marks, combination marks, brand
names, non-English loanwords, onomatopoeia, and excluded single-character cases.

1. Verify only an explicit requested phrase maps to a non-empty, changed,
   Latin-containing English result.
2. Verify empty, unchanged, non-Latin, missing, duplicate, malformed, wrong
   target, contradictory language, HTTP failure, timeout, and unknown structure
   preserve source text without repeated user-facing errors.
3. In a foreground tab, confirm safe text both above and far below the viewport
   is discovered in stable DOM order without scrolling. Add dynamic safe text
   and confirm it appends to the runtime FIFO after the approximately 500 ms
   mutation window. Confirm no permanent interval is created.
4. Hide the tab, add and remove candidate nodes, and confirm no new request
   starts while hidden. Return to the tab and confirm only currently connected
   safe DOM is rescanned.
5. Confirm one network request maximum in flight per adapter. Confirm Google
   katakana, Google kanji fast-path, Bing katakana, and Bing kanji all enforce
   their documented 50-candidate, 1800-character, 250 ms, and 8-second batch
   limits; confirm Google kanji exact-word fallback remains serialized.
6. Enable both features with the same provider and confirm their two independent
   clients may be in flight concurrently without sharing queue, configuration,
   counter, cancellation, or generation state.
7. Disable during queued work, delay, initialization, and active POST. Confirm
   work clears, supported GM handles abort, and late results are discarded.

## 7. Dual-feature DOM matrix and rollback

Exercise Kanji off/on x Katakana off/on in both activation orders, across all
three kanji modes and both katakana providers. Confirm selected-mode Kanji,
independently selected-provider Katakana, and a single non-nested coordinated
plan when both features are enabled.

Check ordinary text, links, nested inline markup, author ruby, Katakana
Terminator ruby, forms, editable regions, code/pre, hidden/inert/aria-hidden
content, script/style/template, SVG/MathML, media, dynamic content, and
Japanese Reading Helper-owned UI. Confirm:

- all ownership names retain the `yomi-ruby-` / `data-yomi-ruby-` prefixes;
- pending katakana overlap renders no placeholder;
- success wins its overlap; failure releases it to reliable whole-token Kanji;
- disabling either feature preserves the other;
- provider switch removes old translations before applying new ones;
- source changes and detach/reinsert invalidate stale ownership;
- repeated enable/disable/language/provider/failure cycles restore exact source.

## 8. Failure, CSP, and real-site gates

Confirm 0.6.2 still installs/preloads all twelve Kuromoji resources and performs
no runtime dynamic dictionary download/cache/delete flow. Treat the proposed
roughly 17 MiB lazy cache as unimplemented rather than as a failed fallback.

Simulate dictionary absence, wrong size/digest, unsupported resource URL,
provider config/translation failures, setting read/write failures, observer
startup failure, and cancellation. Confirm fail-closed behavior without stopping
an unrelated active module.

Repeat the matrix on the controlled strict-CSP fixture, then on x.com only after
explicit authorization. Include dynamic posts, links, editor exclusion,
scrolling, reload, new tabs, cross-origin isolation, rollback, performance, and
extension-background capture.

A coexistence check may prove Japanese Reading Helper preserves existing Katakana Terminator
annotations. Disabling that separate script is a distinct, separately
authorized migration. Do not claim Chrome/Tampermonkey compatibility, anonymous
Bing behavior, privacy capture, China reachability, update behavior,
performance, accuracy, or complete rollback until actual evidence is recorded
in a new browser verification report.
