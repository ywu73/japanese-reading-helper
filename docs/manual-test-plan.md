# Desktop Chrome + Tampermonkey manual test plan — YomiRuby 0.3.0

Do not install this candidate, mutate the user's Chrome/Tampermonkey state, or
disable a separately installed Katakana Terminator until the user explicitly
authorizes the relevant action. Record the exact candidate path, size, SHA-256,
Chrome version, Tampermonkey version, origin, and timestamps.

## 1. Artifact, metadata, install, and update

1. Confirm the installed file is byte-identical to the locally verified
   `dist/yomi-ruby.user.js`.
2. Inspect `@name`, bilingual metadata, namespace, `@version 0.3.0`, MIT
   metadata, homepage/support/download/update URLs, two ordinary web `@match`
   values, `@noframes`, twelve SRI `@resource` values, exact grants, and sole
   `@connect translate.googleapis.com`.
3. Confirm there is one active YomiRuby entry and no obsolete Japanese Romaji
   Ruby candidate running at the same time.
4. Capture a fresh GitHub Raw install and an automatic update from a controlled
   older test version. Distinguish userscript acquisition from resource
   acquisition and page runtime requests.
5. Confirm the Release artifact and checksum only after publication is
   separately authorized; they must match `main/dist/yomi-ruby.user.js` byte for
   byte.

## 2. First-run locale and stable menus

Exercise fresh storage with English, `zh-CN`, another `zh*` preference, and a
non-Chinese preference:

1. Confirm `zh* → zh` and every other primary language maps to English.
2. Confirm the result is written once to global `yomi-ruby:locale` and future
   initialization does not re-detect the browser preference.
3. Confirm invalid stored locale falls back to English.
4. Simulate first-run locale write failure. Confirm deterministic current-page
   menus and one localized non-modal error.
5. Confirm stable menu order: Kanji, Katakana, Language, with the exact copy in
   both languages.
6. Switch language in both directions. Confirm menus and future error copy
   change immediately while feature settings, DOM, observers, Kuromoji loads,
   and network requests remain unchanged.
7. Exercise rapid switches and write failures; the latest requested/successful
   persistent state must win without a third locale value.

## 3. Default-off and exact-origin isolation

1. On an unconfigured origin, confirm both feature menus say Enable and neither
   feature starts.
2. Before a feature click, confirm there is no page scan, YomiRuby style/status,
   body MutationObserver/IntersectionObserver, dictionary read, or Google
   request.
3. Preload each exact-origin boolean independently and confirm only that module
   starts after reload. Katakana-only must not load Kuromoji; Kanji-only must not
   contact Google.
4. Confirm protocol, host, and port differences remain separate origins.
5. Confirm `jrr:auto-origin:` is ignored and no feature state is inferred from
   another feature or from locale.

## 4. Silent control lifecycle and persistence failure

1. Click each enable command once. Katakana must start without `confirm()` or a
   second consent state after its boolean write succeeds.
2. Confirm normal enable, disable, loading, startup success, and language switch
   create no popup, banner, or YomiRuby status element.
3. Simulate feature enable-write failure. Confirm fail-closed state, restored
   Enable menu, no session start, and one localized non-modal error.
4. Simulate disable-write failure. Confirm the current page stops immediately,
   with an error explaining that reload may start the still-persisted feature.
5. Exercise enable/disable/enable and feature/language interleavings. Final
   menu, storage, DOM, observers, queues, and requests must match the last valid
   requested state.

## 5. Extension-background network capture

Capture extension-background traffic, not only the page target.

### GitHub Raw and unpkg

1. Record install/update requests to the sole Raw URL.
2. Record all twelve fixed unpkg dictionary resources and compare their URL,
   byte length, and SHA-256 with `vendor/manifest.json`.
3. On ordinary page reload after installation, confirm no runtime unpkg request
   is made by YomiRuby and local resource URLs are accepted only after runtime
   length/digest verification.

### Google Translate

1. Before Katakana is enabled, confirm there is no Google request even when the
   page contains Katakana.
2. After enable, record exact host, path, method, query names, encoded `q`, body,
   and headers. The request must be GET to
   `translate.googleapis.com/translate_a/single`, have no body/custom headers,
   and contain only matched, deduplicated phrases joined by newlines.
3. Prove surrounding sentences, Kanji, Hiragana, title, URL, origin, and browsing
   history are absent. Record that the Katakana phrases are exposed in the URL
   and may enter logs.
4. Confirm there is no second provider, analytics, remote logging, tracking ID,
   install callback, or silent fallback.

## 6. Matching, validation, scheduling, and failure silence

Check full-width and half-width Katakana, long marks, combination marks, brand
names, names, non-English loanwords, onomatopoeia, and excluded single-character
cases.

1. Verify only an explicit unique original maps to a non-empty, changed,
   Latin-containing translation.
2. Verify empty, unchanged, non-Latin, missing, unknown-original,
   duplicate-original, malformed JSON, HTTP failure, timeout, and wrong mapping
   preserve source text and create no repeated user-facing error.
3. Confirm failed phrases are not retried in the same page session; a later
   disable/re-enable may start a new session.
4. Confirm off-screen content is not sent before reaching the viewport margin.
5. Force multiple batches: one request maximum in flight, phrase-count and URL
   budgets honored, and minimum interval observed.
6. Disable during queued work, interval wait, and active request. Confirm work is
   cleared, supported requests abort, and late results are discarded.

## 7. Dual-feature DOM matrix and rollback

Exercise Kanji off/on × Katakana off/on in both activation orders. Confirm
local-only Kanji, online-only Katakana, and a single non-nested coordinated plan
when both are enabled.

Check ordinary text, links, nested inline markup, author Ruby, Katakana
Terminator Ruby, forms, editable regions, code/pre, hidden/inert/aria-hidden
content, script/style/template, SVG/MathML, media, dynamic content, and
YomiRuby-owned UI. Confirm:

- all ownership names use the YomiRuby prefix;
- Katakana overlap is reserved without placeholder while pending;
- success wins its overlap, failure releases it to a reliable whole-token
  Kanji reading;
- disabling either feature preserves the other feature;
- source changes and detach/reinsert invalidate stale ownership;
- three complete on/off cycles restore exact original fixture markup.

## 8. Failure, CSP, and real-site gates

Simulate dictionary absence, wrong size/digest, unsupported local-resource URL,
translation failures, setting read/write failures, observer startup failure,
and cancellation. Confirm fail-closed behavior without stopping an unrelated
active module.

Repeat the matrix on the controlled strict-CSP fixture, then on x.com only after
explicit authorization. Include dynamic posts, links, composer/editor
exclusion, scrolling, language, reload, new tabs, cross-origin separation,
rollback, performance observations, and extension-background capture.

A coexistence check may prove YomiRuby preserves existing Katakana Terminator
annotations. Disabling the separate script is a distinct, separately authorized
migration step. Do not claim Chrome/Tampermonkey compatibility, privacy capture,
update behavior, performance, accuracy, or complete rollback until the actual
evidence is recorded in a new browser verification report.
