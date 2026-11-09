# Japanese Reading Helper 0.6.7 candidate — 2026-11-06

## Scope and baseline

Work continues in `codex/complete-reading-optimizations`, based on local main
`100e297` and the existing uncommitted 0.6.6 candidate. This candidate includes
that work and adds cooperative Local analysis, progressive DOM insertion,
manual retries for failed online candidates, and observable startup state.
The original Chinese-guide worktree remains separate.

## Implementation

- Local analysis retains the synchronous short-input path. Long inputs yield
  after roughly 1024 characters at Kuromoji's existing `、` / `。` boundaries.
  Each uninterrupted span retains its complete context. Aborting at a yield
  cancels subsequent analysis. Dictionary initialization remains on the page.
- Large annotation plans construct nodes within the coordinator's existing
  scheduling budget and insert at most 128 annotations per chunk. The remaining
  suffix stays visible as a tracked source text node. Each insertion validates
  current source ownership and safety. Stop, edits, hiding and replacement plans
  remove or supersede queued work and preserve current page content.
- An explicit retry clears only failed word/phrase results. Kanji partial
  successes are re-planned with successful word results retained in the adapter.
  The same provider client and its pacing remain active. Pending work suppresses
  overlapping retry operations. Successful annotations stay visible.
- Menus show loading, dictionary progress, running and failed startup. Loading
  can be cancelled by the feature command. Failed startup and failed online
  results expose localized retry commands. Session operation counters reject
  late progress, completion and rejection after cancellation or mode changes.
- The feature's existing settings, approved endpoints and dependency versions
  continue to apply. The only persistent cache remains the previously approved
  fixed dictionary data from the 0.6.6 candidate.

## Automated verification

Using Node 24.14.0, `npm run check` passed all **335 tests** and the real loader,
feasibility, historical resource round-trip, build and metadata/privacy audit.
Eleven additional regressions cover real-tokenizer output equivalence, abort at
a yield, partial rendering with stop/edit/hide/plan replacement, both online
retry paths, menu progress/cancellation/retry and switching modes while loading.
Existing DOM, provider, storage, pacing and restoration tests also pass.

`npm run verify:vendor` downloaded and verified all twelve fixed dictionary
assets, including exact URL, byte length and SHA-256 checks.
`npm run verify:deterministic-build` produced identical artifacts twice.
`git diff --check` passed.

- Artifact — `dist/yomi-ruby.user.js`, version 0.6.7
- Size — 273050 bytes
- SHA-256 — `e6065b2e562d10c035a4307cbb1c51cd5f09285e6d5b4d80e205e1d981e41ebd`

## Chrome fixture observations

Chrome reported 156.0.0.0. The fixture ran at
`http://127.0.0.1:8768/optimization?csp`, with `script-src 'self'`,
`connect-src 'self'` and `worker-src 'none'`. It uses verified local dictionary
files and controlled provider responses. Its request adapter maps the twelve
approved production dictionary URLs to loopback fixture files.

All nine visible checks passed for dictionary progress, twelve cold requests,
network-free warm cache reuse, identical analysis output, rendered base count,
source restoration, preserving a page-added node and its listener, retrying only
failed candidates, and restoration after retry.

The final observed synthetic corpus contained 11500 characters and produced
3500 annotations.

| Operation | Completion time | Maximum 10 ms timer gap |
| --- | ---: | ---: |
| Synchronous analysis | 162 ms | 162 ms |
| Cooperative analysis | 124 ms | 34 ms |
| Cooperative analysis plus progressive DOM rendering | 3517 ms | 187 ms |

These are individual fixture observations. They show reduced analysis blocking
in this sample. Main-thread layout/DOM work still causes long tasks. Progressive
insertion favors earlier visible results and shorter insertion bursts, with
additional total rendering overhead. An earlier intermediate implementation
that constructed nodes over multiple turns and inserted them all at once took
690 ms for analysis/rendering and had a 403 ms timer gap. The intermediate and
final runs were separate observations, so they do not establish a controlled
speed ratio or a universal performance bound.

Inputs without Kuromoji punctuation remain indivisible. Dictionary
initialization, an individual unbroken span and browser layout can exceed the
scheduler budget. Worker execution remains a separate feasibility gate.

Reproduce with `node scripts/serve-browser-smoke.mjs`, then use the Run checks
button at `/optimization` or `/optimization?csp`. Evidence is saved locally in
`work/tmp/verification-0.6.7/browser-csp.json` and `browser-csp.png`.

## Installed-extension verification — 2026-11-07 Asia/Shanghai

The user explicitly approved updating Chrome/Tampermonkey to this candidate and
operating only synthetic local test pages, including recoverable cache/offline
fault tests. Before installation, the artifact SHA-256 matched the value above.
Tampermonkey 5.5.1 showed the installed 0.6.6 and offered 0.6.7 from the loopback
URL. The Update action completed. Its dashboard/editor subsequently displayed
0.6.7 and the script settings showed update time 2026/11/7 00:04:54.

