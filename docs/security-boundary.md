# Security and privacy boundary — YomiRuby 0.4.0

This document describes the 0.4.0 release candidate's intended boundary and
local evidence. It is not a claim that desktop Chrome + Tampermonkey,
extension-background traffic, install/update behavior, or real sites have
already passed verification.

## Default-off execution boundary

The userscript matches ordinary HTTP and HTTPS pages so the user can enable it
on any site, and `@noframes` prevents frame injection. On an unconfigured exact
origin, both annotation features remain disabled. Disabled state reads only the
global locale, the global translation-provider enum, and the two current-origin
booleans, then registers menus. It does not scan page text, load Kuromoji,
attach body observers, initialize either translation provider, or send
page-derived network data.

Normal enable, disable, startup, provider-switch, and language-switch paths are
silent. Only actionable failures such as setting persistence or safe startup
failure create a temporary non-modal error notice.

## Separate local and selected-provider paths

### Local Kanji Romaji

Page text used for kanji readings is passed only to the in-page Kuromoji
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

The katakana path starts only after the user enables it for the exact current
origin and that boolean write succeeds. The `Online` / `联网` menu wording is
the network disclosure; there is no separate consent value or confirmation
dialog. The selected provider is a separate global setting and never implies
feature consent.

Only matched, deduplicated katakana phrases are eligible. Neither provider is
given surrounding kanji or hiragana, complete sentences, page titles, page
URLs, origins, or browsing history. The selected provider necessarily receives
the matched phrase and ordinary request metadata. A provider failure preserves
source text and never resends the phrase to the other provider.

#### Google

Google uses GET requests to:

```text
https://translate.googleapis.com/translate_a/single
```

Fixed parameters are `client=gtx`, `dt=t`, `sl=ja`, and `tl=en`; `q` contains
deduplicated phrases joined by newlines. Because phrases are in the URL, they
may be retained in browser, extension, network appliance, proxy, or service
logs.

#### Bing

Bing initialization anonymously GETs:

```text
https://www.bing.com/translator
```

Redirects are accepted only to HTTPS `/translator` on the exact
`www.bing.com` or `cn.bing.com` host. Returned HTML is parsed without executing
it. YomiRuby requires a unique bounded IG, the IID specifically attached to
`#rich_tta`, and a strict temporary key/token/expiry tuple. Missing, duplicate,
malformed, oversized, or ambiguous values fail closed.

One matched phrase at a time is sent anonymously in a form-encoded POST to the
same approved origin's `/ttranslatev3` path. Temporary Bing configuration,
expiry, counter, request state, translations, failures, and queues remain in
page memory. HTTP 401 permits one configuration refresh and one retry for the
affected phrase. A second 401, HTTP 429, CAPTCHA, unknown response, timeout,
network error, or parse/integrity failure stops the operation without bypass or
cross-provider fallback.

Bing POST redirects are rejected, and response processing requires the reported
final URL to equal the requested URL. Missing, zero, non-integer, or non-2xx
HTTP status also fails closed; indeterminate transport state is never treated as
a valid config or translation.

## Public network roles

| Party | Boundary |
|---|---|
| GitHub Raw | Sole planned userscript install and automatic-update source. |
| unpkg | Install/update acquisition of twelve fixed Kuromoji dictionary resources; runtime rejects HTTP(S) resource URLs. |
| Google Translate | Page-derived requests only while the exact-origin katakana feature is enabled and Google is selected. |
| Bing Translator | Anonymous initialization plus page-derived POSTs only while the exact-origin katakana feature is enabled and Bing is selected. |

The built userscript contains three audited `GM_xmlhttpRequest` call paths: one
local-resource reader and one adapter for each translation provider. Metadata
grants only `@connect translate.googleapis.com`, `@connect www.bing.com`, and
`@connect cn.bing.com`. Static audit rejects wildcard Bing hosts, ordinary
`fetch`, XHR, WebSocket, EventSource, `sendBeacon`, Web Storage/IndexedDB,
dynamic evaluation, remote executable scripts, unexpected request paths, extra
`@connect` hosts, and runtime remote dictionary URLs.

There is no API key, Bing/Microsoft account or Cookie, Azure resource,
project-owned proxy, analytics, telemetry, crash reporting, remote logging,
tracking identifier, install callback, or silent provider fallback.

## Persistence boundary

Persistent project-owned values are limited to:

- global `yomi-ruby:locale = "en" | "zh"`;
- global `yomi-ruby:translation-provider = "bing" | "google"`;
- `yomi-ruby:auto-origin:<origin>` for Local Kanji Romaji;
- `yomi-ruby:katakana-origin:<origin>` for Online Katakana English.

The old `jrr:auto-origin:` key is ignored. Feature settings, locale, and
provider are never inferred from one another except for the one-time supported
provider default described below. Token readings, matches, translations,
failures, temporary credentials, pending queues, in-flight requests, and DOM
ownership records remain in page memory only.

If the locale key is absent, the primary browser preference is inspected once:
`zh*` maps to `zh`; everything else maps to `en`. After locale resolution, a
missing or invalid provider maps `zh` to Bing and every other locale to Google,
then repairs storage. A valid stored provider always wins. A provider read
failure uses the deterministic locale-derived provider for the current page
and reports the read error without enabling a feature. A repair-write failure
uses that provider for the page and reports the failed persistence. Manual
provider selection persists before replacement; write failure restores the
last persisted provider and never contacts the unpersisted provider. Later
language changes never overwrite the provider.

## Cancellation, response, and DOM gates

Both adapters serialize traffic. Disable or provider replacement clears unsent
work, cancels waits, aborts the active GM handle when supported, invalidates the
katakana generation, clears page-memory provider state, rolls back current
ruby, and re-coordinates eligible DOM for the current adapter. A late result is
discarded unless the feature, translator, generation, target connection, and
source range are still current. A non-cooperative old translator cannot block a
new generation or overwrite it.

Responses must provide a non-empty, changed, Latin-containing English result
owned by the requested phrase. Missing, duplicate, ambiguous, malformed,
wrong-target, contradictory-language, unchanged, or non-Latin results remain
unannotated and preserve source text.

The page coordinator is the only production module that commits generated
ruby. It uses `yomi-ruby-` / `data-yomi-ruby-` ownership markers, prevents
overlap and nesting, and restores source text when the last feature is disabled.
Scripts, styles, forms, editable areas, code, hidden content, ruby, SVG/MathML,
media, and YomiRuby UI are skipped. Existing author ruby and Katakana
Terminator annotations are preserved.

## Evidence and limitations

Exact versions and hashes establish byte identity, not absence of latent
defects. Kuromoji 0.1.2 is old. The Google and Bing no-key web endpoints are not
contractual cloud APIs and can redirect, change, throttle, challenge, fail, or
translate poorly. The observed Bing protocol is time-specific evidence from
2026-07-26, not a Microsoft guarantee.

Node/jsdom tests, static audit, local dictionary loading, vendor downloads, and
deterministic builds do not prove anonymous/Cookie-free behavior in
Tampermonkey, extension-background traffic, mainland-China reachability,
resource persistence, x.com compatibility, translation correctness, complete
browser rollback, performance, GitHub Raw update behavior, or public Release
identity. Those remain explicit browser/publication gates in
`docs/manual-test-plan.md`.
