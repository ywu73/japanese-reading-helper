# Japanese Reading Helper 0.6.6 candidate — 2026-10-18

## Baseline and scope

The original assessment inspected `codex/add-chinese-user-guide` at `c498484`
(0.6.1). Before implementation, the task rechecked local `main` at `100e297`
(0.6.5), which already includes most of the suggested work. The implementation
branch is `codex/complete-reading-optimizations`, in the sibling worktree
`complete-reading-optimizations`. The old checkout and its uncommitted guide
changes are preserved. No commit, merge, push or public release is authorized.

| Requested direction | Existing baseline / candidate work |
| --- | --- |
| Immediate disable | Retain the 0.6.5 fix and delayed/rejected-storage regressions |
| DOM safety and exact restoration | Retain author-ruby and unsafe-region fixes; additionally preserve same-text page-added nodes and their listeners |
| Google katakana response checks | Retain integer 2xx, exact final URL and rejected redirects |
| Cross-operation Google pacing | Retain the 0.6.4 client-owned 250 ms interval and independent feature state |
| Successful batch retention | Retain validated per-batch progress across all four online adapters |
| Dictionary acquisition and local startup | Combine new verified lazy download/cache with the existing native GZIP decoder; keep executable code statically bundled |
| Browser evidence and documentation | Reproduce the remaining issue in installed Tampermonkey; check the candidate DOM under strict CSP; update instructions, privacy boundary, audit and test plan |

## Dictionary decision

The user requested all optimizations, then asked to combine lazy acquisition
with local startup improvements after the new permission/cache boundary was
presented. The 0.6.6 candidate therefore removes the twelve install-time
`@resource` entries and the `GM_getResourceURL` grant, adds only `unpkg.com` to
`@connect`, and keeps all existing translation endpoints and provider behavior.

An enabled exact-origin Local path may access only the twelve fixed
`kuromoji@0.1.2` dictionary URLs already approved in `vendor/manifest.json`.
Their combined compressed size is **17,791,956 bytes**. A complete base64 payload
contains **23,722,620 characters**, before object/key overhead; this encoding is
for Tampermonkey storage compatibility and is not a reduction in storage size.

Each dictionary is independently verified by exact final URL, integer 2xx
status, byte length and SHA-256, then stored only as `{ sha256, base64 }` at
`yomi-ruby:dictionary-cache:kuromoji@0.1.2:<name>`. The cache contains no page
text or readings. Cache hits are verified again; a bad entry is cleared and
fetched once. Cache read failure starts no request. Cache write failure leaves
verified bytes usable only for the current page. Downloads are sequential and
cancellable; failed or unverified bytes are not stored or passed to the tokenizer.

The existing native GZIP initialization remains, including the statically bundled
decoder only when the native API is absent. No downloaded code, Worker, new
dependency, alternate CDN or remote reading fallback is introduced.

