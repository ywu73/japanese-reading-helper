# Chrome and Tampermonkey manual test plan for YomiRuby 0.2.0

Do not install the candidate until the user explicitly authorizes installation. Do not disable the separately installed Katakana Terminator until YomiRuby 0.2.0 has passed the relevant real-browser gates.

## 1. Install and metadata gate

1. Build `dist/yomi-ruby.user.js` and inspect the metadata header.
2. Confirm `@name YomiRuby`, `@namespace yomi-ruby.local`, `@version 0.2.0`, exactly twelve SRI `@resource` entries, and exactly `@connect translate.googleapis.com`.
3. Confirm Tampermonkey accepts all resources and the exact connect permission. Record extension-background acquisition evidence separately from page requests.
4. Confirm there is only one active YomiRuby entry. Treat the historical namespace cutover as a separate identity concern and do not run obsolete Japanese Romaji Ruby builds simultaneously.

## 2. Default-off and settings isolation

1. On an unconfigured origin, confirm the only two YomiRuby commands are **开启本网站汉字罗马音** and **开启本网站片假名英文**.
2. Before either click, confirm there is no YomiRuby style/status/observer, local dictionary read, or Google request.
3. Preload only `yomi-ruby:auto-origin:<origin>=true`; reload and confirm only kanji starts. Confirm no Google request and no katakana confirmation.
4. Preload only `yomi-ruby:katakana-origin:<origin>=true`; reload and confirm only katakana starts and no Kuromoji dictionary read occurs.
5. Confirm `jrr:auto-origin:` has no effect and the kanji setting never enables katakana.
6. Verify protocol, hostname, and port differences remain separate origins.

## 3. Katakana consent and request disclosure

1. With katakana disabled, click **开启本网站片假名英文**.
2. Confirm the dialog explicitly says matched katakana phrases will be sent to Google Translate and that complete sentences, page titles, and page URLs are not sent.
3. Cancel. Confirm the setting remains false, the menu remains enable, no scan starts, and no request occurs.
4. Confirm on a second attempt. Confirm persistence succeeds before scanning/requesting begins and the menu becomes **关闭本网站片假名英文**.
5. In extension-background network tools, record the exact request host, path, method, query parameter names, encoded `q`, body, and headers. Confirm the request is GET to `translate.googleapis.com/translate_a/single`, has no body, and `q` contains only matched phrases joined with newlines.
6. Confirm surrounding text, kanji, hiragana, complete sentences, `document.title`, `location.href`, and origin are absent. Note explicitly that the katakana phrases are visible in the URL and may enter logs.

## 4. Matching and response behavior

Check ordinary full-width katakana, half-width katakana, long marks, combination marks, brand names, names, non-English loanwords, onomatopoeia, and single characters outside the original matching semantics.

For controlled responses, verify:

- non-empty Latin-containing translation commits as returned;
- empty, unchanged Japanese, non-Latin, missing, unknown-original, duplicate-original, malformed JSON, HTTP error, timeout, and wrong mapping keep the source unchanged;
- reordered items with explicit unique originals map correctly without positional guessing;
- failed phrases are not automatically retried in the same page session;
- disabling and re-enabling creates a new session that can attempt again.

## 5. Request scheduling and cancellation

1. Place katakana far below the viewport. Confirm it is not sent before scrolling near it.
2. Scroll through enough unique phrases to force multiple batches. Confirm at most one request is in flight, both phrase-count and encoded-URL limits are honored, and a visible interval separates requests.
3. Add dynamic near-viewport content and confirm it is queued once without periodic whole-page scans.
4. Disable while phrases are queued, during the interval, and during an active request. Confirm unsent work is cleared and the request is aborted when Tampermonkey exposes cancellation.
5. Deliver or simulate a late response after disable. Confirm no Ruby appears.
6. Modify or remove a target before its response. Confirm the old result is discarded.

## 6. Dual-module coordination

Exercise all four final states and both activation orders:

| Kanji | Katakana | Expected behavior |
|---|---|---|
| Off | Off | Original DOM; no tokenizer or Google request |
| On | Off | Reliable kanji tokens receive local Hepburn only |
| Off | On | Matched katakana may receive authorized online English only |
| On | On | One coordinated, non-nested plan with katakana overlap priority |

Then verify:

1. Non-overlapping kanji and katakana both render.
2. For a controlled mixed token, katakana activation immediately removes an overlapping kanji Ruby and leaves plain source text while translation is pending.
3. Katakana success wins the overlap; any remaining kanji is annotated only if independently reliable.
4. Katakana failure releases the range and allows the reliable whole kanji token to return.
5. Closing katakana after success restores the kanji plan without duplicate text or nested Ruby.
6. Closing kanji leaves katakana Ruby and shared styles intact; closing katakana leaves kanji Ruby and styles intact.
7. Rapid enable/disable/enable sequences end with DOM, menu, persistence, observers, and requests matching the last requested state.

## 7. DOM safety and rollback

Check ordinary text, links, nested inline markup, author Ruby, Katakana Terminator Ruby, forms, editable regions, code/pre, hidden/inert/aria-hidden content, script/style/template, SVG/MathML, media, and YomiRuby status UI.

Confirm all project classes and attributes use `yomi-ruby-` / `data-yomi-ruby-`; no nested Ruby is generated; author markup and `rt.katakana-terminator-rt` / `rt[data-rt]` remain exact. Repeat complete on/off cycles at least three times and compare the restored HTML with the original fixture.

## 8. Failure and real-site gates

1. Simulate dictionary absence, digest mismatch, translation HTTP failure, timeout, malformed payload, setting read/write failure, observer startup failure, and cancellation.
2. Confirm each path fails closed without accidentally stopping the other active module.
3. Repeat the full matrix on a controlled strict-CSP page and then x.com, including dynamic posts, links, composer/editor exclusion, menus, scrolling, rollback, and extension-background network capture.
4. Do not run YomiRuby katakana and standalone Katakana Terminator together as a supported final configuration. A short coexistence check may confirm YomiRuby does not overwrite existing annotations; migration requires separately authorized disabling of the old script only after YomiRuby passes.

Record actual browser version, Tampermonkey version, candidate hash, origin, timestamps, request evidence, failures, and exact unverified items in a new browser verification report. Do not amend historical 0.1.x reports.
