# YomiRuby 0.3.0 local verification report — 2026-07-26

## Candidate identity

| Field | Verified value |
|---|---|
| Branch | `codex/yomi-ruby-v0.3.0` |
| Baseline `HEAD` | `50bf7981115952950dbdbbec5e059afbd6c6481a` |
| Baseline `origin/main` | `50bf7981115952950dbdbbec5e059afbd6c6481a` |
| Package/userscript version | `0.3.0` |
| Node | `v24.14.0` |
| npm | `11.9.0` |
| Artifact | `dist/yomi-ruby.user.js` |
| Artifact size | `172935` bytes |
| Artifact SHA-256 | `3de8cd44d6a4680c5a4b42edc18244788fda5c6b7f0c48875f065c1fbcfcf738` |

The branch began from a clean 0.2.0 baseline after a live `git ls-remote`
confirmed the remote `main` commit above. No staging, commit, push, PR,
userscript installation, Chrome/Tampermonkey mutation, GitHub setting change,
or release action was performed in this implementation session.

## Implemented scope

- Removed the Katakana confirmation dialog and separate consent flow. One menu
  click writes the exact-origin boolean and starts the optional online feature.
- Added one global `yomi-ruby:locale` enum with first-run primary-language
  detection, persistent manual switching, invalid-value English fallback, and
  fail-safe read/write behavior.
- Added exact English and Simplified Chinese menus in stable Kanji, Katakana,
  Language order. Switching language changes menus and future errors without
  touching feature sessions or page/network work.
- Removed normal loading/success/disable/language status UI. Actionable
  persistence and safe-start failures remain localized non-modal errors.
- Preserved exact-origin feature isolation, last-operation-wins writes,
  fail-closed startup, cancellation, stale-result invalidation, page-memory
  translation state, DOM ownership, and full source restoration behavior.
- Updated package and userscript metadata to 0.3.0 with MIT, GitHub, Raw install,
  Raw update, and bilingual metadata.
- Added canonical YomiRuby MIT, Kuromoji Apache-2.0/NOTICE, Katakana Terminator
  MIT/provenance files and embedded their canonical text in the generated
  single-file userscript.
- Added English and complete Simplified Chinese public documentation,
  contribution guidance, security/privacy reporting, updated current security,
  network, dependency, and manual browser documents, plus CI validation.

## Automated local results

### Exact dependency installation

`npm ci` completed successfully and installed 46 packages from the tracked
lockfile. No package or lockfile update was performed by that command.

### Test suite

`npm test` passed **71/71** tests. New 0.3.0 coverage includes:

- `zh*` and non-`zh` first-run mapping and one-time persistence;
- stored locale precedence, invalid-value English fallback, locale read/write
  failure behavior, manual switching, and missing-key English fallback;
- new-origin default-off behavior and exact three-menu copy/order;
- invalid persisted feature values failing closed rather than becoming truthy;
- invalid locale persistence requests being rejected at the enum boundary;
- one-click Katakana enable without confirmation;
- feature read/write fail-closed behavior;
- rapid feature and language operation convergence;
- an explicit feature-enable, language-switch, feature-disable interleaving
  through the shared persistence queue;
- silent normal Kanji loading/startup and silent Katakana startup;
- localized actionable startup errors.

Existing tests continued to cover local tokenization, Hepburn macrons,
whole-token mixed readings, unknown readings, verified dictionary loading,
Katakana matching, fixed-request construction, response validation, batching,
serialization, abort/timeout behavior, safe DOM scope, viewport/dynamic
scheduling, overlap ownership, author/Katakana Terminator Ruby preservation,
stale-result rejection, and repeated rollback.

### Full repository check

`npm run check` passed after the final source changes. It included:

- all 71 unit/integration tests;
- real local loading of all twelve preloaded dictionary assets;
- expected examples `今日:kyō`, `東京:tōkyō`, `日本語:nihongo`,
  `勉強:benkyō`, `食べる:taberu`, `方法:hōhō`, and `思う:omou`;
