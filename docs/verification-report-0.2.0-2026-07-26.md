# Verification report — YomiRuby 0.2.0 local katakana candidate — 2026-07-26

## Scope

This report records only local implementation and verification performed for the YomiRuby 0.2.0 candidate on 2026-07-26. It does not amend the 0.1.x historical reports and does not claim real Tampermonkey, extension-background, Google endpoint, Chrome/x.com, installation, migration, performance, translation accuracy, or publication results.

The implemented scope adds an explicitly authorized, exact-origin katakana translation module while retaining the local kanji Hepburn module. The two features have independent menu/settings state and share one page-level annotation coordinator for viewport scheduling, range ownership, DOM submission, cancellation, and rollback.

## Baseline revalidation

Before editing:

- branch: `main`;
- HEAD: `bcf353e475b81620d8f545e1002f9cf759feb1ad` (`2026-07-26 建立 YomiRuby 0.1.4 本地候选`);
- local `main` and the local tracking ref `origin/main` pointed to the same commit;
- worktree: clean;
- Node: `v24.14.0`;
- npm: `11.9.0`;
- baseline `npm test`: 38/38 passed.

No live remote fetch was performed, so the tracking ref comparison is not evidence of current GitHub parity.

## Implemented interfaces and boundaries

- `yomi-ruby:auto-origin:<origin>` remains the kanji-only compatibility setting.
- `yomi-ruby:katakana-origin:<origin>` is the independent katakana network-consent setting.
- The two dynamic menu labels are `开启/关闭本网站汉字罗马音` and `开启/关闭本网站片假名英文`.
- First katakana enable requires a disclosure/confirmation before persistence and runtime startup; cancellation performs no save, scan, or request.
- `AnnotationCoordinator` owns both feature plans, viewport/DOM observers, pending katakana reservations, overlap priority, exact-source validation, generated-node ownership, and rollback.
- `createKatakanaTranslationClient()` owns deduplication, fixed URL construction, phrase-count and encoded-URL batching, serial requests, minimum interval, timeout, AbortSignal handling, and response mapping.
- The local Kuromoji loader and the authorized Google translation client are separate injected `GM_xmlhttpRequest` paths.
- The old single-feature `PageAnnotator`, scheduler test seam, direct DOM annotator, and single-feature session were removed after their behavioral coverage was migrated to the new public seams.

## Automated test evidence

`npm run check` passed in full. Its `npm test` stage reported **54/54** passing tests with no failures, skips, cancellations, or todos.

The tests cover, among other existing 0.1.4 behavior:

- exact-origin setting separation, ignored legacy JRR state, two dynamic menus, confirmation cancellation, persistence ordering/failure, independent close, and rapid final-state convergence;
- original full-width/half-width Katakana Terminator matching semantics;
- fixed translation host/path/parameters, deduplication, no body/headers, explicit original mapping, reversed response order, invalid/unchanged/non-Latin/unknown/duplicate rejection;
- phrase-count and encoded-URL batching, one in-flight request, minimum interval, timeout configuration, abort handle use, late-response discard, and no cancellation retry;
- katakana-only startup without Kuromoji, shared style lifetime, stale tokenizer invalidation, fresh tokenizer after re-enable, load retry, and feature-isolated startup failure;
- non-overlapping dual annotations, pending overlap reservation without placeholder, katakana success priority, failure release to reliable kanji, deterministic close/recoordination, source-change rejection, detached-record cleanup and reinsertion, dynamic content, off-screen non-request, page-level serialization, and repeated exact rollback;
- preservation of nested markup, author Ruby, Katakana Terminator Ruby, forms, editable regions, code, hidden content, links, and YomiRuby status UI;
- existing analyzer, romanization, local-resource integrity, CSP-safe tokenizer, and loader failure behavior.

## Local loader, prototype, build, and audit evidence

The remaining `npm run check` stages passed:

- `test:loader-real`: loaded all 12 local preloaded assets and produced expected readings including `今日:kyō`, `東京:tōkyō`, `日本語:nihongo`, `勉強:benkyō`, `食べる:taberu`, `方法:hōhō`, and `思う:omou`;
- `test:feasibility`: exercised the pinned Kuromoji package and twelve dictionary files;
- `test:resource-prototype`: passed the verified Blob-resource round trip with no remote runtime dictionary URL;
- `npm run build`: generated the single installable artifact `dist/yomi-ruby.user.js`;
- `scripts/audit-build.mjs`: verified 0.2.0 metadata, two origin controls, the exact translation connect host, twelve SRI resources, two separate GM request paths, and absence of unsafe runtime paths.

`npm run build:visual-fixture` also passed after migration to `AnnotationCoordinator`. The ignored local preview contained three kanji feature annotations and no katakana feature or Google endpoint text.

## Independent vendor verification

`npm run verify:vendor` downloaded all twelve fixed `https://unpkg.com/kuromoji@0.1.2/dict/*.dat.gz` assets and matched every manifest byte length and SHA-256 digest. Total verified compressed bytes: **17,791,956**.

This verifies the recorded immutable dictionary assets only. It does not exercise a real page or Tampermonkey resource persistence and does not verify the Google translation endpoint.

A separate synthetic endpoint probe sent only the fixed phrases `ゲーム` and
`テレビ`. Neither the GET attempt nor a follow-up header request produced a
body or interpretable HTTP headers within the approximately ten-second tool
windows. The probe is therefore inconclusive and does not verify current
endpoint availability, response segmentation, or parser compatibility. No page
content, page title, page URL, origin, or browsing history was used.

## Deterministic artifact

Two consecutive formal builds produced identical results:

- path: `dist/yomi-ruby.user.js`;
- size: **145,062 bytes**;
- SHA-256: **`4088ce2434d11dda975c33ec74a6751d7851dc2861c83eba612fd51fb0335aa5`**.

The second build audit also passed.

## Diff and worktree review

`git diff --check` passed. The final diff was reviewed by status, name, statistics, the complete non-generated diff, generated metadata, request-path searches, and forbidden-token searches. Changes were confined to the 0.2.0 implementation, tests, build/audit scripts, project-local rules, documentation, and generated `dist/yomi-ruby.user.js`. The historical 0.1.x verification reports were not modified.

No file was staged, committed, pushed, installed, published, or used to modify a real browser or Tampermonkey script.

## Explicitly unverified

- Real Tampermonkey acceptance of the 0.2.0 metadata and exact `@connect` permission.
- Extension-background request capture and proof of real request fields.
- Real Google endpoint response shape, availability, throttling, accuracy, or logging behavior.
- Full Chrome strict-CSP fixture run with the built 0.2.0 userscript.
- Cross-refresh Tampermonkey `@resource` persistence.
- x.com behavior, performance, observer load, menus, editors, rollback, and network traffic.
- Simultaneous real-script coexistence and the later migration/disable of standalone Katakana Terminator.
- Installation, staging, commit, push, PR, release, or publication.
