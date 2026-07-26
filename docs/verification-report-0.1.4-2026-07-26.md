# Verification report — YomiRuby 0.1.4 local rename candidate — 2026-07-26

## Candidate outcome

Version 0.1.4 renames the current product surface from Japanese Romaji Ruby to
**YomiRuby** and the package to `yomi-ruby`. It does not implement Katakana
annotation. The current shipped capability remains local Hepburn romaji above
reliable Japanese tokens containing kanji.

This candidate was built and verified without installing or updating
Tampermonkey, operating Chrome or x.com, modifying Katakana Terminator, creating
a remote repository, or publishing any artifact. The 0.1.2 and 0.1.3 reports
remain historical evidence and were not rewritten.

The generated candidate is:

- path: `dist/yomi-ruby.user.js`;
- size: 122,893 bytes;
- SHA-256: `e6b7c0c0c4064896664b73f4c7a78e5b3fe38933e841c0f08872fa49e622adf7`;
- metadata name: `YomiRuby`;
- Chinese metadata name: `日语网页注音助手`;
- metadata version: 0.1.4.

Two consecutive builds produced the same byte count and SHA-256 digest. The
build removes the obsolete generated
`dist/japanese-romaji-ruby.user.js`, so the dist directory has one current
installable userscript.

## Identity-cutover decisions

The rename deliberately replaces the former installed-state and DOM identifiers:

- `@namespace yomi-ruby.local`;
- `yomi-ruby:auto-origin:<exact location.origin>`;
- generated `yomi-ruby-` classes;
- generated `data-yomi-ruby-` attributes;
- `yomi-ruby-dict-*` Tampermonkey resource names.

There is no compatibility read or migration from the former setting key. Every
origin therefore defaults to off after the cutover until the user explicitly
enables it again. Changing `@namespace` can also cause Tampermonkey to treat the
candidate as a separate script; preventing two simultaneously active copies is
a manual browser gate.

The local project directory is `/Users/wuyi/project/yomi-ruby`, matching the
future GitHub repository slug.

## Verification results

The following commands passed under Node 24.14.0:

- `npm test`: 38 of 38 tests passed, including an identity-cutover regression
  proving that a legacy JRR origin preference is not inherited.
- `npm run test:loader-real`: verified twelve preloaded local dictionary assets
  and the expected kanji readings.
- `npm run test:feasibility`: requested only the twelve in-memory verified
  dictionary paths.
- `npm run test:resource-prototype`: passed twelve Blob-backed local resources
  with no remote runtime URL.
- `npm run build`: generated only `dist/yomi-ruby.user.js`.
- `node scripts/audit-build.mjs`: verified YomiRuby 0.1.4 names, version,
  namespace, setting and DOM prefixes, the single origin menu, twelve exact SRI
  resources, absence of former runtime identifiers, and the existing
  no-unsafe-runtime gates.
- `npm run verify:vendor`: downloaded all twelve pinned unpkg resources and
  matched every manifest byte length and SHA-256 digest.

The annotation and lifecycle behavior is unchanged, but source-level project
identifiers and the twelve manifest resource names changed. Existing lifecycle,
DOM safety, rollback, Katakana Terminator coexistence, integrity, CSP, and
deterministic-build gates all remained green after the cutover.

## Product-scope boundary

YomiRuby is the umbrella product name chosen to allow future reading modules.
Version 0.1.4 does not recognize, translate, romanize, or annotate pure
Katakana. The output model, data source, privacy boundary, settings model, and
coexistence or migration plan for future Katakana support are intentionally
unresolved. Current documentation labels it as a roadmap item rather than an
implemented capability.

## Evidence boundary

This report does not establish that Tampermonkey installed YomiRuby 0.1.4
without leaving the former script active, that the new setting namespace starts
cleanly in the real extension, that Tampermonkey persists the twelve renamed
resources across reloads, or that the candidate works on real x.com. Those
conclusions require separately authorized execution of
`docs/manual-test-plan.md`.
