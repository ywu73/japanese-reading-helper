# Verification report — 2026-07-25

## Passed locally

- `npm test`: 25 tests passed under Node 24.14.0 and jsdom 29.1.1.
- `npm run test:loader-real`: the production loader verified all 12 preloaded
  local dictionary assets in memory, initialized statically bundled Kuromoji, and produced `kyō`, `tōkyō`,
  `nihongo`, `benkyō`, `taberu`, `hōhō`, and `omou` for controlled samples.
- `npm run test:feasibility`: Kuromoji requested only the twelve in-memory
  `verified:/dictionary/*.dat.gz` paths and skipped an unknown token without a
  reading.
- `npm run verify:vendor`: all 12 pinned unpkg responses matched their expected
  byte lengths and SHA-256 digests.
- `npm run test:resource-prototype`: passed all twelve real compressed
  dictionaries through Blob resource URLs, runtime size/SHA-256 verification,
  decompression, and static tokenization while dynamic `Function` was blocked.
- `npm run build` plus `scripts/audit-build.mjs`: generated the single-file
  userscript with exactly twelve SRI `@resource` entries, no `@connect`, and no
  remote dictionary URL in the runtime body, dynamic JavaScript evaluation,
  `@require`, ordinary `fetch`, `sendBeacon`, or page persistence API.
- Exact direct development dependencies installed from the official npm
  registry; the npm audit result was zero known vulnerabilities at check time.

The automated DOM suite covers attributable generated ruby, whole-token mixed
kanji-kana annotations, unsafe and hidden regions, links, nested inline markup,
author-ruby conversion and exact restoration, Katakana Terminator preservation,
dynamic additions, viewport scheduling, fallbacks, repeated rollback, Unicode
positions after emoji, and stopping observation after disable.

## Passed in Chrome with Tampermonkey

- The independently installed version 0.1.0 userscript initialized successfully
  in the real Tampermonkey sandbox on the loopback manual fixture.
- Manual activation produced the expected stable result of 20 generated ruby
  elements plus one converted author-provided ruby reading. During initial
  mutation processing, a count taken immediately after the first annotation
  appeared was 29; after the page settled it was 20, with no nested or duplicate
  generated ruby remaining.
- Readings exercised in the browser included `kyō`, `tōkyō`, `kōkō`,
  `nihongo`, `benkyō`, `taberu`, `hōhō`, `ōkii`, `omou`, and `samidare`.
  The unknown single-character candidate `遊` remained unchanged.
- Pure kana, forms, editable content, `code`, `pre`, and hidden content received
  no generated ruby. Link content was annotated without breaking the link.
- An existing author ruby was converted to romaji and restored exactly to
  `<ruby>日本語<rt title="author-reading">にほんご</rt></ruby>` when disabled.
- All three Katakana Terminator `rt.katakana-terminator-rt` elements retained
  their original attributes and content, including `data-rt="type"` and
  `タイプ`.
- A dynamically appended paragraph was incrementally annotated as
  `atarashii`, `tōkyō`, `kiji`, `nihongo`, and `benkyō`.
- Keyboard focus, the 2 px focus outline, the kana tooltip, visual placement,
  and the absence of Chrome console errors and warnings were checked manually.
- Manual disable removed every generated ruby, converted-reading marker,
  project data attribute, status node, and injected style while preserving the
  fixture content. Re-enabling, disabling, automatic-run activation, and final
  rollback were exercised in the browser.
- With automatic run enabled for `http://127.0.0.1:8765`, a reload produced
  annotations without a menu command. After automatic run and current
  annotation were disabled, a final reload plus a five-second wait produced
  zero JRR nodes or styles, confirming that the setting and page were clean.

## Network evidence and remaining limitations

- Page-target CDP observed 13 Tampermonkey-extension blob fetches during the
  automatic-run reload. All were `GET` requests and none carried `postData`.