API references: Tampermonkey's official
[storage documentation](https://www.tampermonkey.net/documentation.php?locale=en&q=GM_values)
and [request documentation](https://www.tampermonkey.net/documentation.php?ext=d2&q=GM_xmlhttpRequest).
They document object/string storage and anonymous/redirect/final-URL behavior;
they do not establish cache quota or the candidate's installed behavior.

## DOM regression

Before the fix, replacing a generated base text node with a same-text span did
not invalidate ownership. Closing the feature rebuilt plain text and discarded
the page's new node and listener. The candidate records original source-node
identities and uses the existing ownership cleanup when those identities change.
Unmodified records retain their merged-text restoration for repeat-enable word
boundaries.

The two new regressions failed before the fix, then passed. They exercise stop
before and after MutationObserver delivery, asserting markup, node identity,
click listener and absence of generated wrappers. The baseline passed 267 tests;
the DOM-only candidate passed 269.

## Browser observations — 2026-10-18 Asia/Shanghai

Chrome reported **155.0.0.0**. Tests used only synthetic loopback fixtures; no
real-site content was submitted. The first two observations below preceded the
user's manual update to the candidate, recorded in the installed regression below.

- At 01:38:29, the installed implementation reproduced the issue: zero generated
  annotations after disable, but `pageAddedNodeConnected`,
  `pageAddedListenerPreserved`, source preservation and complete rollback were
  false. The test-origin feature was left off.
- At 01:41:15, `/candidate?csp` on port 8768 exercised the candidate coordinator
  with fixed reading stubs. After the same edit and disable, generated annotations
  were zero, and markup/source preservation, complete rollback, original author
  node/listener and new page node/listener checks were all true.
- The candidate page used `script-src 'self'`, `connect-src 'self'` and
  `worker-src 'none'`. This verifies the exercised DOM behavior without an
  installation; it does not establish Tampermonkey dictionary transport or storage.
- The screenshot is a local test artifact at
  `work/tmp/verification-0.6.6/dom-rollback.jpg`.

## Integrated checks and installed-extension gate

Using Node 24.14.0 and the unchanged locked dependencies:

- The final integrated check passed **324 tests, zero failures**, real cold/cache loader verification,
  tokenizer feasibility, historical preloaded-resource round trip, build and audit.
- An additional actual-main Local startup regression passed: initial default-off,
  cancelling the first request, ignoring its late result, re-enabling through all
  twelve dictionaries, exact rollback, and a network-free warm re-enable. All
  four bootstrap scenarios passed.
- `npm run verify:vendor` downloaded all twelve exact URLs with redirects rejected
  and verified manifest lengths/digests.
- `npm run verify:deterministic-build` produced two identical artifacts:
  **263511 bytes**, SHA-256
  `daedd033b21c166f071ef719c4b9f54e5afa63582f327d0a987bcd18b73ef5f9`.
- Independent read-only review found no blocking correctness/security issue in
  the acquisition boundary or metadata; its positive-bootstrap coverage finding
  was addressed by the additional regression above.

`git diff --check` also passed. The generated artifact is
`dist/yomi-ruby.user.js`, version **0.6.6**; no remote copy has been updated.

## Installed candidate regression

The user manually confirmed the 0.6.6 update from the loopback-served artifact.
The Tampermonkey dashboard subsequently displayed **0.6.6**. The installed code
was not exported for a byte comparison. The user then explicitly authorized
native Chrome menu operations on the test origin; only its feature switch was
changed, and no other userscript was modified.

| Time, Asia/Shanghai | Exercise and observed result |
| --- | --- |
| 01:56:32 | First Local activation after the update produced 12 expected annotations, including macrons and mixed words; source projection, unsafe author ruby and Katakana Terminator checks passed |
| 01:56:44 | Ordinary reload with Local saved on again produced 12 annotations; the fixture recorded 745 ms from page setup to first annotation |
| 01:57:06 | Same-text page-added span followed by disable left zero annotations; source markup, original author node/listener and new span/listener all passed |
| 01:57:58 | Reload after disable remained off with zero annotations and exact original fixture markup |
| 01:58:35 | Local activation and same-text edit on `/?csp` produced 12 annotations with zero hidden/unsafe annotations |
| 01:58:56 | CSP-page disable restored exact expected markup and both original and page-added node/listener identities; zero generated annotations |

The CSP page uses `script-src 'self'`, `connect-src 'self'`, and `worker-src 'none'`.
Both test-origin features are left off. Local/Google/Chinese global choices are
retained. The fixed dictionary cache is intentionally retained for later Local
use. Both fixture tabs were closed and the loopback server was stopped after
verification. Proof images are `work/tmp/verification-0.6.6/installed-rollback.jpg` and
`work/tmp/verification-0.6.6/installed-csp-rollback.jpg`.

These are functional installed-extension observations, not a controlled speed
comparison. The initial fixture timer includes manual interaction and must not
be interpreted as download latency. The new extension-background requests and
headers were not captured, cache values were not exported, and offline/quota,
corruption and abort failures were not induced in live Tampermonkey. Network-free
cache reuse and those failure paths are established by the deterministic tests,
not by the page snapshots alone. Previous 0.6.3–0.6.5 browser reports remain valid
for their own recorded versions and scenarios. Broad real-site coverage and a
timed automatic-update cycle remain separate from this local candidate.