- static Kuromoji feasibility with expected known/unknown token behavior;
- twelve verified Blob-resource round trips with no remote runtime URL;
- generated userscript build;
- 0.3.0 build audit.

The build audit passed the exact version and bilingual metadata, sole Google
`@connect`, exact grants, twelve SRI resources, two audited GM request paths,
approved persistent keys, absence of confirmation and normal status copy,
exact GM storage call sites and rejection of any fourth YomiRuby storage key,
absence of ordinary remote/persistence/dynamic-execution primitives, and
embedded canonical licenses/notices.

### Vendor verification

`npm run verify:vendor` downloaded all **12/12** fixed
`https://unpkg.com/kuromoji@0.1.2/` dictionary resources. Every byte length and
SHA-256 matched `vendor/manifest.json`.

The tracked Kuromoji legal copies were also compared with the installed exact
package:

- `licenses/Apache-2.0.txt` and `node_modules/kuromoji/LICENSE-2.0.txt` both
  SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`;
- `licenses/Kuromoji-NOTICE.md` and `node_modules/kuromoji/NOTICE.md` both
  SHA-256 `fab84e2471dada5afa7ea4226b629f3fda414f9b50b62b4f832f8b57fe9addd7`.
- `licenses/doublearray-MIT.txt` and `node_modules/doublearray/LICENSE.txt`
  both SHA-256 `3f16fbaaaf98d1ba9ad570a1b79799d4932198324b382aa4cad1270fd09f02e3`;
- `licenses/zlibjs-MIT.txt` and `node_modules/zlibjs/LICENSE` both SHA-256
  `131afe3f7bdce1698beb292fb8de1a968de01bce876122a60ef5db230471c866`.

### Katakana Terminator provenance

GitHub's official repository API identified immutable upstream revision
`dbbff055b41e5fa12886af50b9862d9ae9f307c9` for the reviewed 2022.02.18
reference. A direct diff showed the retained distribution copy is identical to
that revision except for its two Greasy Fork `@downloadURL` and `@updateURL`
metadata lines. The local reference SHA-256 is
`1e671817bf1d1a6bd05353f0dd436ac3f25f7c54bf2d2a8447b3ce0f7b033932`.

### Deterministic artifact

`npm run verify:deterministic-build` ran the build twice from the same source
and compared the bytes. Both outputs were identical:

```text
172935 bytes
sha256=3de8cd44d6a4680c5a4b42edc18244788fda5c6b7f0c48875f065c1fbcfcf738
```

## CI configuration status

`.github/workflows/validate.yml` is configured for Pull Requests and pushes to
`main`, with read-only contents permission. It pins checkout/setup-node actions
to immutable commit SHAs and runs `npm ci`, `npm run check`,
`npm run verify:vendor`, deterministic build verification, and a tracked `dist`
consistency diff. It has no release or publish step.

This workflow has **not** run on GitHub. Local success must not be described as
a remote GitHub Actions pass.

## Explicitly unverified and unauthorized gates

The following claims/actions remain outstanding:

- installation or execution in desktop Chrome + Tampermonkey;
- first-run and manual bilingual controls in a real userscript manager;
- extension-background proof of GitHub Raw, unpkg, local-resource, and Google
  request behavior;
- proof that only matched deduplicated Katakana and no page context reaches
  Google in the real extension environment;
- real resource acquisition/cache/failure behavior across reloads;
- strict-CSP browser execution of this exact 0.3.0 artifact;
- x.com behavior, performance, accuracy, complete rollback, tabs, and cross-origin
  behavior;
- update from an older installed version through GitHub Raw;
- disabling or migrating a separately installed Katakana Terminator;
- GitHub Actions results, repository visibility, Ruleset, Private Vulnerability
  Reporting, staging, commits, push, PR, merge, tag, GitHub Release, public Raw
  availability, and Release artifact/checksum identity.

No Chrome/Tampermonkey compatibility, privacy capture, install/update,
performance, accuracy, public availability, or complete browser rollback claim
is made by this local report.