- The 13 observed blob fetches are consistent with the one runtime and twelve
  dictionary assets, but their blob URLs do not expose the original manifest
  URLs.
- Tampermonkey performs `GM_xmlhttpRequest` in extension context. The page CDP
  target did not expose the extension-background requests to `unpkg.com`.
  Therefore this run does **not** dynamically prove that the original 13 remote
  requests were the manifest URLs or that their request metadata contained no
  page-derived values.
- Static audit still limits the sole remote call site to a fixed manifest URL,
  `GET`, `arraybuffer`, and `anonymous: true`, with no request-data field, and
  `@connect` permits only `unpkg.com`. `npm run verify:vendor` independently
  verified the bytes at all 13 manifest URLs.
- Manual cancellation during an in-progress live dependency download was not
  exercised in Chrome.

## Known site compatibility failure

On **2026-07-25**, manual activation on `https://x.com` failed closed after the
runtime bytes had been verified. The site CSP does not allow `unsafe-eval`, and
the version 0.1.0 loader executes the verified Kuromoji browser bundle through
`new Function(...)`. Chrome rejected that evaluation with:

```text
Verified Kuromoji runtime evaluation failed: Evaluating a string as JavaScript
violates the following Content Security Policy directive because 'unsafe-eval'
is not an allowed source of script
```

A deterministic minimal reproduction confirmed that the verified-loader call
chain reaches the same wrapped error when dynamic `Function` construction is
blocked. A separate prototype statically bundled Kuromoji 0.1.2, initialized it
from all twelve in-memory dictionary files, and produced the expected readings
while dynamic `Function` was forcibly blocked. This supports moving executable
Kuromoji code into the build output and retaining runtime verification only for
non-executable dictionary assets. Version 0.1.0 must not be represented as
compatible with strict-CSP sites such as x.com.

## Version 0.1.1 CSP fix candidate

- The production loader no longer downloads `build/kuromoji.js` or executes
  source text. `Tokenizer`, `DynamicDictionaries`, and `zlibjs` are bundled at
  build time from the exact locked dependencies.
- Runtime network access is limited to the twelve dictionary URLs in the
  schema-version 2 manifest. Dictionary length and SHA-256 validation remains
  mandatory before initialization.
- A formal integration test blocks global dynamic `Function` construction,
  serves all twelve real package dictionaries through the GM request seam, and
  still produces the expected readings. This test failed with the exact CSP
  error before the fix and passes after the fix.
- The generated 116,450-byte userscript contains no `eval`, `new Function`,
  `Function("return this")`, remote runtime URL, or native XHR/fetch call site.
- Two consecutive builds produced the identical SHA-256 digest
  `8a3cf69128ddae93e2192e7910b0766684a525b82aab347e6351c92f8c7773e1`.
- A real Chrome fixture was served with
  `script-src 'self'` and no `unsafe-eval`. Through a test GM adapter, the formal
  dist build produced thirteen generated ruby elements, converted one author
  ruby, preserved Katakana Terminator, annotated a dynamic paragraph, and
  rolled back to zero project nodes and styles.
- Page-target CDP observed exactly twelve manifest dictionary `GET` requests,
  no `postData`, no runtime exception, and no CSP log entry in that fixture.

This controlled fixture proves that the 0.1.1 build no longer requires dynamic
JavaScript evaluation. At the time this section was recorded, installation had
not yet been authorized.

The 0.1.0 loopback browser feature, visual, automatic-run, and rollback gates
remain recorded as historical evidence. Version 0.1.1 resolves the reproduced
CSP mechanism in automated and controlled-browser tests, but Tampermonkey/x.com,
extension-background network observation, and live-download cancellation remain
open. Version 0.1.1 was therefore a **candidate build** at that checkpoint.

## User-reported 0.1.1 upgrade

