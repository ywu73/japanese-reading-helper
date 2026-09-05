# YomiRuby

[简体中文](README.zh-CN.md)

YomiRuby is a privacy-bounded Tampermonkey reading aid for Japanese web pages.
It adds romaji above words containing kanji through a selected Local, Google,
or Bing mode and can add best-effort English ruby above matched katakana
phrases through a separately selected online provider.

**Version 0.6.0 is a locally verified release candidate. It has not yet passed
the required desktop Chrome + Tampermonkey installation, extension-background
network capture, update, real-site, or publication gates.**

## Features

### Selectable Kanji Romaji

- Remains off for every unconfigured exact origin.
- Provides an independent global `google | bing | local` mode. Existing
  installations without that setting migrate to Local so an update cannot
  silently disclose kanji.
- Local runs pinned `kuromoji@0.1.2` in the page and uses modified Hepburn with
  macrons. The transitional 0.6.0 build still preloads all twelve dictionaries.
- Google/Bing use local `Intl.Segmenter` word boundaries and send only complete,
  deduplicated words containing kanji. Google uses bounded `🧩`-joined batches
  with strict positional gates and an exact single-word fallback; Bing uses
  bounded newline batches with both source-echo and transliteration alignment.
  They never send a complete sentence, surrounding context, title, URL,
  origin, or history.
- Online modes accept only a strict source-owned romanization/transliteration
  field. They never use ordinary English translation as romaji and never fall
  back to another provider or Local after failure.
- Online results are displayed as returned and are experimental best-effort
  readings, not verified modified Hepburn.

### Optional Online Katakana English

- Starts only after you enable it for the exact current origin.
- While the tab is foregrounded, scans all safe body text and sends only exact,
  matched, deduplicated katakana phrases to the selected Google or Bing no-key
  web endpoint. Dynamic safe text joins the same stable FIFO; there is no
  per-page candidate cap.
- Both katakana providers preserve FIFO order and batch at most 50 phrases with
  an encoded candidate-payload budget of 1800 characters, a minimum 250 ms
  inter-batch interval, and an 8-second timeout. Google uses newline-joined `q`;
  Bing uses a newline-joined `text` form body.
- Displays each validated katakana batch as it completes. A later batch failure
  preserves annotations from earlier successful batches.
- Defaults once to Bing for the Simplified-Chinese interface and Google for
  every other interface locale; a saved or manually selected provider wins.
- Never silently falls back across providers. A failure preserves source text
  instead of resending the phrase elsewhere.
- Keeps individual failures silent and leaves the source unchanged when a
  response is missing, ambiguous, invalid, or unsuitable.
- Is experimental, best-effort, and not a promise of availability, accuracy,
  or recovery of a word's English origin.

## Installation status

The planned sole install and automatic-update URL is:

<https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js>

Do not treat that URL as a released stable build until the 0.6.0 browser and
publication gates are recorded as complete. The supported compatibility target
for the first public release is **desktop Google Chrome with Tampermonkey**.
Other browsers and userscript managers are unverified and receive no
compatibility promise.

YomiRuby matches ordinary HTTP and HTTPS pages and uses `@noframes`. All-sites
matching is required so you can choose to enable YomiRuby on any site. It does
not mean either feature starts everywhere: **both features are off for every
unconfigured exact origin**.

## Controls and language

YomiRuby registers five Tampermonkey menu commands in a stable order: Kanji,
Kanji Mode, Katakana, Katakana Translator, Language. Normal enable, disable,
startup, mode-switch, provider-switch, and language-switch paths
do not create consent dialogs, loading banners, or success banners. Temporary
non-modal notices are reserved for actionable failures such as a setting write
failure or safe startup failure.

The Kanji Mode and Katakana Translator commands show both the currently saved
selection and the next selection. A menu does not display a requested setting
until its independent persistence operation succeeds. A failed write keeps the
old menu and old runtime. If the saved new selection cannot start, the selection
remains saved, only that feature stops, and one temporary error is shown.

The interface supports English and Simplified Chinese. On first run only,
YomiRuby maps a primary browser language beginning with `zh` to Simplified
Chinese and everything else to English, then stores the choice globally. A
manual language switch permanently overrides that initial detection. Switching
language does not enable or disable a feature, rescan text, load Kuromoji, or
send a translation request. It immediately reorders the next Kanji Mode action
without changing the selected mode. If no valid provider setting exists, the resolved
interface locale is used once (`zh` -> Bing; everything else -> Google) and the
result is stored. Later language changes never overwrite the provider.

Persistent settings are limited to:

