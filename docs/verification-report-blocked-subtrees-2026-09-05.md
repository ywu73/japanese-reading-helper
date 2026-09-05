# Skip excluded DOM subtrees — 2026-09-05

## Delivery state

The preceding record-cleanup optimization was committed as `5888690` and
fast-forward merged into local `main`. The merged main passed 214 tests and the
build audit. Its clean task worktree was removed and its branch retained. The
original Chinese user-guide changes remain untouched. No push, installation or
release was performed.

This round is based on `5888690` in `codex/optimize-dom-scanning`. At initial
verification, its source, tests, report and generated userscript remain
uncommitted in the task worktree.

## Change and boundaries

The cooperative scanner previously walked every element and text node inside
code blocks, forms and other containers that the existing DOM rules forbid from
receiving annotations. Such nodes consumed scan slices even though text-node
checks ultimately rejected them.

The scanner now shares the existing blocked-tag predicate with text-node safety
checks and skips those subtrees using TreeWalker sibling/parent traversal. It
stops at the scan root. Roots arriving inside excluded containers are rejected;
each job's ancestor path is checked again once per slice to account for movement
during a yield. No style or hidden-state cache was extended across slices.

Author RUBY elements remain traversable so that nested and dynamically inserted
readings can still convert. Their base text remains excluded by the existing
text-node rules, and RT/RP contents are pruned. Existing kana ruby conversion and
restoration, as well as Katakana Terminator preservation, remain tested. Ruby
inside code/form containers stays unchanged, including direct dynamic insertion.

The change does not add providers, executable assets, dependencies, permissions,
storage, or Workers. It does not optimize analysis, translation or rendering.

## Browser comparison

The fixture compares the final source with local Git baseline
`5888690618d8d495a06c6da186a6d16c8660f140` in an ordinary Codex in-app browser
page, with a synthetic no-op analyzer. Both versions must discover exactly the
same safe Japanese paragraph and leave all 10,000 fixture spans intact.

There are two workloads: 10,000 Japanese spans inside PRE followed by a safe
paragraph, and 10,000 ordinary English spans followed by the same paragraph.
Each case ran three trials per version in interleaved order. Fixture creation
and initial layout occur before timing. The timer measures synchronous draining
of scheduled scan callbacks with a 100-visit slice limit and controlled clock;
it excludes actual idle-callback waiting, initial page layout, provider traffic,
annotation rendering and userscript initialization. MutationObserver is disabled
for measurement; mutation behavior is separately covered by integration tests.

Final medians and stable traversal/slice counts:

| Page | Baseline ms | Updated ms | Traversal calls before → after | Scan slices before → after |
| --- | ---: | ---: | ---: | ---: |
| Code-heavy | 16.5 | 0.3 | 20,010 → 9 | 201 → 1 |
| English control | 4.3 | 4.9 | 20,009 → 20,008 | 201 → 201 |

Raw elapsed milliseconds:

- Code-heavy baseline `[14.6, 17.2, 16.5]`, updated `[0.7, 0.3, 0.2]`.
- English baseline `[4.3, 3.9, 4.5]`, updated `[5.2, 4.9, 4.6]`.

Traversal calls count `nextNode`, `nextSibling` and `parentNode` calls, not all
browser-internal operations. The benchmark page's small result PRE accounts for
the control's one-call difference. The English control shows an additional
approximately 0.6 ms of scanning overhead at this size. This is an observed
tradeoff for avoiding entire forbidden subtrees, not a universal speedup claim.
Sub-millisecond times and three trials should not be treated as precise speedup
factors or as full-page loading/annotation timings.

An earlier fixture run included initial layout in the scan sample. The final
fixture explicitly resolves layout before timing so that the table isolates
scanning on an already laid-out page. A final browser rerun after the Ruby fix
reported `status: passed` for both workloads.

## Verification

`npm run check` passed on Node 24.14.0: **220 tests, zero failures, zero skips**,
followed by the real local-loader verification, tokenizer feasibility check,
verified resource roundtrip, userscript build and build audit.

Six new integration tests cover large forbidden subtrees with safe siblings,
blocked scan-root boundaries, insertion inside and movement out of code,
author/Terminator/generated ruby preservation, movement of an active scan root
under a blocked parent during a yield, and nested/dynamically inserted author ruby.
Existing cooperative cancellation, cursor mutation, visibility, deferred-record
safety and complete restoration tests also passed.

Independent review found an initial regression where pruning outer RUBY skipped
inner author readings. The implementation now excludes RUBY from subtree pruning,
and the new nested/dynamic case plus the original before/after reproduction passed;
closing annotation restored the original HTML exactly. The full check was rerun
after this correction.

No actual Chrome + Tampermonkey session or live translation provider was used.
These results do not establish release compatibility, complete page speed or the
unresolved Worker lazy-loading gate.

## Reproduction

With the project's installed dependencies and a supported Node version:

```sh
node work/prototypes/blocked-subtrees/serve.mjs
```

Open the printed loopback URL and keep the tab foreground until it reports
`status: passed`. The server uses only explicit fixture routes on `127.0.0.1`,
bundles the five relevant historical modules from local Git, and forbids fixture
connections and Workers via CSP. It neither installs a script nor uploads results.
Stop the server with Ctrl-C.