Later on **2026-07-25**, the user reported that Japanese Romaji Ruby had been
updated to 0.1.1 without modifying Katakana Terminator and had been manually
enabled on x.com. This is useful installation-state evidence, but no independent
browser capture of the final x.com DOM, rollback, dynamic posts, console, or
Tampermonkey extension-background traffic was recorded in that step. It must
not be expanded into a full compatibility claim.

## Version 0.1.2 local candidate

- The automatic-annotation menu now exposes explicit **开启本网站自动标注** and
  **关闭本网站自动标注** states. Enabling persists the current origin and starts
  the current page immediately; disabling persists `false` and immediately
  rolls back the current page. The temporary **切换当前页罗马音标注** command
  does not change the per-origin preference.
- Two interface tests cover immediate enable on a previously disabled origin,
  automatic startup from a stored true value, immediate disable, persistence,
  rollback, and menu-label refresh.
- The build emits twelve exact `@resource` entries using the URLs and SHA-256
  hashes from `vendor/manifest.json`. It no longer requests runtime dictionary
  URLs from the manifest and has no `@connect` permission.
- The runtime manifest contains only `name`, `resourceName`, `size`, and
  `sha256`. The generated runtime body contains none of the twelve unpkg URLs.
- `GM_getResourceURL` output is accepted only for `blob:`, `data:`,
  `chrome-extension:`, or `moz-extension:`. An HTTPS result is rejected before
  `GM_xmlhttpRequest` is called. Every local response is rechecked for exact
  length and SHA-256 before decompression.
- A real-dictionary Blob prototype verified all twelve assets and produced
  `今日 → キョウ`, `東京 → トウキョウ`, `日本語 → ニホンゴ`, and
  `勉強 → ベンキョウ` while dynamic `Function` was blocked. No HTTPS runtime
  URL was used by the prototype.
- The strict-CSP controlled browser fixture used `default-src 'self'`,
  `script-src 'self'`, and `connect-src 'self'`, with no `unsafe-eval`. It
  emulated already-preloaded dictionary bytes behind local Blob resource URLs.
- The browser produced thirteen stable generated ruby nodes and one converted
  author reading, preserved Katakana Terminator exactly, generated no nested
  ruby, annotated the dynamic sentence as `atarashii`, `tōkyō`, `kiji`,
  `nihongo`, and `benkyō`, and restored generated ruby, converted RT markers,
  styles, and status nodes to zero.
- A transient count of 22 on automatic reload exposed that the status message
  itself was being annotated. A red-first DOM test reproduced the issue;
  `[data-jrr-status]` is now excluded. The final browser reload held thirteen
  generated ruby nodes, zero generated ruby inside the status UI, zero nested
  ruby, one converted author RT, no error status, and zero browser errors or
  warnings.
- The complete Node 24.14.0 gate passed: 25/25 tests, production local loader,
  feasibility tokenizer, Blob-resource prototype, deterministic build, and
  build audit. Node 20.9.0 is below jsdom 29.1.1's supported engine floor and
  cannot run the DOM suite; the bundled Node 24.14.0 runtime was used instead.
- `npm run verify:vendor` re-downloaded all twelve resources and matched every
  recorded size and SHA-256. Their compressed total is 17,791,956 bytes.
- The final candidate is 118,822 bytes. Two consecutive builds produced the
  identical SHA-256 digest
  `a7bb8b245c24db8387b8f1621155bd3805aff7531e2de1dc81e41d248276d7e9`.

### 0.1.2 evidence boundary

Version 0.1.2 was **not installed** in Tampermonkey. The controlled fixture
preloaded dictionary bytes itself before importing the dist build, so it proves
the binary resource seam, integrity checks, CSP behavior, automatic lifecycle,
dynamic annotation, coexistence, and rollback in that fixture. It does not
prove that Tampermonkey downloads each SRI resource successfully, persists the
resources across complete reloads, returns one of the accepted local URL forms,
or works on the real x.com DOM. Those gates remain deliberately open.
