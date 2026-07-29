# YomiRuby 0.5.0 local verification report — 2026-07-27

## Scope and fixed point

This report records local evidence for the transitional YomiRuby 0.5.0 kanji
romaji modes. The fixed Git baseline is:

```text
9b4d0f4b2fe9d028c21c7642532f54d2a0518d67
```

At verification time, local `HEAD` and the local `origin/main` tracking ref both
equaled that baseline. The working tree was intentionally mixed and uncommitted:
it already contained the 0.4.1 Bing katakana compatibility repair and Google
live-probe documentation before the 0.5.0 implementation was added. This report
does not assign every working-tree file to one future commit.

No Git write, branch, stage, commit, push, tag, pull request, release,
Tampermonkey installation, Chrome operation, real-site operation, or publication
was performed for this verification.

## Implemented 0.5.0 transition

- Added an independent global
  `yomi-ruby:kanji-romaji-mode = "google" | "bing" | "local"` setting.
- Fresh installs derive the initial online mode from the primary language;
  upgrades with existing settings but no mode key migrate to Local. Invalid or
  uncertain storage state fails toward Local.
- Kept exact-origin kanji activation default-off and independent from the
  katakana provider and feature boolean.
- Added Google `dt=rm` and Bing `ja -> ja + inputTransliteration` kanji clients.
  Each client receives one complete candidate word per request and fails closed
  on source mismatch, ambiguous fields, unsafe romaji, transport failure, or
  cancellation. Neither client falls back to the other provider or Local.
- Added local `Intl.Segmenter("ja", { granularity: "word" })` candidate
  extraction, exact-offset validation, and page-memory success/failure/pending
  caches. Complete text nodes, sentences, and surrounding context are not passed
  to the remote clients.
- Added asynchronous kanji coordination with generation invalidation, abort,
  late-result rejection, source/ownership checks, rollback, and no placeholder
  ruby while an online reading is pending.
- Added independent session factories for Local, Google, and Bing. Online mode
  does not load Kuromoji; Local continues to use the verified preloaded loader.
- Added the five-menu order Kanji, Kanji Mode, Katakana, Katakana Translator,
  Language. Chinese cycles `bing -> local -> google`; English cycles
  `google -> local -> bing`. Language changes immediately reorder the next
  kanji-mode action without changing the current mode.
- Added independent remote value-change listeners for kanji mode and katakana
  provider, with no listener write-back loop and a disposal path.
- Added the two required listener grants without adding a network host or
  endpoint.
- Deliberately retained all twelve preloaded `kuromoji@0.1.2` dictionary
  resources. The proposed roughly 17 MiB lazy Tampermonkey cache is not part of
  0.5.0 and was not implemented or claimed.

## TDD seams and red/green evidence

The implementation was exercised through the agreed public seams:

| Seam | Observable behavior locked by tests |
|---|---|
| Settings | Fresh defaults, privacy-preserving upgrade migration, enum validation, independent provider/mode storage, and read/write failures. |
| Google kanji client | Exact one-word URL, `dt=rm`, source reconstruction, unique romaji ownership, strict character validation, serialization, abort, and no translation substitution. |
| Bing kanji client | Strict initialization/redirect boundary, `ja -> ja`, exact source echo, unique Latin transliteration, one 401 refresh, 429/CAPTCHA failure, abort, and no fallback. |
| Online analyzer | Complete local word segmentation, exact offsets, no context disclosure, page-only success/failure cache, shared pending request, and cancellation. |
| Coordinator | No pending placeholder, async rendering, generation invalidation, source/DOM ownership checks, late-result rejection, and rollback. |
| Session | Local-versus-online factory selection, no Local load in online mode, active replacement cancellation, disabled-mode inertness, and failed startup behavior. |
| Controls/i18n | Five-menu order, language-dependent next mode, persistence-before-replacement, independent remote listeners, localized failure, and listener disposal. |
| Generated artifact | Exact 0.5.0 metadata, grants, storage keys, five menu order, fixed routes, five request call sites, `Intl.Segmenter`, preloaded SRI resources, and prohibited capabilities. |

