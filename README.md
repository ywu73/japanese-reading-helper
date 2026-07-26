# YomiRuby

[简体中文](README.zh-CN.md)

YomiRuby is a privacy-bounded Tampermonkey reading aid for Japanese web pages.
It adds local Hepburn romaji above reliable words containing kanji and can add
best-effort English ruby above matched katakana phrases through an optional
online feature.

**Version 0.3.0 is a locally verified release candidate. It has not yet passed
the required desktop Chrome + Tampermonkey installation, extension-background
network capture, update, real-site, or publication gates.**

## Features

### Local Kanji Romaji

- Runs the pinned `kuromoji@0.1.2` analyzer locally in the page.
- Annotates only tokens containing kanji when a reliable whole-token reading is
  available.
- Uses modified Hepburn with macrons, such as `kyō` and `Tōkyō`.
- Leaves the source unchanged instead of guessing when a reliable reading is
  unavailable.

### Optional Online Katakana English

- Starts only after you enable it for the exact current origin.
- Sends only matched, deduplicated katakana phrases near the viewport to the
  fixed Google Translate no-key endpoint.
- Keeps individual failures silent and leaves the source unchanged when a
  response is missing, ambiguous, invalid, or unsuitable.
- Is experimental, best-effort, and not a promise of availability, accuracy,
  or recovery of a word's English origin.

## Installation status

The planned sole install and automatic-update URL is:

<https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js>

Do not treat that URL as a released stable build until the 0.3.0 browser and
publication gates are recorded as complete. The supported compatibility target
for the first public release is **desktop Google Chrome with Tampermonkey**.
Other browsers and userscript managers are unverified and receive no
compatibility promise.

YomiRuby matches ordinary HTTP and HTTPS pages and uses `@noframes`. All-sites
matching is required so you can choose to enable YomiRuby on any site. It does
not mean either feature starts everywhere: **both features are off for every
unconfigured exact origin**.

## Controls and language

YomiRuby registers three Tampermonkey menu commands in a stable order: Kanji,
Katakana, Language. Normal enable, disable, startup, and language-switch paths
do not create consent dialogs, loading banners, or success banners. Temporary
non-modal notices are reserved for actionable failures such as a setting write
failure or safe startup failure.

The interface supports English and Simplified Chinese. On first run only,
YomiRuby maps a primary browser language beginning with `zh` to Simplified
Chinese and everything else to English, then stores the choice globally. A
manual language switch permanently overrides that initial detection. Switching
language does not enable or disable a feature, rescan text, load Kuromoji, or
send a translation request.

Persistent settings are limited to:

- `yomi-ruby:locale = "en" | "zh"` globally;
- `yomi-ruby:auto-origin:<origin>` for Local Kanji Romaji;
- `yomi-ruby:katakana-origin:<origin>` for Online Katakana English.

No reading, phrase, translation, match, failure, queue, or request state is
persisted.

## Privacy and network disclosure

| Network party | When it may be contacted | Purpose and data |
|---|---|---|
| GitHub Raw | Userscript install and automatic update | Downloads the userscript artifact; normal server request metadata applies. |
| unpkg | Tampermonkey install and update of fixed resources | Downloads twelve immutable `kuromoji@0.1.2` dictionary resources pinned by URL, size, and SHA-256. Page text is not part of these requests. |
| Google Translate | Only after Online Katakana English is enabled for the exact current origin and a safe text node contains a matched phrase near the viewport | A GET request sends matched, deduplicated katakana phrases in the `q` query parameter. |

The Google request does **not** intentionally include surrounding sentences,
kanji, hiragana, page titles, page URLs, origins, or browsing history. Because
the phrases are present in a URL query, they may appear in browser, extension,
network appliance, proxy, or service-side logs.

YomiRuby has no project-owned analytics, telemetry, crash reporting, remote
logging, tracking identifier, install callback, second translation provider,
or silent remote fallback. The only allowed translation endpoint is:

```text
https://translate.googleapis.com/translate_a/single
```

See [Security and privacy boundary](docs/security-boundary.md), [Network audit](docs/network-audit.md), and [Security reporting](SECURITY.md).

## DOM and lifecycle safety

- Generated classes and attributes use the `yomi-ruby-` /
  `data-yomi-ruby-` prefix.
- Scripts, styles, forms, editable areas, code, hidden content, existing ruby,
  SVG/MathML, media, and YomiRuby-owned UI are skipped.
- Existing author ruby and Katakana Terminator annotations are preserved.
- A page coordinator prevents nested or overlapping generated ruby and restores
  source text when annotation is disabled.
- Queued work and observers stop on disable; stale or aborted asynchronous
  results cannot re-annotate the page.

## Katakana Terminator acknowledgement

YomiRuby's optional online Katakana-to-English module is based on Katakana
Terminator by Arnie97 and the Katakana Terminator Contributors. It adapts
Katakana Terminator's Katakana matching pattern and Google Translate request
approach. YomiRuby's local kanji-romaji module, verified Kuromoji loading,
privacy-scoped DOM coordinator, viewport scheduling, cancellation, response
validation, reversible lifecycle, and bilingual controls are separate
implementations. Katakana Terminator is licensed under the MIT License.

The reviewed reference and immutable-revision record are retained under
[`third_party/katakana-terminator/`](third_party/katakana-terminator/README.md).

## Development and verification

Use the Node version in `.nvmrc`, then install exact locked dependencies:

```bash
npm ci
npm test
npm run check
npm run verify:vendor
npm run verify:deterministic-build
```

`src/` is the source of truth. `dist/yomi-ruby.user.js` is generated only by
`scripts/build.mjs` and must not be hand-edited. The build embeds canonical
YomiRuby and third-party license/NOTICE text and is audited for version,
metadata, storage scope, request paths, prohibited capabilities, resources, and
legal material.

Local Node/jsdom evidence does not prove real Chrome/Tampermonkey behavior,
extension-background privacy, install/update behavior, performance, accuracy,
or complete browser rollback. See the [manual browser test plan](docs/manual-test-plan.md) and the versioned verification reports under `docs/`.

## Contributing, security, and license

Ordinary bugs and feature discussions use GitHub Issues. Security or privacy
vulnerabilities must use GitHub Private Vulnerability Reporting; do not publish
sensitive details in a public Issue. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).

YomiRuby-owned code and contributions are licensed under the [MIT License](LICENSE).
Third-party license and provenance material is recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No CLA or DCO is required for
version 0.3.0.
