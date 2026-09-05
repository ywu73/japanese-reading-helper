# Reading latency verification — 2026-09-05

## Baseline and scope

The first performance round was committed as
`a52c2c59c579615958c9423e1220b45238ea4d13` and fast-forwarded into local `main`.
After merging, all 193 tests and the build audit passed on `main`. The first
task worktree was removed after checking it was clean; its branch was retained.
The original working directory and its uncommitted Chinese guide and images
were preserved.

This second round starts at that commit on `codex/optimize-reading-latency`.
It changes partial-result delivery and viewport priority. Worker-based local
dictionary analysis, installation, publication, and remote updates are outside
this round.

## Behavior

- Google and Bing katakana clients notify the runtime after each validated
  batch. The runtime publishes that batch immediately. If a later request
  fails, earlier successful annotations remain; only pending phrases fail.
  The clients retain their payload bounds, validation, retry, and provider
  isolation. The final Promise/Map interface remains available.
- A separate `ViewportScheduler` tracks deferred source records by parent
  element. Parents inside the viewport plus a 300 px margin get foreground
  priority. Intersection observations promote newly visible deferred records.
  Missing observation support or zero-size parent geometry uses ordinary
  scanning instead of indefinitely delaying text.
- Foreground work and scanning precede background records. After pending
  runtime work settles, background records are admitted in groups of up to
  32, also subject to the existing per-slice traversal and time budgets. This
  matches the kanji batching window and avoids needlessly fragmenting requests.
  Offscreen content is eventually processed even without scrolling.
- Runtime idle notifications wake background work even if all affected DOM
  records were removed and no plan-change notification can be delivered. There
  is no polling loop. Priority applies before dispatch and does not preempt an
  already running request or batch.
- Deferred records are checked again for current ownership and safe text
  before dispatch. Edits, reparenting, removed nodes, shared observation targets,
  hidden tabs, and late callbacks are covered by regression tests. Stopping
  disconnects viewport observations and clears pending records.

## Automated verification

Used the existing Node.js 24.14.0 runtime and existing project dependencies.

- `npm test`: **202 passed, 0 failed, 0 skipped**.
- Nine added tests cover early Google rendering followed by failure; Bing
  progress followed by a bounded 401 refresh and failure; stale translator
  progress/final results; shared viewport targets; geometry/observer fallback;
  visible priority and eventual completion; queued DOM changes; hidden tabs;
  and bounded local background processing.
- `npm run build` and `node scripts/audit-build.mjs`: passed. Generated
  `dist/yomi-ruby.user.js` from source; version remains 0.6.1 pending release work.
- `npm run test:loader-real`: passed, verifying the twelve local dictionary
  resources and expected readings.
- `git diff --check`: passed.

An independent read-only review found no blocking issue in the second-round
implementation. It independently ran the eight new reading-latency tests and
the three session tests successfully. Provider parsing and failure behavior
also remain covered by the full existing suite.

## Browser comparison

Ran baseline `main` source modules and candidate source modules in separate
frames in the Codex in-app browser, served from `127.0.0.1`. No real translation
service was contacted.

Viewport scenario: 96 paragraphs appear earlier in DOM order but are positioned
far below the viewport; the last paragraph is fixed near its top. An in-page
batch analyzer waits 120 ms per operation and produces a synthetic annotation
for each exact input node. Both versions ultimately annotate all 97 paragraphs.

Streaming scenario: two katakana phrases, with a one-phrase client batch limit
and a zero inter-batch interval for this fixture only. A mock GM adapter returns
valid Google-format responses after 120 ms for the first request and 700 ms for
the second. Production request limits and intervals were not changed.

One observed run (milliseconds):

| Scenario / measurement | First-round baseline | Second-round candidate |
| --- | ---: | ---: |
| Viewport: near-screen paragraph annotated | 525 | 162 |
| Viewport: all 97 paragraphs annotated | 525 | 565 |
| Viewport: analyzer operations | 4 | 4 |
| Streaming: first phrase annotated | 847 | 154 |
| Streaming: both phrases annotated | 848 | 858 |
| Streaming: mock GM requests | 2 | 2 |

Both scenarios restored the exact original fixture markup on stop. Earlier
readability improved in this run; total completion time did not improve and
was slightly higher. The table is a single synthetic browser observation,
not a real-provider benchmark or a general speedup guarantee. Source-module
execution does not verify Tampermonkey isolation or real-site compatibility.

At the end of this round, the second-round changes are uncommitted on their
task branch. Local `main` contains only the merged first-round commit. No push,
userscript installation, or release was performed.
