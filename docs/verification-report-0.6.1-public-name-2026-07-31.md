# YomiRuby 0.6.1 public-name verification — 2026-07-31

## Scope

Version 0.6.1 is a metadata-only release candidate that changes the public
userscript name to `日语网页汉字罗马音与片假名英译 ｜ YomiRuby`, keeps the same
Simplified Chinese localized name, and adds the explicit English localized name
`YomiRuby`. It does not change the annotation, persistence, DOM, privacy, or
network runtime implemented by 0.6.0. Greasy Fork requires the localized English
name to have a paired `@description:en`, so that field repeats the canonical
English description.

The candidate was built on branch `codex/rename-public-script-title` from clean
`main` commit `c4f5660bf7e632351b9e3a329e8dd13316584784`.

## Generated artifact

- path: `dist/yomi-ruby.user.js`
- version: `0.6.1`
- size: `240261` bytes
- SHA-256: `d3599f71fe471ca4c346fb47ad6e0241b5c92ae16566faccbe47b29b7e19e87f`

Verified metadata:

```text
@name         日语网页汉字罗马音与片假名英译 ｜ YomiRuby
@name:zh-CN   日语网页汉字罗马音与片假名英译 ｜ YomiRuby
@name:en      YomiRuby
@version      0.6.1
@description:en  Add selectable local or online Kanji Romaji and optional online Katakana English ruby to Japanese web text.
```

## Local verification

- `npm run check`: passed, including 182/182 Node tests, the real local
  Kuromoji loader, feasibility and preloaded-resource prototypes, regeneration,
  and the build audit.
- `npm run verify:vendor`: passed for all 12 pinned `kuromoji@0.1.2` dictionary
  assets by expected byte size and SHA-256.
- `npm run verify:deterministic-build`: passed with byte-identical 240261-byte
  artifacts and the SHA-256 recorded above.

## Evidence boundary

This report does not establish a new desktop Chrome + Tampermonkey installation,
automatic update, extension-background packet capture, or real-site compatibility
result. The 0.6.1 candidate has not yet been committed, merged, pushed, or uploaded
to Greasy Fork. The already public Greasy Fork version remains 0.6.0 until those
separate actions are explicitly authorized and completed.
