# Annotation performance verification — 2026-09-05

Baseline: `c4984843f97b96163cc3097b4b7f03001878212a` (YomiRuby 0.6.1).
Candidate branch: `codex/optimize-annotation-speed`.

## Changes

- Filter text by the enabled feature before computed-style checks and analysis.
  Kanji runtime also skips text without Han characters. Empty annotation plans
  preserve the original text node; stopping does not normalize unrelated DOM.
- Collect and process DOM incrementally, with at most 100 visited nodes per
  slice and an 8 ms cooperative time budget checked between nodes. Individual
  synchronous operations can exceed that budget. Cache ancestor safety checks
  only within a synchronous slice and invalidate them after annotation writes.
  Coalesce overlapping pending roots. Resume safely if the saved traversal
  cursor is removed or reordered while a scan is yielded.
- Collect up to 32 queued source nodes per online kanji operation. Segment each
  node independently, deduplicate exact candidate words across the group, and
  retain the existing provider payload limits, parsing, and request scheduling.
  Local analysis stays synchronous. Pause, cancellation, mode replacement, and
  stale completion remain scoped to the owning runtime.

## Automated verification

Runtime: existing Node.js 24.14.0. The system Node.js 20.9.0 does not satisfy
the project's engine constraint and cannot load its current jsdom dependency.

- `npm test`: **193 passed, 0 failed, 0 skipped** (including 11 new performance
  and lifecycle regression tests).
- `npm run test:loader-real`: passed; verified all 12 local dictionary assets
  and the expected Japanese readings.
- `npm run test:feasibility`: passed.
- `npm run test:resource-prototype`: passed; 12 verified Blob assets with dynamic
  evaluation blocked and no remote runtime URL.
- `npm run build` and `node scripts/audit-build.mjs`: passed. The userscript was
  regenerated from source; metadata, allowed requests, SRI resources, and
  embedded license checks passed. Version remains 0.6.1 pending release work.
- `git diff --check`: passed.

Fixed-fixture regressions establish that 100 plain English nodes cause zero
style queries, zero runtime plan calls, and zero text-node replacements. In a
single slice, 100 Japanese text nodes under `main > section > p > span` require
204 style queries (one per distinct element/ancestor), with no replacement for
pending or empty results. Ten distinct kanji nodes share one word operation.
Seventy queued nodes are processed as 32/32/6; failures and shared words are
cached within the enable cycle.

Additional checks cover scan cancellation, elapsed-time yielding even when the
idle callback times out, cursor removal and same-root reordering, visibility
changes between slices, characterData changes after candidate filtering,
author ruby restoration, Katakana Terminator coexistence, pause timing, and
late results from an earlier enable cycle.

## Browser comparison

Ran source modules in two isolated frames in the Codex in-app browser, served
only from `127.0.0.1`. Both used 100 English paragraphs followed by ten distinct
kanji paragraphs: 東京, 大阪, 京都, 学校, 先生, 学生, 電車, 新聞, 時間, 世界.
The coordinator used its default scheduling settings. The word provider was
an in-page mock with a fixed 120 ms wait per operation and returned `sample`
for every candidate. There was no translation-service request.

One observed run:

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Word-provider operations | 10 | 1 |
| `getComputedStyle` calls | 1320 | 13 |
| Nodes added inside the fixture before stop | 120 | 10 |
| Nodes removed inside the fixture before stop | 120 | 10 |
| Completed kanji annotations | 10 | 10 |
| Time from enable to all ten annotations | 1293 ms | 163 ms |
| Original English text nodes retained | No | Yes |
| Original fixture markup restored after stop | Yes | Yes |

Timing includes browser scheduling and a deliberately synthetic service delay;
it is not a real-provider benchmark or a general speedup guarantee. Browser
source-module execution does not verify Tampermonkey installation, extension
isolation, or real-site compatibility. Those checks remain required before a
release or a claim of real-site performance. No userscript installation,
publication, commit, merge, or push was performed for this candidate.
