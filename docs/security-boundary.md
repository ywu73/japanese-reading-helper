# Security and privacy boundary — YomiRuby 0.3.0

This document describes the 0.3.0 release candidate's intended boundary and
local evidence. It is not a claim that desktop Chrome + Tampermonkey,
extension-background traffic, install/update behavior, or real sites have
already passed verification.

## Default-off execution boundary

The userscript matches ordinary HTTP and HTTPS pages so the user can enable it
on any site, and `@noframes` prevents frame injection. On an unconfigured exact
origin, both annotation features remain disabled. Disabled state reads only the
global locale and the two current-origin booleans, then registers menus. It does
not scan page text, load Kuromoji, attach body observers, or send page-derived
network data.

Normal enable, disable, startup, and language-switch paths are silent. Only
actionable failures such as setting persistence or safe startup failure create
a temporary non-modal error notice.

## Two deliberately separate data paths

### Local Kanji Romaji

Page text used for Kanji readings is passed only to the in-page Kuromoji
tokenizer. This path has no remote reading, translation, AI, analytics, logging,
or fallback endpoint. It does not put page text, readings, titles, origins,
URLs, or history into a request or persistent store.

Kuromoji executable modules are statically bundled from exact
`kuromoji@0.1.2` package bytes. Twelve dictionary files are declared as exact
`@resource` URLs with SHA-256 SRI fragments. At runtime, the verified loader
accepts only `blob:`, `data:`, `chrome-extension:`, or `moz-extension:` URLs
returned by `GM_getResourceURL`; it rejects HTTP(S), verifies exact byte length
and SHA-256, and has no remote fallback.

### Optional Online Katakana English

The Katakana path starts immediately when the user enables it for the exact
current origin. The `Online` / `联网` menu wording is the network disclosure;
there is no separate consent value or confirmation dialog. A successful
setting write precedes session startup, and a failed enable write remains fail
closed.

The sole translation endpoint is:

```text
https://translate.googleapis.com/translate_a/single
```

Requests use GET with fixed `client=gtx`, `dt=t`, `sl=ja`, and `tl=en`
parameters. The `q` parameter contains only matched, deduplicated Katakana
phrases joined with newlines. It does not intentionally contain surrounding
Kanji or Hiragana, complete sentences, page titles, page URLs, origins, or
browsing history. Because `q` is in the URL, the phrases may be retained in
browser, extension, network appliance, proxy, or service-side logs.

There is no API key, second provider, proxy, project-owned analytics, telemetry,
crash reporting, remote logging, tracking identifier, install callback, or
silent remote fallback. The endpoint is experimental and best-effort, with no
availability, stability, accuracy, or word-origin guarantee.

## Public network roles

| Party | Boundary |
|---|---|
| GitHub Raw | Sole planned userscript install and automatic-update source. |
| unpkg | Install/update acquisition of twelve fixed Kuromoji dictionary resources; the runtime refuses HTTP(S) resource URLs. |
| Google Translate | Page-derived requests only while Online Katakana English is enabled for the exact origin. |

The built userscript contains two audited `GM_xmlhttpRequest` call paths: one
local-resource reader and one fixed Katakana translator. Metadata grants only
`@connect translate.googleapis.com`. Static audit rejects ordinary `fetch`,
XHR, WebSocket, EventSource, `sendBeacon`, Web Storage/IndexedDB, dynamic
evaluation, remote executable scripts, unexpected request paths, extra
`@connect` hosts, and runtime remote dictionary URLs.

## Persistence boundary

Persistent project-owned values are limited to:

- global `yomi-ruby:locale`, whose accepted values are `"en"` and `"zh"`;
- `yomi-ruby:auto-origin:<origin>` for Local Kanji Romaji;
- `yomi-ruby:katakana-origin:<origin>` for Online Katakana English.

The old `jrr:auto-origin:` key is ignored. One feature setting is never inferred
from another. Token readings, matches, translations, failures, pending queues,
in-flight requests, and DOM ownership records remain in page memory only.

If the locale key is absent, the primary browser preference is inspected once:
`zh*` maps to `zh`; everything else maps to `en`. The result is persisted.
Invalid stored values fall back to English without re-detecting the browser. A
first-run write failure keeps the deterministic detected language for the
current page and displays a localized error. Language switching changes only
menus and future errors; it does not touch feature state or sessions.

## Cancellation, response, and DOM gates

Katakana requests are serialized and split by phrase count and encoded URL
length. Disable clears unsent work, cancels waits, aborts the active GM request
when supported, invalidates the generation, clears page-memory translation
state, and re-coordinates the DOM. A late result is discarded unless the
feature, generation, target connection, and source range are still current.

Individual translation failures are silent and are not retried in the same
page session. Missing, empty, unchanged, non-Latin, duplicate, unknown, or
ambiguous mappings remain unannotated and preserve source text.

The page coordinator is the only production component that commits generated
Ruby. It uses `yomi-ruby-` / `data-yomi-ruby-` ownership markers, prevents
overlap and nesting, and restores source text when the last feature is disabled.
Scripts, styles, forms, editable areas, code, hidden content, Ruby, SVG/MathML,
media, and YomiRuby UI are skipped. Existing author Ruby and Katakana
Terminator annotations are preserved.

## Evidence and limitations

Exact versions and hashes establish byte identity, not absence of latent
defects. Kuromoji 0.1.2 is old. The Google no-key endpoint is not a contractual
Google Cloud API and can change, throttle, fail, or translate poorly.

Node/jsdom tests, static audit, local dictionary loading, vendor downloads, and
deterministic builds do not prove extension-background traffic, Tampermonkey
resource persistence, x.com compatibility, translation correctness, complete
browser rollback, performance, GitHub Raw update behavior, or public Release
identity. Those remain explicit browser/publication gates in
`docs/manual-test-plan.md`.
