# Security and privacy boundary — Japanese Reading Helper

Japanese Reading Helper was previously named YomiRuby. The 0.6.2 rename retains
the existing setting keys, namespace, permissions, and runtime behavior.

This document describes the 0.6.0 transitional release candidate's intended
boundary and local evidence. It is not a claim that desktop Chrome + Tampermonkey,
extension-background traffic, install/update behavior, or real sites have
already passed verification.

## Default-off execution boundary

The userscript matches ordinary HTTP and HTTPS pages so the user can enable it
on any site, and `@noframes` prevents frame injection. On an unconfigured exact
origin, both annotation features remain disabled. Disabled state reads only the
global locale, the independent global kanji-mode and translation-provider
enums, and the two current-origin booleans, then registers menus. It does not
scan page text, load Kuromoji,
attach body observers, initialize either translation provider, or send
page-derived network data.

Normal enable, disable, startup, mode-switch, provider-switch, and
language-switch paths are silent. Only actionable failures such as setting
persistence or safe startup failure create a temporary non-modal error notice.

## Separate local and selected-provider paths

Kanji and katakana execute in separate deep runtimes. Each runtime exclusively
owns its selected adapter, exact-candidate `missing -> pending -> success |
failure` cache, first-discovery FIFO, waiters, rate-limited work, abort
controller, generation, and any Bing temporary configuration. Closing or
switching one runtime clears only that runtime. The two runtimes do not share
mutable provider state and may independently contact the same selected provider
at the same time; provider-wide throttling outside Japanese Reading Helper remains possible.

### Selectable Kanji Romaji

Kanji activation is an exact-origin boolean independent of the global
`google | bing | local` mode. A fresh install initializes the mode from the
primary browser language (`zh*` -> Bing; all others -> Google). An existing
install without the mode key migrates to Local, so an update never silently
expands page-text disclosure. A kanji mode change never changes the katakana
provider.

#### Local mode

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

After every compressed asset passes verification, local initialization uses
`DecompressionStream("gzip")` when that browser API exists. Streams run sequentially
and receive the initialization abort signal. Native construction or decoding
failure rejects initialization; it does not retry through another decoder. Only
API absence selects the existing statically bundled `zlibjs` decoder. This changes
in-memory decompression, not asset acquisition or executable loading, and creates
no Worker, additional request or persistent cache. The loader waits for complete
initialization before releasing its temporary dictionary Map.

Version 0.6.0 deliberately retains preloading of all twelve dictionary
resources. It does not claim that the proposed roughly 17 MiB lazy Tampermonkey
cache has been implemented or verified.

#### Google and Bing modes

Online kanji analysis requires local `Intl.Segmenter("ja", { granularity:
"word" })`. Segment offsets must exactly and continuously cover the source text.
Only complete, deduplicated, `isWordLike` segments containing Han characters
are eligible, including mixed words such as `食べる`. The clients group only
those exact candidates; complete text nodes, sentences, surrounding context,
page titles, page URLs, origins, and history are not sent. Segmenter or offset
ambiguity fails before network traffic.

Google's fast path fixes `client=gtx`, `sl=ja`, `tl=ja`, `dt=t`, and `dt=rm`,
and joins at most 50 exact words with `🧩` under a maximum 1800-character URL.
It requires one exact joined-source echo, one independent `item[2]` romaji
field, and exactly one aligned segment per word. A structurally or
transport-invalid batch falls back only to Google's pre-existing exact
single-word `tl=en`/`item[3]` path. A safe batch may omit one unsafe segment
without shifting another word. Ordinary translation text is never used as
romaji.

Bing fixes `fromLang=ja` and `to=ja` and joins at most 50 exact words with
newlines under a maximum 1800-character encoded `text` budget. Both the echoed
source lines and the independent `{ inputTransliteration, script: "Latn" }`
lines must remain exactly aligned. Bing's reported
`detectedLanguage` is not a standalone hard gate because a live probe returned
`zh-Hans` for a valid `山 -> yama` result.

Both clients apply strict candidate character and response-shape checks.
Accepted online output is displayed as returned; it is not converted or claimed
to be verified modified Hepburn. Successes, failures, pending requests, and
deduplication caches remain in page memory. Provider failure preserves source
text and never resends the word to the other provider or silently loads Local.

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

