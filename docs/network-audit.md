# Network audit

## YomiRuby 0.3.0 current local candidate model

Version 0.3.0 retains the twelve exact `kuromoji@0.1.2` dictionary resources,
their byte lengths, SHA-256 digests, SRI metadata, and the local-only runtime
resource reader. The kanji path introduces no new network value and still
rejects HTTP(S) dictionary URLs at runtime.

The metadata now adds exactly:

```text
// @connect      translate.googleapis.com
```

This permission supports one optional online runtime endpoint:
`https://translate.googleapis.com/translate_a/single`. The katakana module is
off for an unconfigured exact origin. After one menu click and successful
exact-origin setting persistence, it sends GET requests whose parameters are limited to `client`,
`dt`, `sl`, `tl`, and `q`; `q` contains matched, deduplicated katakana phrases
joined by newlines. Requests have an explicit timeout, no body, no custom
headers, one in-flight request maximum, phrase-count and encoded-URL batching,
and an abort path.

The GET URL exposes the katakana phrases to browser, extension, network,
proxy, and service logging surfaces. This is a disclosed limitation, not a
claim of zero data disclosure. The implementation does not add page titles,
page URLs, origins, browsing history, complete sentences, surrounding kanji or
hiragana, analytics, a second provider, or a remote fallback.

There is no confirmation dialog or separate consent key in 0.3.0. The bilingual
`Online` / `联网` menu wording discloses the network behavior. Normal operation
has no loading, success, disable, or language-switch status notice.

Automated injected-request tests assert the exact host/path/parameters,
deduplication, absence of body/headers, response mapping, batching, serial
execution, delay, invalid-response rejection, and abort behavior. The build
audit asserts one exact `@connect`, one fixed translation endpoint, two distinct
`GM_xmlhttpRequest` call paths, twelve SRI resources, and the absence of
ordinary `fetch`, `sendBeacon`, page persistence, dynamic evaluation, runtime
remote dictionary URLs, or extra request call sites.

This is local evidence. No 0.3.0 Tampermonkey installation, extension-background
capture, reload-persistence test, x.com run, or standalone Katakana Terminator
migration has been performed. A synthetic two-phrase GET probe using only
`ゲーム` and `テレビ` was attempted on 2026-07-26; the current execution
environment returned neither a body nor interpretable HTTP headers within the
approximately ten-second tool windows. It therefore provides no endpoint
availability or response-shape evidence.

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