Each production seam was introduced through a failing public-interface test and
then made green with a minimal implementation. During this closeout, the stale
0.4.1 build audit first failed on the 0.5.0 package version, then exposed the
new storage ordering and generated Bing form shape before the updated 0.5.0
assertions passed. No private method was tested directly; external request,
storage, time, DOM parser, and browser capability boundaries were injected.

## Executed verification

Environment:

```text
Node.js v24.14.0
npm 11.9.0
```

### Complete local quality gate

Command:

```text
npm run check
```

Result: **PASS**.

- Node unit/integration tests: **162 passed, 0 failed, 0 skipped**.
- Real local loader: **12 preloaded local assets verified**; observed readings
  included `今日:kyō`, `東京:tōkyō`, `日本語:nihongo`, `勉強:benkyō`,
  `食べる:taberu`, `方法:hōhō`, and `思う:omou`.
- Kuromoji feasibility fixture: **PASS** with 12 verified dictionary assets.
- Preloaded-resource round trip: **PASS** with 12 verified Blob assets and no
  remote runtime dictionary URL.
- Build: **PASS**.
- Static build audit: **PASS** for 0.5.0 metadata, five bilingual controls,
  independent kanji/provider settings, strict Google/Bing source-romaji
  boundaries, 12 preloaded SRI resources, five audited GM request paths, and
  embedded canonical licenses/notices.

An earlier standalone `npm test` in the same closeout also passed **162/162**.

### Fresh vendor verification

Command:

```text
npm run verify:vendor
```

Result: **PASS**. All **12** exact `kuromoji@0.1.2` dictionary URLs were
downloaded afresh from unpkg and matched the recorded byte length and SHA-256.
No vendor version, URL, size, or digest changed.

### Deterministic build and artifact identity

Command:

```text
npm run verify:deterministic-build
```

Result: **PASS**. Two generated artifacts were byte-identical.

```text
path    = dist/yomi-ruby.user.js
size    = 227596 bytes
sha256  = 3a694c3f8c1e87b0b909db65c8fc15f1fcbde3dcb34514616964cd00c3a0373b
```

Independent `wc -c` and `shasum -a 256` commands returned the same values.

### Working-tree checks

```text
git diff --check
```

Result: **PASS**, including this report and the final documentation edits.

A bounded credential/endpoint scan found no product API key, authorization
header, Azure route, `/ttransliteratev3`, analytics, telemetry, or product
User-Agent spoofing. The expected custom User-Agent remains confined to the
vendor-verifier script; documentation also records the throwaway CLI probe's
User-Agent limitation. Product network strings remain limited to Google
`translate_a/single`, Bing translator initialization, same-origin
`/ttranslatev3`, and the twelve fixed build-time resource URLs.

## Evidence boundaries and remaining gates

The following were **not executed** and remain open:

- desktop Chrome + Tampermonkey installation or upgrade;
- real `GM_addValueChangeListener` behavior across installed userscript tabs;
- extension-background capture of Google/Bing online-kanji requests;
- proof that real installed requests are anonymous/Cookie-free and preserve the
  intended redirect behavior;
- real-site or x.com DOM, observer, performance, coexistence, and rollback runs;
- mainland-China no-proxy reachability;
- reading accuracy, availability, rate-limit stability, or long-term response
  compatibility for the undocumented Google/Bing web endpoints;
- real Tampermonkey lazy dictionary storage, corruption recovery, deletion, or
  cross-refresh behavior, because 0.5.0 intentionally keeps preloading;
- Git staging, commit, push, tag, GitHub Release, checksum publication, or
  userscript publication.

Therefore, the correct closeout is **local implementation and quality gates
PASS; browser, installed-extension privacy, online accuracy/performance,
complete rollback, and publication remain unverified**. This report is not a
production GO or browser compatibility claim.
