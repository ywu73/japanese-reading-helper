# Network audit

## YomiRuby 0.4.0 current local candidate model

Version 0.4.0 retains the twelve exact `kuromoji@0.1.2` dictionary resources,
their byte lengths, SHA-256 digests, SRI metadata, and the local-only runtime
resource reader. The kanji path introduces no new network value and still
rejects HTTP(S) dictionary URLs at runtime.

The generated metadata grants exactly:

```text
// @connect      translate.googleapis.com
// @connect      www.bing.com
// @connect      cn.bing.com
```

The katakana module remains off for an unconfigured exact origin. Enabling it
permits page-derived traffic only to the globally selected provider. A provider
write must succeed before an active session switches, and a failure never
resends the phrase to the other provider.

### Google adapter

Google is fixed to `https://translate.googleapis.com/translate_a/single`.
Requests use GET parameters `client`, `dt`, `sl`, `tl`, and `q`; `q` contains
matched, deduplicated katakana phrases joined by newlines. Requests have an
explicit timeout, no body, no custom headers, bounded batches, one request in
flight, a minimum interval, and an abort path. The URL exposes the phrases to
browser, extension, network, proxy, and service logging surfaces.

### Bing adapter

Bing initialization anonymously GETs
`https://www.bing.com/translator`, follows redirects, and accepts the final URL
only when HTTPS, the exact host is `www.bing.com` or `cn.bing.com`, and the path
is `/translator`. Returned HTML is bounded and parsed as inert HTML. YomiRuby
does not execute the page or its JavaScript. It requires exactly one plausible
`window._G.IG`, exactly one `#rich_tta[data-iid]`, and exactly one strict
three-item `params_AbusePreventionHelper` tuple containing a positive key,
bounded token, and page-declared expiry interval.

The temporary origin, IG, IID, key, token, expiry deadline, SFX counter, and
initialization promise remain in page memory. Translation POSTs target only the
same approved origin's `/ttranslatev3` path with fixed `isVertical`, `IG`, `IID`,
`SFX`, `ref`, and `edgepdftranslator` query fields. The form body contains fixed
`fromLang=ja`, `to=en`, the single matched phrase as `text`, the temporary token
and key, and the fixed gender-debias request flag. Both GET and POST use
`anonymous: true`; no Cookie or account header is added.

POST redirect handling is set to `error`, and a successful response is accepted
only when its reported final URL is byte-for-byte the requested Bing URL. A
missing, non-integer, zero, or non-2xx HTTP status fails closed before HTML or
JSON acceptance.

Bing phrases are deduplicated, validated as whole katakana matches, length
bounded, and sent one per fully serialized request. HTTP 401 invalidates the
temporary configuration, refetches it once, and retries that phrase once. A
second 401, HTTP 429, `ShowCaptcha`, timeout, network error, malformed or
ambiguous config/response, wrong target/language, unchanged text, or non-Latin
result fails closed. CAPTCHA is not bypassed. There is no identifier rotation,
cross-provider fallback, spell-check, lookup, examples, telemetry, logging,
history, ads, or account endpoint.

### Shared disclosure and static evidence

Neither adapter intentionally sends surrounding sentences, kanji, hiragana,
page titles, page URLs, origins, or browsing history. This is a bounded data
disclosure, not a zero-disclosure claim: the selected provider receives each
matched phrase, and ordinary request metadata still exists.

Automated injected-request tests cover exact methods, hosts, paths, fields,
anonymous mode, deduplication, serialization, response validation, strict Bing
redirect/config parsing, bounded 401 refresh, fail-closed errors, abort, and
late-result rejection. The build audit asserts the three exact `@connect`
entries, fixed routes, three `GM_xmlhttpRequest` call sites (local resource,
Google, Bing), four-menu order, provider enum/storage key, and the absence of
ordinary `fetch`, XHR, WebSocket, EventSource, `sendBeacon`, page persistence,
dynamic evaluation, runtime remote dictionaries, wildcard Bing permission, or
extra request call sites.

The Google and Bing web endpoints are undocumented, non-contractual,
best-effort interfaces. Availability, China reachability, redirect behavior,
rate limits, response formats, correctness, and continued no-key access may
change. The Bing protocol evidence summarized in the implementation handoff was
time-specific to 2026-07-26. No 0.4.0 Tampermonkey installation,
extension-background capture, no-proxy mainland-China reachability check,
reload-persistence test, x.com run, or standalone Katakana Terminator migration
has been performed.

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
