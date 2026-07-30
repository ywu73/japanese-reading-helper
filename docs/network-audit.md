# Network audit

## YomiRuby 0.6.0 transitional local candidate model

Version 0.6.0 retains the twelve exact `kuromoji@0.1.2` dictionary resources,
their byte lengths, SHA-256 digests, SRI metadata, and the local-resource reader.
This transition deliberately keeps all twelve dictionaries preloaded; the
proposed roughly 17 MiB lazy Tampermonkey cache is not implemented or verified.
The runtime still rejects HTTP(S) dictionary URLs and has no remote dictionary
fallback.

The generated metadata grants exactly three network hosts:

```text
// @connect      translate.googleapis.com
// @connect      www.bing.com
// @connect      cn.bing.com
```

Kanji and katakana activation remain separate, default-off exact-origin
booleans. Kanji has an independent global `google | bing | local` mode;
katakana has an independent global `google | bing` provider. A write must
succeed before an active path switches. A provider failure preserves source
text and never sends the word or phrase to another provider or silently loads
Local.

The two features own separate runtime state: adapter instance, exact-candidate
cache, FIFO, waiters, abort controller, generation, rate limit, and Bing
configuration/counter. Switching one feature does not clear or block the other.
Two adapters may contact the same selected provider concurrently; YomiRuby does
not claim that this isolates either path from provider-wide rate limits or
anti-abuse controls.

### Google katakana adapter

Google is fixed to `https://translate.googleapis.com/translate_a/single`.
Katakana requests use GET parameters `client`, `dt`, `sl`, `tl`, and `q`; `q`
contains matched, deduplicated katakana phrases joined by newlines. Requests
have an explicit timeout, no body, no custom headers, batches bounded by both
50 phrases and a maximum 1800-character encoded URL, one
request in flight, a minimum interval, and an abort path.

### Google kanji adapter

Local `Intl.Segmenter("ja", { granularity: "word" })` first produces complete,
deduplicated, `isWordLike` candidates containing Han characters. Offset
ambiguity fails before a request. The fast path groups at most 50 exact words
with `🧩`, keeps the encoded URL at or below 1800 characters, and uses fixed
`client=gtx`, `sl=ja`, `tl=ja`, `dt=t`, and `dt=rm`. The final response URL must
equal the exact request URL; exactly one source echo must equal the submitted
joined string; exactly one `item[2]` romaji field must split to the requested
word count. Each aligned segment is independently checked against the bounded
space-aware romaji character set.

Malformed structure, source/count drift, HTTP error including 429, timeout,
network failure, or final-URL mismatch abandons the whole fast-path batch and
falls back only to Google's existing exact single-word `tl=en`/`item[3]` path.
Cancellation starts no fallback. Ordinary translation cannot substitute for
romaji, and an unsafe segment in an otherwise aligned batch skips only its word.

Google query URLs disclose the submitted words or phrases to browser,
extension, network, proxy, and service logging surfaces.

### Bing shared initialization and transport

Both Bing clients anonymously GET `https://www.bing.com/translator`, follow
redirects, and accept the final URL only when HTTPS, the exact host is
`www.bing.com` or `cn.bing.com`, and the path is `/translator`. Returned HTML is
bounded and parsed as inert HTML. YomiRuby does not execute the page or its
JavaScript. It requires exactly one plausible IG across the legacy direct
`window._G.IG = "..."` assignment and the current bounded
`_G = { ..., IG: "...", ... }` initializer shape, exactly one
`#rich_tta[data-iid]`, and exactly one strict key/token/expiry tuple. Duplicate
or ambiguous values fail closed.

Temporary origin, IG, IID, key, token, expiry, sequence counter, and
initialization promise remain in page memory. POSTs target only the same allowed
origin's `/ttranslatev3` path with fixed query fields. Both GET and POST use
`anonymous: true`; no Cookie, account header, or custom User-Agent is added.
POST redirects are rejected and the reported final URL must byte-for-byte equal
the request URL. Missing, non-integer, zero, or non-2xx status fails closed.

The katakana client sends stable FIFO batches with `fromLang=ja` and `to=en`.
Each POST contains at most 50 exact phrases joined by newlines, with at most
1800 encoded characters in the `text` field, an 8-second timeout, one request in
flight, and at least 250 ms between batch starts. It requires one translation
text with exactly one non-empty, changed, Latin-containing output line per input
phrase; any positional ambiguity rejects the whole batch. It may validate then
ignore one exact bounded Latin `{ inputTransliteration, script: "Latn" }`
object. The kanji client sends stable FIFO batches of at most 50 locally
segmented words joined by newlines, with at most 1800 encoded characters in
`text`, `fromLang=ja`, and `to=ja`. The translation echo and the independent
`inputTransliteration` with `script: "Latn"` must both preserve exact line count
and order. `detectedLanguage=zh-Hans` is not
a standalone hard rejection because a live `山 -> yama` probe exhibited that
combination. A rewritten source, wrong target/script, unsafe romaji, unknown
field, missing object, or additional response item fails closed.