- `yomi-ruby:locale = "en" | "zh"` globally;
- `yomi-ruby:kanji-romaji-mode = "google" | "bing" | "local"` globally;
- `yomi-ruby:translation-provider = "bing" | "google"` globally;
- `yomi-ruby:auto-origin:<origin>` for Kanji Romaji activation;
- `yomi-ruby:katakana-origin:<origin>` for Online Katakana English.

No reading, phrase, translation, match, failure, queue, or request state is
persisted.

## Privacy and network disclosure

| Network party | When it may be contacted | Purpose and data |
|---|---|---|
| GitHub Raw | Userscript install and automatic update | Downloads the userscript artifact; normal server request metadata applies. |
| unpkg | Tampermonkey install and update of fixed resources | Downloads twelve immutable `kuromoji@0.1.2` dictionary resources pinned by URL, size, and SHA-256. Page text is not part of these requests. |
| Google Translate | Only while an exact-origin online feature is enabled and Google is selected | Katakana sends bounded matched phrases in `q`; Kanji mode sends bounded `🧩`-joined complete-word batches in `q`, requires an aligned `dt=rm` result, and falls back only to exact single-word requests on batch failure. |
| Bing Translator | Only while an exact-origin online feature is enabled and Bing is selected | An anonymous GET parses temporary configuration without executing page script. Katakana sends bounded newline-joined exact-phrase batches with `ja -> en`; Kanji mode sends bounded newline-joined complete-word batches with `ja -> ja`. Both validate positional alignment, and Kanji accepts only an independent `inputTransliteration`. |

Neither online Kanji provider request includes surrounding sentences or text
nodes, and neither online feature sends page titles, page URLs, origins, or
browsing history. Google places submitted words or phrase batches in a URL query, so they may appear in browser, extension, network
appliance, proxy, or service-side logs. Bing puts each bounded phrase batch in a
POST form body, which still discloses it to the browser extension, network path,
and Bing.

YomiRuby has no project-owned analytics, telemetry, crash reporting, remote
logging, tracking identifier, install callback, or silent cross-provider
fallback. The only allowed translation routes are:

```text
https://translate.googleapis.com/translate_a/single
https://www.bing.com/translator
https://www.bing.com/ttranslatev3
https://cn.bing.com/translator
https://cn.bing.com/ttranslatev3
```

The Google and Bing web endpoints are undocumented, non-contractual,
best-effort interfaces. Availability, regional reachability, rate limits,
response shape, correctness, and continued no-key access are not guaranteed.

See [Security and privacy boundary](docs/security-boundary.md), [Network audit](docs/network-audit.md), and [Security reporting](SECURITY.md).

## DOM and lifecycle safety

- Generated classes and attributes use the `yomi-ruby-` /
  `data-yomi-ruby-` prefix.
- Scripts, styles, forms, editable areas, code, hidden content, existing ruby,
  SVG/MathML, media, and YomiRuby-owned UI are skipped.
- Existing author ruby and Katakana Terminator annotations are preserved.
- A page coordinator prevents nested or overlapping generated ruby and restores
  source text when annotation is disabled.
- Kanji and Katakana use separate deep runtimes with independent adapters,
  exact-candidate caches, FIFO queues, abort controllers, generations, Bing
  temporary configuration, and setting lifecycles. They may contact the same
  selected provider concurrently; no mutable request state is shared.
- The DOM coordinator is the sole ruby owner. It uses an event-driven roughly
  500 ms mutation window and cooperative chunks, with no permanent interval.
  A separate viewport scheduler prioritizes text whose parent is within the
  viewport or its 300 px margin. When foreground requests settle, offscreen text
  is processed in groups of up to 32 records; it remains eligible even if
  never scrolled into view. Without viewport observation, ordinary ordered
  scanning is used. Hidden tabs start no new work; becoming visible triggers a
  rescan of the currently connected DOM.
- Queued work and observers stop on disable; stale or aborted asynchronous
  results cannot re-annotate the page.

## Katakana Terminator acknowledgement

YomiRuby's optional online Katakana-to-English module is based on Katakana
Terminator by Arnie97 and the Katakana Terminator Contributors. It adapts
Katakana Terminator's Katakana matching pattern and Google Translate request
approach. YomiRuby's selectable kanji-romaji modes, verified Kuromoji loading,
Google/Bing source-romaji clients, independent deep runtimes, foreground whole-
page scheduling, cancellation, response validation, reversible lifecycle, and
bilingual controls are separate implementations. Katakana Terminator is
licensed under the MIT License.

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
version 0.6.0.
