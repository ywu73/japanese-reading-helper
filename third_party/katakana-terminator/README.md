# Katakana Terminator provenance

This directory preserves the review reference used for YomiRuby's optional
online Katakana-to-English module. It is not a build input or runtime asset.

- Upstream project: https://github.com/Arnie97/katakana-terminator
- Reviewed upstream revision: `dbbff055b41e5fa12886af50b9862d9ae9f307c9`
- Upstream file at that revision: `katakana-terminator.user.js`
- Reviewed reference version: `2022.02.18`
- Local reference SHA-256: `1e671817bf1d1a6bd05353f0dd436ac3f25f7c54bf2d2a8447b3ce0f7b033932`

The local reference is byte-identical to that immutable upstream revision
except for two Greasy Fork `@downloadURL` and `@updateURL` metadata lines
present in the reviewed distribution copy. The executable body is unchanged.

YomiRuby adapts the Katakana matching pattern and Google Translate request
approach. YomiRuby's local kanji-romaji module, verified Kuromoji loading,
privacy-scoped DOM coordinator, viewport scheduling, cancellation, response
validation, reversible lifecycle, and bilingual controls are separate
implementations. See the upstream MIT license in this directory.