Each Bing adapter fully serializes its traffic. HTTP 401 invalidates temporary
configuration, refetches it once, and retries only the affected katakana or
kanji batch once. A second 401, HTTP 429, `ShowCaptcha`, timeout, network error, malformed
or ambiguous data, or unsuitable result fails closed. CAPTCHA is not bypassed.
There is no identifier rotation, cross-provider fallback, spell-check, lookup,
examples, telemetry, logging, history, ads, or account endpoint.

A 2026-07-27 command-line probe found that Bing rejected Node/Undici's default
User-Agent with HTTP 401 but accepted the same anonymous, Cookie-free request
when the throwaway adapter used a Chrome-formatted User-Agent. That differential
diagnoses the CLI harness only. Product code does not spoof User-Agent, and this
probe is not proof of real Chrome/Tampermonkey transport behavior.

### Shared disclosure, state, and static evidence

Online kanji sends only batches of complete locally segmented words, never a
surrounding sentence or complete text node. Neither online feature sends page titles, page
URLs, origins, or browsing history. This is bounded disclosure, not zero
disclosure: the selected provider receives each submitted word or phrase and
ordinary request metadata exists.

Successful and failed kanji readings, in-flight work, and deduplication caches
remain within the current page. Mode/provider replacement invalidates only its
own generation, aborts matching work, rolls back matching DOM, and rejects late
results. Remote `GM_addValueChangeListener` notifications synchronize kanji mode
and katakana provider independently without write loops.

Foreground scanning covers all safe body text in stable DOM order, including
dynamic additions, with no per-page candidate cap. An event-driven roughly
500 ms mutation window and cooperative chunks replace the old viewport gate.
Hidden tabs start no new candidate work; returning to the foreground rescans
only the currently connected DOM. These scheduling rules change candidate
discovery volume, not the per-request disclosure described above.

Automated injected-request tests cover exact methods, hosts, paths, fields,
anonymous mode, local segmentation, deduplication, serialization, source
ownership, strict Bing redirect/config parsing, bounded 401 refresh, fail-closed
errors, abort, and late-result rejection. The build audit asserts the three exact
`@connect` entries, five `GM_xmlhttpRequest` call sites, five-menu order,
independent enums/storage keys, local `Intl.Segmenter`, preloaded resources, and
the absence of ordinary `fetch`, XHR, WebSocket, EventSource, `sendBeacon`, page
persistence, dynamic evaluation, runtime remote dictionaries, wildcard Bing
permission, or extra request call sites.

The Google and Bing web endpoints are undocumented, non-contractual,
best-effort interfaces. Availability, regional reachability, redirect behavior,
rate limits, response formats, correctness, and continued no-key access may
change. No 0.6.0 Tampermonkey installation, online-kanji extension-background
capture, no-proxy mainland-China check, reload-persistence test, x.com run, or
standalone Katakana Terminator migration has been performed. Local checks do not
prove installed-extension transport, browser compatibility, reading accuracy,
performance, privacy, or complete rollback.

## Version 0.1.2 allowed acquisition

The build has no `@connect` declaration. Its metadata contains twelve exact
`@resource` URLs recorded in `vendor/manifest.json`, each followed by its
SHA-256 SRI value. Tampermonkey may acquire these assets when the userscript is
installed or updated:

- twelve pinned IPADIC dictionary gzip files.

Kuromoji executable modules are included in the generated userscript at build
time. No remote JavaScript runtime is requested or evaluated.

At page runtime the script asks `GM_getResourceURL` for the already preloaded
asset and refuses HTTP or HTTPS results. Its `GM_xmlhttpRequest` call therefore
serves only as a binary reader for a local resource URL. No remote dictionary
request fallback exists.

## Verification procedure

Run `npm run verify:vendor` to download every URL afresh and compare the response
length and SHA-256 digest with the manifest. Run `npm run build` followed by
`node scripts/audit-build.mjs` to reject dynamic JavaScript evaluation, the
legacy remote runtime URL, `@require`, ordinary `fetch`, `sendBeacon`, and
browser persistence APIs in the generated script.

For the real Tampermonkey browser gate, observe installation/update and page
reload separately. Installation or update may acquire the twelve manifest
URLs. After resources are installed, a page reload must not produce a runtime
unpkg request from this userscript. Any runtime `GM_xmlhttpRequest` must target
only a Tampermonkey-provided local resource URL and carry no body, page text,
title, or origin.

## Recorded status

On **2026-07-25**, the version 0.1.0 verifier downloaded one runtime and twelve
dictionary assets. Every response length and SHA-256 matched the then-current
manifest. The historical 0.1.0 Tampermonkey observations below therefore refer
to 13 assets.

Later on **2026-07-25**, the independently installed userscript was exercised in
real Chrome with Tampermonkey on
`http://127.0.0.1:8765/tests/fixtures/manual.html`. Page-target CDP was enabled
before an automatic-run reload. It recorded 13 fetches whose URLs were
`blob:chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/...`; all 13 used
`GET` and none exposed `postData`. The count is consistent with the one runtime
and twelve dictionary assets.

