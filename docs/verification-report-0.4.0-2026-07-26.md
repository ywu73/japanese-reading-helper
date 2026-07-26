# YomiRuby 0.4.0 local verification report — 2026-07-26

## Candidate identity

| Field | Verified value |
|---|---|
| Branch | `main` |
| Baseline `HEAD` | `31f63470d8cc6cfaba950efe74d62e63e935288c` |
| Baseline `origin/main` | `31f63470d8cc6cfaba950efe74d62e63e935288c` |
| Package/userscript version | `0.4.0` |
| Node | `v24.14.0` |
| npm | `11.9.0` |
| Artifact | `dist/yomi-ruby.user.js` |
| Artifact size | `191319` bytes |
| Artifact SHA-256 | `5f4646977fd75e90e0fdca514d7e051772d9ca21fa406cdd1cf73d3522dcc509` |

The implementation was made as unstaged working-tree changes on the synchronized
`main` baseline above. No staging, commit, branch creation, push, PR, userscript
installation, Chrome/Tampermonkey mutation, live-site operation, GitHub setting
change, or release/publication action was performed.

## Implemented scope

- Added global `yomi-ruby:translation-provider = "bing" | "google"` persistence.
  A valid stored provider wins; otherwise resolved `zh` defaults to Bing and
  every other interface locale to Google. Missing/invalid values are persisted
  or repaired once, and language changes never overwrite provider choice.
- Added the stable fourth provider menu between Katakana and Language with exact
  bilingual opposite-provider copy. Provider, locale, and feature writes share
  one serialized persistence queue with last-operation-wins runtime behavior.
- Provider write failure restores the last persisted provider/menu, retains the
  old translator, reports one localized error, and never sends a phrase to the
  unpersisted provider.
- Added an explicit translator-replacement session operation. Active replacement
  reuses coordinator disable/enable lifecycle to abort the old generation,
  clear queued/cache state, roll back ruby, and re-coordinate eligible DOM. A
  non-cooperative late old result cannot block or overwrite the new generation.
- Uses fresh provider adapters on successful replacement so old Bing temporary
  initialization state is discarded rather than retained across a switch away
  and back.
- Retained the existing Google adapter behind the common
  `translatePhrases(phrases, { signal })` interface without cross-provider
  fallback.
- Added an independent minimal Bing adapter. It anonymously fetches the approved
  translator page, validates the exact allowed final host/path, parses inert
  HTML for one bounded IG, the `#rich_tta` IID, and one strict temporary
  key/token/expiry tuple, then sends one validated katakana phrase per serialized
  anonymous `/ttranslatev3` POST.
- Bing traffic rejects redirects, requires an exact final response URL and a
  positive 2xx integer status, honors page-declared expiry with refresh skew,
  permits only one configuration refresh plus one affected-phrase retry on 401,
  and fails closed on second 401, 429, CAPTCHA, malformed/ambiguous data,
  unreliable translations, timeout, network error, abort, or late response.
- Updated version, exact `@connect` metadata, static build audit, project product
  boundary, English/Chinese README, dependency provenance, network/security
  disclosure, contributor text, and manual browser gates for 0.4.0.

## Automated local results

### Test suite

Final `npm test` passed **115/115** tests. New coverage includes:

- provider enum/write rejection, locale-derived initialization, stored-value
  precedence, invalid-value repair, and read/write failure semantics;
- exact four-menu order/copy, persistence-before-replacement, failed provider
  writes, localized initialization errors, and rapid last-operation-wins
  switching;
- inactive, active, failed, rapid, and late-result translator replacement;
- redacted deterministic Bing translator HTML fixture;
- exact anonymous GET/POST method, URL, query, form, header, timeout, and redirect
  behavior;
- whole-phrase privacy filtering, deduplication, serialization, shared config,
  expiry/refresh skew, SFX sequencing, bounded 401 refresh, second-401 reset,
  429/CAPTCHA/invalid-response failure, missing/zero status rejection, redirect
  rejection, timeout, network error, abort, and later retryability.