For katakana, fixed parameters are `client=gtx`, `dt=t`, `sl=ja`, and `tl=en`;
`q` contains deduplicated phrases joined by newlines. Each batch contains at
most 50 phrases and its encoded URL is at most 1800 characters. For kanji, the
same exact endpoint receives bounded `🧩`-joined complete-word batches plus
`dt=rm`, or one exact word through the same-provider fallback. Because
submitted text is in the URL, it may be retained in browser, extension,
network appliance, proxy, or service logs.

#### Bing

Bing initialization anonymously GETs:

```text
https://www.bing.com/translator
```

Redirects are accepted only to HTTPS `/translator` on the exact
`www.bing.com` or `cn.bing.com` host. Returned HTML is parsed without executing
it. Japanese Reading Helper requires exactly one bounded IG across the legacy direct
`window._G.IG` assignment and the current bounded `_G` object initializer, the
IID specifically attached to `#rich_tta`, and a strict temporary
key/token/expiry tuple. Missing, duplicate, malformed, oversized, or ambiguous
values fail closed.

The Bing runtimes send stable FIFO batches anonymously in a form-encoded POST
to the same approved origin's `/ttranslatev3` path. Each batch contains at most
50 exact phrases or words joined by newlines, and the encoded `text` payload is
at most 1800 characters. Katakana uses `ja -> en`; kanji uses `ja -> ja`. Both
use an 8-second timeout and a minimum 250 ms batch-start interval. Temporary Bing configuration,
expiry, counter, request state, translations, failures, and queues remain in
page memory. HTTP 401 permits one configuration refresh and one retry for the
affected katakana or kanji batch. A second 401, HTTP 429, CAPTCHA, unknown response, timeout,
network error, or parse/integrity failure stops the operation without bypass or
cross-provider fallback.

Bing POST redirects are rejected, and response processing requires the reported
final URL to equal the requested URL. Missing, zero, non-integer, or non-2xx
HTTP status also fails closed; indeterminate transport state is never treated as
a valid config or translation.

For katakana, the single translation text is split only on line boundaries and
accepted only when it yields exactly one non-empty, changed, Latin-containing
line per input phrase. A missing, extra, blank, unchanged, or non-Latin line
rejects the whole batch; Japanese Reading Helper never shifts later lines onto earlier phrases.
The response may include one exact, bounded Latin `inputTransliteration`
metadata object after the required translation result; it is validated and
ignored. For kanji, a single such object is required. Its newline-separated
readings and the `ja -> ja` source echo must both have the exact requested word
count and order; every echoed line must match its input word. Each safe aligned
reading is displayed but never persisted or passed to Local mode. Unknown
fields, a wrong script, a non-Latin value, rewritten source, count drift, or
additional response items fail closed.

## Public network roles

| Party | Boundary |
|---|---|
| GitHub Raw | Sole planned userscript install and automatic-update source. |
| unpkg | Install/update acquisition of twelve fixed Kuromoji dictionary resources; runtime rejects HTTP(S) resource URLs. |
| Google Translate | Page-derived requests only while an exact-origin online feature is enabled and Google is selected. |
| Bing Translator | Anonymous initialization plus page-derived POSTs only while an exact-origin online feature is enabled and Bing is selected. |

The built userscript contains five audited `GM_xmlhttpRequest` call paths: one
local-resource reader, two katakana adapters, and two kanji adapters. Metadata
grants only `@connect translate.googleapis.com`, `@connect www.bing.com`, and
`@connect cn.bing.com`. Static audit rejects wildcard Bing hosts, ordinary
`fetch`, XHR, WebSocket, EventSource, `sendBeacon`, Web Storage/IndexedDB,
dynamic evaluation, remote executable scripts, unexpected request paths, extra
`@connect` hosts, and runtime remote dictionary URLs.

There is no API key, Bing/Microsoft account or Cookie, custom User-Agent, Azure
resource, project-owned proxy, analytics, telemetry, crash reporting, remote
logging, tracking identifier, install callback, or silent provider fallback.

## Persistence boundary

Persistent project-owned values are limited to:

- global `yomi-ruby:locale = "en" | "zh"`;
- global `yomi-ruby:kanji-romaji-mode = "google" | "bing" | "local"`;
- global `yomi-ruby:translation-provider = "bing" | "google"`;
- `yomi-ruby:auto-origin:<origin>` for Kanji Romaji activation;
- `yomi-ruby:katakana-origin:<origin>` for Online Katakana English.

