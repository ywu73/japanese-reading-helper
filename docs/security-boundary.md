# Security and privacy boundary — YomiRuby 0.2.0

## Two deliberately separate data paths

### Local kanji path

Page text used for kanji readings is passed only to the in-page Kuromoji tokenizer. The kanji path has no remote reading, translation, AI, analytics, or logging endpoint and does not put page text, readings, titles, origins, URLs, or history into a request or persistent store.

Kuromoji executable modules are statically bundled from exact `kuromoji@0.1.2` package bytes. Twelve dictionary files are declared as exact `@resource` URLs with SHA-256 SRI fragments. At runtime, the verified loader accepts only `blob:`, `data:`, `chrome-extension:`, or `moz-extension:` URLs returned by `GM_getResourceURL`; it rejects HTTP(S), verifies exact byte length and SHA-256, and has no remote fallback.

### Opt-in katakana path

The katakana path is disabled for every unconfigured exact origin. Enabling it requires an explicit confirmation that matched katakana phrases will be sent to Google Translate. Only after that confirmation succeeds and the boolean `yomi-ruby:katakana-origin:<origin>` setting is saved may the current page start scanning and requesting translations.

The only translation endpoint is:

```text
https://translate.googleapis.com/translate_a/single
```

Requests use GET with fixed `client=gtx`, `dt=t`, `sl=ja`, and `tl=en` parameters. The `q` parameter contains only matched, deduplicated katakana phrases joined with newlines. It does not contain surrounding kanji or hiragana, complete sentences, page titles, page URLs, origins, or browsing history. Because `q` is in the URL, the phrases may be retained in browser, extension, network appliance, proxy, or service-side logs.

There is no API key, second provider, proxy, analytics route, logging route, or silent remote fallback. The endpoint is best-effort and carries no availability, stability, accuracy, or source-word guarantee.

## Runtime request separation

The built userscript contains two audited `GM_xmlhttpRequest` call paths:

1. The local-resource reader receives only a Tampermonkey-provided local URL, requests `arraybuffer`, and verifies fixed length and digest before dictionary use.
2. The katakana translator constructs only the fixed Google endpoint and fixed parameters above, sends no body or custom headers, enforces a timeout, and accepts an injected AbortSignal.

The metadata grants exactly `@connect translate.googleapis.com`; no wildcard or additional host is allowed. Static build audit rejects ordinary `fetch`, `sendBeacon`, Web Storage/IndexedDB, `eval`, `new Function`, remote executable scripts, unexpected request call sites, extra `@connect` hosts, and remote dictionary URLs in the runtime body.

## In-memory state and persistence

Token readings, katakana matches, successful translations, failures, pending queues, in-flight state, and DOM ownership records live only in page memory. Persistent project-owned values are booleans keyed by exact origin:

- `yomi-ruby:auto-origin:<origin>` for local kanji romaji;
- `yomi-ruby:katakana-origin:<origin>` for opt-in katakana translation.

The old `jrr:auto-origin:` setting is not inherited. The kanji setting is never interpreted as katakana network consent.

## Cancellation and stale-result gates

Katakana requests are serialized and split by both phrase count and encoded URL length. Closing the feature clears unsent work, cancels interval waits, aborts the active GM request when supported, invalidates its generation, clears page-memory translation state, and re-coordinates the DOM. A late response is discarded unless the feature, generation, target connection, and original source range are all still current.

Failures are not retried within the same page session. Missing, empty, unchanged, non-Latin, duplicate, unknown, or otherwise ambiguous response mappings remain unannotated. Refreshing or explicitly disabling and re-enabling creates a new session that may try again.

## DOM safety and rollback boundary

The page-level coordinator is the only production module that commits generated kanji or katakana Ruby. It assigns `data-yomi-ruby-generated` and `data-yomi-ruby-feature`, prevents overlap and nesting, reserves pending katakana ranges without inserting placeholders, and restores source text when the last feature is disabled.

Scripts, styles, forms, editable areas, code, hidden content, Ruby, SVG/MathML, media, and YomiRuby UI are skipped. Existing author Ruby and Katakana Terminator annotations are preserved. If a target is disconnected or its source text changes before a response arrives, the old result is not committed.

## Deliberate limitations

Exact versions and hashes establish byte identity, not absence of latent defects. Kuromoji 0.1.2 is old. The Google Translate no-key endpoint is not a contractual API and can change, throttle, fail, or translate poorly.

Node/jsdom tests, static audit, local dictionary loading, and controlled fixtures do not prove extension-background traffic, Tampermonkey resource persistence, x.com compatibility, translation correctness, complete browser rollback, or real-page performance. Those claims remain blocked until the 0.2.0 candidate is separately authorized, installed, exercised, and recorded under the manual test plan.