Existing local Kanji, Google, dictionary-integrity, DOM safety, viewport,
MutationObserver/IntersectionObserver, Katakana Terminator coexistence,
cancellation, dynamic content, and rollback coverage remained green.

### Full repository check

Final `npm run check` passed. It included:

- all 115 unit/integration tests;
- real local loading of all twelve preloaded dictionary assets;
- expected readings including `今日:kyō`, `東京:tōkyō`, `日本語:nihongo`,
  `勉強:benkyō`, `食べる:taberu`, `方法:hōhō`, and `思う:omou`;
- static Kuromoji feasibility with known/unknown-token behavior;
- twelve verified Blob-resource round trips with no remote runtime URL;
- generated userscript build;
- the 0.4.0 static build audit.

The build audit passed exact version/metadata, four-menu order, provider enum and
storage key, exact Google/Bing endpoints, exact `@connect` values with no Bing
wildcard, three audited `GM_xmlhttpRequest` paths, anonymous Bing behavior,
strict redirect/final-URL/status checks, twelve SRI resources, approved storage
calls, prohibited browser/network/persistence/dynamic-execution primitives, and
embedded canonical licenses/notices.

### Vendor verification

Final `npm run verify:vendor` downloaded all **12/12** fixed
`https://unpkg.com/kuromoji@0.1.2/` dictionary resources. Every byte length and
SHA-256 matched `vendor/manifest.json`.

### Deterministic artifact

Final `npm run verify:deterministic-build` built the userscript twice and
compared the bytes. Both outputs were identical:

```text
191319 bytes
sha256=5f4646977fd75e90e0fdca514d7e051772d9ca21fa406cdd1cf73d3522dcc509
```

## Two-axis review

The fixed-point review used baseline
`31f63470d8cc6cfaba950efe74d62e63e935288c`, the global/project instructions,
contribution rules, and the Bing/Google implementation handoff.

- **Standards:** no documented-standard violations. Two judgement-call smells
  were reported. The opaque local `sfx` name was changed to
  `requestSequence`. Provider-local GM request/abort code remains duplicated
  deliberately because the handoff warns against introducing a general network
  abstraction unless it simplifies both clients without weakening fixed-host
  and fixed-path assertions.
- **Spec:** the first review found the then-missing 0.4.0 evidence report plus two
  Bing fail-closed gaps: POST final redirects were not rejected, and missing or
  zero HTTP status could be accepted. The implementation now rejects redirects,
  validates the exact reported final POST URL, requires an integer 2xx status,
  adds regression tests/static assertions, and records this report only after
  final checks passed.

## Explicitly unverified and unauthorized gates

The following remain outstanding and are not claimed by this report:

- installation or execution in desktop Chrome + Tampermonkey;
- real four-menu/provider behavior in a userscript manager;
- extension-background proof that Bing GET/POST are anonymous, Cookie-free, and
  limited to the documented fields;
- no-proxy mainland-China reachability and actual `www.bing.com` ->
  `cn.bing.com` redirect behavior;
- actual Bing token expiry, 401, 429, CAPTCHA, redirect, and response-shape
  behavior in Tampermonkey;
- proof that only matched phrases and no surrounding page context reach Google
  or Bing in the real extension environment;
- strict-CSP execution of this exact 0.4.0 artifact;
- x.com behavior, performance, translation accuracy, complete browser rollback,
  tabs, and cross-origin behavior;
- update from an older installed version through GitHub Raw;
- disabling or migrating a separately installed Katakana Terminator;
- GitHub Actions, staging, commit, push, PR, merge, tag, GitHub Release, public
  Raw availability, and Release artifact/checksum identity.

No Chrome/Tampermonkey compatibility, anonymous Bing transport, privacy capture,
mainland-China reachability, install/update, performance, accuracy, public
availability, or complete browser rollback claim is made by this local report.
