# AGENTS.md

## 1. Project Scope

YomiRuby is a privacy-bounded Tampermonkey reading aid. Its current implemented
module displays Hepburn romaji above Japanese words containing kanji; planned
Katakana support is not yet an implemented or verified capability.

The project inherits the global collaboration rules from
`/Users/wuyi/.codex/AGENTS.md`. This file adds only project-specific rules.

## 2. Product Boundaries

- Analyze page text locally in the browser.
- Never send page text, readings, page titles, or browsing history to a remote
  translation, reading, AI, analytics, or logging service.
- Remote access is limited to explicitly approved, immutable program and
  dictionary assets.
- Pin every executable dependency to an exact version and a verified SHA-256
  digest before it can be loaded dynamically.
- If safe lazy loading cannot be verified in Tampermonkey, stop and report the
  limitation. Do not silently fall back to unverified execution, global eager
  loading, or a remote reading API.
- Annotate only tokens that contain kanji by default.
- Use whole-token readings for kanji-kana mixed words.
- Use Hepburn romaji with macrons by default, such as `kyō` and `Tōkyō`.
- If the analyzer does not provide a reliable reading, leave the source text
  unchanged. Do not guess from individual kanji.
- Keep reading caches in page memory only. Persistent storage is limited to
  explicit per-origin user settings.

## 3. DOM Safety

- Preserve the original page structure and behavior as far as the userscript
  surface allows.
- Every DOM mutation must be attributable to this project and reversible.
- Use a unique `yomi-ruby-` / `data-yomi-ruby-` prefix for generated classes and attributes.
- Skip scripts, styles, forms, editable regions, code blocks, hidden content,
  and other unsafe or irrelevant nodes.
- Preserve Katakana Terminator annotations. Never overwrite or nest inside
  `rt.katakana-terminator-rt` or equivalent English annotations.
- Existing kana ruby readings may be converted to romaji only when their
  original content is retained and can be restored exactly.
- Dynamic-page observers and queued work must stop when annotation is disabled.

## 4. Architecture and Source Layout

- Treat `src/` as the source of truth.
- Treat `dist/` as generated, installable output; do not hand-edit built files.
- Keep dependency acquisition and digest verification under `scripts/` and
  record approved assets in `vendor/manifest.json` when that manifest is added.
- Keep deterministic DOM fixtures under `tests/fixtures/`.
- Keep temporary feasibility experiments under `work/prototypes/` until their
  behavior is understood and either promoted or removed.
- Record security decisions and verified network behavior under `docs/`.

## 5. Verification Gates

Before a userscript build is considered deliverable, verify at minimum:

- dependency versions, licenses, URLs, and SHA-256 digests;
- lazy loading in the supported Tampermonkey environment;
- absence of page text in outbound requests;
- ordinary kanji, kanji-kana mixed words, macrons, and unknown readings;
- existing kana ruby conversion and complete restoration;
- coexistence with Katakana Terminator annotations;
- forms, editable regions, code, links, hidden content, and nested markup;
- MutationObserver and IntersectionObserver behavior on dynamic content;
- repeated enable, disable, cancel, and rollback cycles;
- graceful behavior when assets, dictionaries, or integrity checks fail.

Do not claim browser compatibility, accuracy, performance, privacy, or complete
rollback until the relevant behavior has been exercised and recorded.

## 6. Git and External Changes

- Preserve unrelated local changes.
- Inspect `git status`, the current branch, and the complete diff before staging.
- Do not add, commit, push, create a remote repository, publish a release, or
  install the userscript without the user's explicit approval for that action.
- Keep commits focused by concern when commits are later authorized.