The old `jrr:auto-origin:` key is ignored. Feature settings, locale, kanji mode,
and provider remain independent except for their separate one-time defaults
described below. Token readings, matches, translations, failures, temporary
credentials, pending queues, in-flight requests, and DOM ownership records
remain in page memory only.

If the locale key is absent, the primary browser preference is inspected once:
`zh*` maps to `zh`; everything else maps to `en`. After locale resolution, a
missing or invalid provider maps `zh` to Bing and every other locale to Google,
then repairs storage. A valid stored provider always wins. A provider read
failure uses the deterministic locale-derived provider for the current page
and reports the read error without enabling a feature. A repair-write failure
uses that provider for the page and reports the failed persistence. The
provider menu displays the currently persisted provider and next target. Manual
provider selection persists before replacement; write failure keeps the last
persisted menu/runtime and never contacts the unpersisted provider. Later
language changes never overwrite the provider.

Kanji-mode initialization runs before locale/provider writes so it can
distinguish a fresh install from an upgrade. A missing mode on a fresh install
uses the primary language (`zh*` -> Bing; all others -> Google); any existing
locale/provider setting makes the missing mode migrate to Local. Invalid values
repair to Local. Read failure uses Local for the page without another write.
The mode menu likewise displays the current persisted mode and next target.
Manual mode selection persists before runtime replacement. Chinese menu order
cycles `bing -> local -> google`; English cycles `google -> local -> bing`.
Changing language immediately recalculates only the next menu action and does
not change the current mode.

## Cancellation, response, and DOM gates

All four online adapters serialize their own traffic, while the independent
kanji and katakana adapters may run concurrently even when they select the same
host. Disable, kanji-mode
replacement, or katakana-provider replacement clears matching unsent work,
cancels waits, aborts the active GM handle when supported, invalidates only the
matching generation, clears its page-memory provider state, rolls back current
ruby, and re-coordinates eligible DOM for the current adapter. A late result is
discarded unless the feature, translator, generation, target connection, and
source range are still current. A non-cooperative old translator cannot block a
new generation or overwrite it.

Katakana responses must provide a non-empty, changed, Latin-containing English
result owned by the requested phrase. Online kanji responses must instead pass
the source-echo and independent-romaji checks described above. Missing,
duplicate, ambiguous, malformed, wrong-target, contradictory-language,
unchanged, or unsafe results remain unannotated and preserve source text.

The page coordinator is the only production module that commits generated
ruby. It uses `yomi-ruby-` / `data-yomi-ruby-` ownership markers, prevents
overlap and nesting, and restores source text when the last feature is disabled.
Scripts, styles, forms, editable areas, code, hidden content, ruby, SVG/MathML,
media, and Japanese Reading Helper UI are skipped. Existing author ruby and Katakana
Terminator annotations are preserved.

While the document is visible, the coordinator scans all safe body text in
stable DOM order, including later MutationObserver additions. Mutation bursts
use an event-driven approximately 500 ms merge window, and large scans yield in
ordered cooperative chunks. There is no viewport qualification, permanent
polling interval, or per-page candidate cap. A hidden document starts no new
runtime work; visibility restoration discards detached ownership and rescans
the currently connected DOM. Katakana pending/success ranges reserve overlaps;
a cached katakana failure releases the range to a reliable complete kanji word.

## Evidence and limitations

Exact versions and hashes establish byte identity, not absence of latent
defects. Kuromoji 0.1.2 is old. The Google and Bing no-key web endpoints are not
contractual cloud APIs and can redirect, change, throttle, challenge, fail, or
translate poorly. The observed Google/Bing source-romaji fields and Bing
protocol are time-specific evidence from 2026-07-27, not a Google or Microsoft
guarantee.

Node/jsdom tests, static audit, local dictionary loading, vendor downloads, and
deterministic builds do not prove anonymous/Cookie-free behavior in
Tampermonkey, extension-background traffic, mainland-China reachability,
resource persistence, x.com compatibility, translation correctness, complete
browser rollback, performance, GitHub Raw update behavior, or public Release
identity. Those remain explicit browser/publication gates in
`docs/manual-test-plan.md`.

The two online kanji paths have not been exercised through real Tampermonkey.
The current local tests must not be described as proof of installed-extension
transport, browser compatibility, online reading accuracy, or complete rollback.
