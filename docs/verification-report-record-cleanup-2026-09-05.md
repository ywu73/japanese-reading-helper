# Indexed record cleanup — 2026-09-05

## Delivery state

The preceding native dictionary optimization was committed as `0cf27a9` and
fast-forward merged into local `main`. All 208 tests and the build audit passed on
the merged main. The clean merged worktree was removed, its branch retained, and
the original Chinese user-guide changes were preserved. No remote push, userscript
installation or release was performed.

This round is based on `0cf27a9` in `codex/optimize-record-cleanup`. At initial
verification, the changes and generated userscript remain uncommitted in that
task worktree.

## Bottleneck and change

Both annotation runtimes previously implemented `forget(record)` by iterating
every cached entry and deleting the record from its waiter set. The coordinator
calls this when discarding detached records and when disabling a module. Forgetting
N records with C cached entries therefore visited N × C entries, even when all
entries were already settled and their waiter sets empty.

The new shared `RecordWaiters` helper maintains a `WeakMap` from a record to its
pending entries. Repeated subscriptions are deduplicated. Forgetting a record
touches only its pending entries; a settled record requires only an index lookup.
Settlement removes both directions of each subscription before notifying records,
and disabling/replacing a runtime clears the index with its cache.

Successful and failed results, request deduplication, provider selection, FIFO
ordering and cancellation rules are unchanged. No new dependency, network path,
storage key, tokenizer behavior or Worker was added. The index adds bookkeeping
and one Set per record with pending work; this round did not measure total memory
or initial annotation throughput.

## Reproducible measurement

`work/prototypes/record-cleanup/benchmark.mjs` compares the current source against
the fixed local Git baseline `0cf27a9424236a679b0762163a4dad30de29f90f`. It creates
5,000 distinct text/phrase entries and matching records, exercises both pending
and settled states, and times only the loop calling `forget` for every record.
All waiter sets are checked empty afterward. Adapters are synthetic and never
send requests.

Each case ran three trials per version in interleaved order on Node 24.14.0.
The measured medians were:

| Runtime | State | Baseline ms | Indexed ms |
| --- | --- | ---: | ---: |
| Kanji | Settled | 224.728 | 0.185 |
| Kanji | Pending | 319.392 | 0.589 |
| Katakana | Settled | 177.531 | 0.177 |
| Katakana | Pending | 311.161 | 1.208 |

Raw trials, baseline / indexed in milliseconds:

- Kanji settled: `[180.606, 224.728, 238.405]` / `[0.407, 0.185, 0.126]`.
- Kanji pending: `[309.245, 319.392, 337.639]` / `[1.482, 0.589, 0.533]`.
- Katakana settled: `[177.531, 251.184, 165.311]` / `[0.284, 0.158, 0.177]`.
- Katakana pending: `[311.161, 315.250, 310.901]` / `[1.208, 2.160, 0.793]`.

These are runtime cleanup microbenchmarks, not complete browser disable/removal
times. Setup, DOM traversal/restoration, rendering, analysis, provider latency
and garbage collection are outside the timed loop. Sub-millisecond results and
three trials should not be treated as precise general speedup factors. The
demonstrated improvement is removal of full-cache scans from per-record cleanup.

Run with a supported Node version from the task repository root:

```sh
node work/prototypes/record-cleanup/benchmark.mjs
```

The baseline must remain available in local Git history. The benchmark imports
only the three relevant historical source modules and does not check out a
branch, write a fixture file, install packages or access the network.

## Verification and limits

`npm run check` passed: **214 tests, zero failures, zero skips**, followed by the
real local-loader check, tokenizer feasibility check, verified Blob resource
roundtrip, generated userscript build and build audit.

Six new integration tests exercised:

- DOM deletion of 100 out of 200 pending phrase records. Late results notified
  only the remaining records; all 100 surviving annotations restored correctly.
- Shared kanji subscribers, repeated planning/forgetting, changed record text,
  and reuse of an already cached result without another request.
- Batched kanji results with a forgotten record and surviving peer.
- A multi-phrase katakana record with partial completion, callback reentry into
  planning, subsequent forgetting, and completion of its remaining phrase.
- Reused record objects after kanji mode or katakana provider replacement, late
  old-cycle results, forgetting in the new cycle, and stop/re-enable.

Existing DOM safety, provider, batch-progress, visibility, loader and restoration
tests also passed. Independent read-only review found no concrete issue and
reran 19 cleanup/runtime/batch-progress tests successfully. No actual Chrome + Tampermonkey session or real provider
traffic was exercised in this round. Worker integration and release compatibility
remain outside these results.