The installed script was exercised on `http://127.0.0.1:8768/`.

| Exercise | Observed result |
| --- | --- |
| Initial disabled page | Zero generated annotations and exact source markup |
| Enable Local | Twelve expected annotations, including kyō, tōkyō, nihongo and taberu |
| Menu state | Chinese menu showed running, with Local selected and Google as the katakana provider |
| DOM safety | Zero hidden/unsafe annotations, unsafe author ruby and Katakana Terminator preserved |
| Same-text page-added span, then disable | Zero generated annotations, exact source restoration, original author node/listener and page-added node/listener preserved |

The test-origin kanji and katakana features are off. The existing global Local,
Google and Chinese selections were retained. The management UI display level
was temporarily changed from Novice to Advanced while looking for storage
controls, then visibly restored to Novice. No cache value or throttling setting
was changed.

The target script's Extension storage entry was located through the background
DevTools UI, with fixed dictionary data visible. A complete cache-value audit,
background request/header capture and recoverable corruption/offline/quota
fault injection could not be completed. Chrome repeatedly moved to other pages,
the browser debugger disconnected, and subsequent native-control calls repeatedly
timed out. The verification stopped before mutating stored data. The user was
notified that a stable foreground verification window is needed to continue.

Evidence is saved in `work/tmp/verification-0.6.7-installed/running-menu.png`,
`rollback.png`, and `rollback.json`. The installed source was not exported for a
byte-for-byte comparison. Test tabs and the background DevTools window could
not be closed through the failing UI connection; the loopback server was stopped.

## Coverage gaps recorded before the final verification scope decision

Installed basic behavior and restoration passed. Background headers/request
capture, installed GM cache corruption/quota/offline failures, cancellation
under cold acquisition, and installed retry behavior remain pending. The earlier
335 automated tests and ordinary-page fixture evidence cover their recorded
scenarios. Broad real-site coverage and a scheduled automatic-update cycle still
need separate observations. Worker integration remains outside this candidate.

## Git finalization attempt — 2026-11-09 Asia/Shanghai

The user authorized commit, merge and main-only push. The task branch remains
based on `100e297`; a fresh fetch found local main five commits ahead of
`origin/main`, with no incoming commits. Unrelated Chinese-guide work remains
in its original worktree.

Before committing, `npm run check` passed again using Node 24.14.0: 335 tests,
zero failures, real cold/warm loader checks, feasibility, historical resource
round trip, build and audit. Review also corrected stale candidate-version and
dictionary-permission descriptions in the current documentation.

A fresh strict-CSP installed-script fixture showed both features off and exact
source restoration. Read-only background inspection found the twelve expected
dictionary cache keys in the target script's storage. No cache value, feature
setting or throttling setting was changed. The browser debugger call then
stalled for an extended period, so the missing failure and network checks could
not be completed. Debugging was disabled, the new fixture tab was closed, and
the loopback server was stopped.

This report accompanies the local task-branch commits. Merge and push remain
blocked by the recorded installed-extension gates: pushing main would expose
the 0.6.7 artifact at the existing automatic-update URL. Git authorization alone
does not establish that those verification gates passed.

## Additional installed checks and final scope decision — 2026-11-09

Chrome 156 with Tampermonkey 5.5.1 was exercised again on the synthetic strict-CSP
loopback page. Inspection of the actual script storage found twelve dictionary
entries containing only `base64` and `sha256`. Recomputed hashes matched their
stored digests for all twelve entries, totaling 17,791,956 compressed bytes.

A direct extension-storage edit was overwritten by Tampermonkey's in-memory
state before acquisition and was not counted as a corruption-recovery test.
The subsequent test paused the installed script at its dictionary read and
used its actual GM storage functions through temporary fixture buttons. A
corrupted `tid.dat.gz` entry was replaced by the original cached value and the
fixture produced twelve expected annotations again. An extension-background
webRequest listener captured exactly one replacement GET to
`https://unpkg.com/kuromoji@0.1.2/dict/tid.dat.gz`, with no Cookie, Authorization,
Origin or Referer header. This observation covers that dictionary request.

Service-worker DevTools Offline did not prevent the actual dictionary request,
so it did not establish offline behavior. The `No throttling` setting was
visibly restored.
A temporary session rule blocking only that exact dictionary URL was prepared,
but the user ended further testing before its failure/retry scenario completed.
The removal call for session rule 1900000001 and the request listener completed.
The temporary fixture's restore/inspect controls subsequently reported the
dictionary present, uncorrupted and equal to its backup. The last observed
test-origin Local feature state was running; a later attempt to close it timed
out. Temporary fixture controls disappear when the test page closes or reloads.

After reviewing the completed and pending checks, the user instructed that
testing stop at the current coverage. The earlier instruction to commit, merge
and push main is carried forward with that narrowed verification scope.
Installed quota failure, effective offline failure, cold-acquisition cancellation
and online failed-item retry remain unverified. Automated coverage remains as
recorded above. This decision does not turn unexecuted checks into passed tests.
