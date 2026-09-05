# Local tokenizer Worker feasibility — 2026-09-05

## Outcome and delivery state

The preceding reading-latency round was committed as `15bbb55` and fast-forward
merged into local `main`. All 202 tests passed on the merged main, with zero
failures or skips; the build audit also passed. Its clean task worktree was removed
and the task branch retained. No remote push, userscript installation or release
was performed. The original Chinese user-guide branch and its uncommitted files
were preserved.

This next round produced a reproducible **ordinary-page Worker prototype** on
`codex/local-worker-feasibility`. It did not change `src/`, `dist/`, dependencies,
userscript metadata or the production loader. At initial verification, the prototype
and report were not merged into main. Merging these research artifacts does not
enable the Worker in the production userscript.

With verified dictionary bytes already available, moving dictionary initialization
and tokenization to a Worker substantially reduced the sampled main-thread timer
gap in this experiment. It increased total completion time. Two restrictive CSP
fixtures blocked the Blob Worker. Actual Tampermonkey lazy loading remains
unverified, so the prototype has not been promoted into the product.

## Method

- Execution: Codex in-app browser, ordinary page at a loopback HTTP origin. This is
  not the project's supported Chrome + Tampermonkey environment.
- Build: Node 24.14.0; existing `esbuild@0.28.1`, `kuromoji@0.1.2` and existing
  transitive dependencies; no added dependency or remote executable asset.
- Corpus: 200 identical copies of
  `今日は東京で日本語を勉強し、食べる方法を思う。カタカナ ABC 𠮷。` per run.
- Input: 12 actual compressed dictionary assets, exact size and SHA-256 verified
  against `vendor/manifest.json` on the server and again in the browser.
- Both modes call the existing `buildStaticTokenizer` and `createAnalyzer`. The
  Worker receives verified buffers by transfer and returns the same segment data.
- The Worker is a local build of 95,185 bytes, SHA-256
  `fc1f4bee51f448240af148797d4cb27cbba8f440ab2efbde57497d8477041ed0`.
  The harness checks this digest before constructing the Blob Worker. This tests
  integrity mechanics; the embedded source and hash share a local fixture trust
  boundary, not a completed userscript delivery mechanism.
- Timing excludes initial harness parsing and dictionary reading/verification.
  Worker timing includes its code digest, construction, transfer and result
  delivery. The 10 ms timer includes 30 ms settling windows around the workload;
  assertions and output hashing occur after interval measurement stops.
- Six interleaved trials, three per mode, on one machine. These observations do
  not establish statistical significance, memory savings, frame rate, actual input
  latency, complete cold-start speed or general browser compatibility.

## Final measured runs

Times are rounded milliseconds. The final rerun follows the review correction
that excluded output verification from the timer sample.

| Run | Mode | Initialization | 200 analyses | Total | Maximum timer gap |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Main thread | 762 | 16 | 778 | 779 |
| 2 | Worker | 927 | 18 | 945 | 12 |
| 3 | Worker | 894 | 22 | 916 | 12 |
| 4 | Main thread | 762 | 13 | 775 | 776 |
| 5 | Main thread | 717 | 13 | 729 | 730 |
| 6 | Worker | 788 | 19 | 807 | 12 |
| Median | Main thread | 762 | 13 | 775 | 776 |
| Median | Worker | 894 | 19 | 916 | 12 |

The result supports investigating responsiveness during initialization, not a claim
that total work became faster. Initialization dominates this short synthetic corpus.
Main-thread and Worker segment output was identical across all six runs; the
serialized output SHA-256 was
`7530f9318a4c5eadf0947466ce17ebbe36a83c757e6a7ffe7bd3af6a3226523e`.

## Exercised behavior

| Scenario | Observed result |
| --- | --- |
| `worker-src blob:` | Initialization acknowledgement and real tokenization succeeded |
| `worker-src 'none'` | Worker failed; matching `securitypolicyviolation` with `effectiveDirective=worker-src`, blocked scheme `blob` |
| No `worker-src` or `child-src`, `script-src 'self'` | Same explicit Worker CSP violation and failure |
| Corrupted Worker source | Rejected before Worker construction |
| Same-length corrupted dictionary bytes | Rejected by digest validation before initialization |
| Dictionary transfer | Parent buffers detached after transfer |
| Expected readings | `kyō`, `tōkyō`, `nihongo`, `benkyō`, `taberu`, `omou` present |
| Segment output and source | Identical across modes; joining surfaces/text reproduced the complete source |
| Termination with pending analysis | Pending promise rejected; no success accepted after termination |
| Cleanup | Prototype counters for active Workers and Blob URLs returned to zero after success, cancellation and CSP failure |

Both restrictive fixture pages also emitted an inline-style CSP violation. That
event was not used to classify Worker rejection. Only the matching `worker-src`
and `blob` event counts as evidence; generic `worker.onerror` alone is insufficient.

The prototype's code only requests the local fixture and dictionary routes; it has
no translation or external request path. This is source/fixture evidence, not an
end-to-end Tampermonkey network audit. Worker termination and revoked URL counters
do not measure actual garbage collection or prove production rollback.

## Compatibility gate and decision

CSP defines the Worker fallback order as `worker-src`, `child-src`, `script-src`,
then `default-src`. The observed fallback rejection agrees with that rule.
[W3C CSP3, fetch directive fallback list](https://www.w3.org/TR/CSP/#directive-fallback-list)

Tampermonkey documents multiple execution contexts and context fallback behavior;
the current userscript does not declare `@sandbox`. Chrome documents different CSP
behavior for isolated-world and main-world content scripts. These official sources
do not establish that the prototype's Blob Worker will work in the current
Tampermonkey execution context.
[Tampermonkey @sandbox](https://www.tampermonkey.net/documentation.php?locale=en&q=sandbox),
[Chrome content-script CSP](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#content_security_policy)

The browser tool security policy rejected opening `chrome://extensions`, so the
extension environment could not be inspected through that page. No workaround,
extension setting change or userscript installation was attempted.

[AGENTS.md](../AGENTS.md) requires: “If safe lazy loading cannot be verified in
Tampermonkey, stop and report the limitation.” Therefore production integration
stops here. The next prerequisite is an explicitly authorized Chrome + Tampermonkey
validation session covering lazy startup, real resource delivery, CSP contexts,
integrity failure and repeated enable/disable/cancellation. Async runtime lifecycle
integration, rollback and the full product regression gates would follow a
successful feasibility result; none are claimed complete by this prototype.

## Reproduction

Run `node work/prototypes/local-worker/serve.mjs` with the installed project
dependencies and a supported Node version. Visit the printed loopback URL plus
`/allow`, `/deny` and `/fallback`, keep measurement tabs foreground, and read the
JSON shown on each page. Stop the server with Ctrl-C.

The prototype server built successfully, verified all 12 assets and served the
three exercised fixtures. Review caught the CSP attribution and timing-boundary
issues; both were corrected before the results above were recorded. Production
code is unchanged in this round, so the already-passing 202 main tests were not
rerun solely for this isolated experiment.