This evidence has an important boundary: Tampermonkey performs
`GM_xmlhttpRequest` from extension context. The page CDP target did not expose
the extension-background requests to `unpkg.com`, so the original request URLs,
headers, and payloads were **not observed dynamically**. The blob observations
must not be represented as proof that the original requests exactly matched the
13 manifest URLs or contained no page-derived data.

The source and generated-build audit provides complementary evidence:

- `@connect` permits only `unpkg.com`;
- the only remote request call site receives a URL from the embedded immutable
  manifest;
- it fixes `method: "GET"`, `responseType: "arraybuffer"`, and
  `anonymous: true`;
- it supplies no request `data`, page text, title, history, or origin value;
- every response is checked for exact byte length and SHA-256 before dictionary
  use.

For version **0.1.1**, `npm run verify:vendor` downloaded all twelve pinned
dictionary assets afresh. Every length and SHA-256 matched the schema-version 2
manifest. The generated build contains no remote runtime URL or dynamic
JavaScript evaluation construct.

A local Chrome fixture served with `script-src 'self'` and no `unsafe-eval`
loaded the formal 0.1.1 build through a test GM adapter. Page-target CDP observed
exactly twelve `https://unpkg.com/kuromoji@0.1.2/dict/*.dat.gz` requests; all
used `GET`, none exposed `postData`, and no runtime exception or CSP log entry
was recorded. This proves the formal build can initialize under that controlled
CSP and that the test adapter sends only dictionary GETs. It does not prove
Tampermonkey extension-background behavior or x.com compatibility. At that
checkpoint 0.1.1 had not yet been installed; the later user-reported upgrade
did not include independent extension-background capture.

For version **0.1.2**, the local Blob-resource prototype passed all twelve real
dictionary files through the same resource reader, exact size/SHA-256 checks,
decompression, and static tokenizer while dynamic `Function` construction was
blocked. No HTTPS runtime URL was used. The generated metadata contains exactly
twelve SRI `@resource` lines, the runtime body contains none of the twelve
remote URLs, and the build has no `@connect`, `fetch`, page persistence API, or
remote fallback.

A controlled strict-CSP browser fixture emulated already-preloaded resources
with local Blob URLs. The page runtime produced thirteen stable generated ruby
elements, converted one author ruby, preserved Katakana Terminator, handled
dynamic content, and fully rolled back with zero browser errors or warnings.
The fixture server fetched the dictionary bytes locally before importing the
dist build; this is evidence for the runtime binary seam and CSP behavior, not
for Tampermonkey's own persistent cache.

The current status is therefore: 0.1.2 build-time SRI metadata, local binary
round-trip, runtime refusal of HTTPS resource URLs, and controlled strict-CSP
behavior passed. Real Tampermonkey installation/update acquisition, persistence
across reloads, local resource URL form, and x.com behavior remain open because
0.1.2 was deliberately not installed.

## Version 0.1.3 local candidate

Version 0.1.3 keeps the same twelve `kuromoji@0.1.2` resource URLs, byte lengths,
SHA-256 digests, SRI metadata, and no-`@connect` model. No vendor asset or remote
acquisition route changed. The runtime reader now accepts an `AbortSignal` and,
when available, calls the Tampermonkey request handle's `abort()` method during
page-session teardown. An unsupported or already-running digest/decompression
step may still finish, but the invalidated session discards its result.

The 0.1.3 build audit passed with one dynamic origin-menu expression, exactly
twelve SRI resource declarations, no removed temporary page command, no remote
dictionary URL in the runtime body, and no dynamic evaluation, ordinary fetch,
`sendBeacon`, or page persistence API. A fresh vendor-verifier run ultimately
downloaded and matched all twelve resources. Its first attempt timed out during
a TLS read; a retry passed every recorded size and SHA-256 digest.

This is local evidence only. Version 0.1.3 was not installed in Tampermonkey,
and no real Chrome, extension-background, reload-persistence, or x.com network
observation was performed.

## YomiRuby 0.1.4 local rename candidate

Version 0.1.4 changes the product/package/build names to YomiRuby, `yomi-ruby`,
and `dist/yomi-ruby.user.js`. It also renames the Tampermonkey namespace,
setting and DOM prefixes, and twelve local resource identifiers to `yomi-ruby`.
It retains the same twelve `kuromoji@0.1.2` resource URLs, sizes, SHA-256
digests, SRI metadata, no-`@connect` model, and verified local-resource reader.
No new endpoint, acquisition route, request field, or page-derived network
value was introduced.

The renamed vendor verifier downloaded all twelve fixed resources on
2026-07-26 and matched every recorded size and SHA-256 digest. The 0.1.4 build
audit also passed with no runtime remote dictionary URLs, dynamic evaluation,
ordinary fetch, `sendBeacon`, or page persistence API.

No real Tampermonkey installation/update, extension-background network capture,
reload-persistence observation, or x.com operation was performed for 0.1.4.
