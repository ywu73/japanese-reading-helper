# Japanese Reading Helper 0.6.4 verification — 2026-09-30

## Integration scope

Baseline: `main` at `98ce086`. Release code commit: `01acaa59d656cbd56c03a2f4e66134f9aa71137d`.

All previously committed optimization branches are ancestors of this baseline.
Version 0.6.4 retains their changes and integrates the remaining Google request
pacing fix and five integration tests from the uncommitted
`codex/fix-google-request-pacing` worktree. That source worktree and the older
Chinese-guide checkout are preserved.

| Optimization | Included behavior |
| --- | --- |
| Author ruby safety and rollback | Skip unsafe regions; restore original child nodes and event listeners |
| Unmatched text | Preserve source nodes when there is no annotation |
| DOM scheduling | Bounded traversal slices, ancestor checks shared within a slice, blocked-subtree pruning and foreground recovery |
| Online kanji batching | Deduplicate words across up to 32 source records while retaining independent source boundaries and provider payload limits |
| Reading latency and cleanup | Publish validated batches progressively, prioritize visible text, index record subscriptions and bound unused full-text entries |
| Dictionary loading | Use native gzip decompression for verified local assets where supported |
| Google request pacing | Preserve the 250 ms wait across successive runtime operations, including dynamically discovered content |

Each Google feature keeps independent client state. Its first request in a new
enable cycle remains immediate. Cancellation is checked after waiting, so a
late timer cannot dispatch after disable. No endpoint, permission, persistent
setting, dictionary, dependency version, payload selection or fallback rule
changes in this release. Worker feasibility remains a prototype, not a new
production execution path.

## Automated verification

Using Node 24.14.0:

- `npm run check`: **243 passed, 0 failed**, real local Kuromoji loader,
  tokenizer feasibility, preloaded-resource round trips, build and audit.
- Five Google pacing tests cover later runtime operations, cancellation,
  fresh enable cycles and independent feature clients with injected transport.
- `npm run verify:vendor`: all 12 immutable dictionary assets passed length
  and SHA-256 checks against the approved manifest.
- `npm run verify:deterministic-build`: two byte-identical builds.

Artifact: `dist/yomi-ruby.user.js`, version **0.6.4**, **260092 bytes**.
SHA-256: `7ff4e056c1781e214587dafad0b5d6bc3071f1e32b8a83a475671da3a33d7101`.

## Chrome and Tampermonkey exercise

On 2026-09-30, Chrome 153 and Tampermonkey 5.5.0 displayed a normal **Update**
from installed 0.6.3 to 0.6.4. The candidate was served from the repository's
loopback-only server, using the exact generated artifact above. The update was
applied without a same-version reinstall/reset.
The Tampermonkey dashboard subsequently displayed the existing script entry
with version **0.6.4**.

The existing `browser-smoke.html` fixture retains its historical 0.6.3 title;
the installed candidate for this run is 0.6.4.

| Exercise | Observed result |
| --- | --- |
| Initial fixture, both features off | Zero annotations and unchanged markup |
| Enable Local kanji | 11 annotations, including `今日 → kyō`, `東京 → tōkyō`, `食べる → taberu` |
| Reveal hidden/class-hidden/details content | 17 annotations; source projection and Katakana Terminator content preserved |
| Unsafe regions | Zero annotations in hidden or editable/form/code regions |
| Disable and check rollback | Zero annotations, exact markup restored, original author child node and its click listener restored |
| Settings after update and cleanup | Chinese locale, Local kanji, Google katakana; both fixture-origin features off |

The Google interval behavior is covered by deterministic runtime-to-provider
tests; this run did not measure live Google request timing or repeat extension
background network capture. The previous broader synthetic browser and network
evidence is in the [0.6.3 report](verification-report-0.6.3-2026-09-12.md).
These observations do not establish broad real-site compatibility or timed
automatic-update behavior.

## Distribution

The install guide pins the immutable release code commit above. Its userscript
metadata retains the GitHub Raw `main` update URL. Greasy Fork is a separate
publication channel and is not updated by this release workflow.
