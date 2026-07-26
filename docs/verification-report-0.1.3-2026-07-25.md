# Verification report — 0.1.3 local candidate — 2026-07-25

## Candidate outcome

Version 0.1.3 is a local candidate. It was built and verified without installing
or updating Tampermonkey, operating Chrome or x.com, modifying Katakana
Terminator, or publishing any artifact. The 0.1.2 historical report remains in
`docs/verification-report-2026-07-25.md` and was not rewritten.

The generated candidate is:

- path: `dist/japanese-romaji-ruby.user.js`;
- size: 122,584 bytes;
- SHA-256: `2d3a768d8277830d284b550147318afef8b31592f188d4a9ec34a47f95a4d78e`;
- metadata version: 0.1.3.

Two consecutive builds produced the same byte count and SHA-256 digest.

## Implemented control and lifecycle behavior

- An unconfigured or stored-false origin registers only **开启本网站自动标注**
  and does not start page annotation.
- A stored-true origin registers only **关闭本网站自动标注** and starts one page
  session.
- The dynamic menu changes immediately when the user requests a transition.
  Origin-setting writes are serialized so rapid operations converge on the last
  requested state.
- Enabling waits for a successful setting write before constructing the page
  tokenizer. A setting-write failure restores the previous menu state, keeps
  the page fail closed, and displays an explicit error.
- Disabling immediately invalidates the current generation, stops and restores
  the annotator, clears status and styles, releases tokenizer and promise
  references, and aborts resource-request handles when the adapter supports it.
- A late tokenizer result cannot start annotation or reattach to a disabled
  session. Re-enabling constructs a fresh tokenizer from the preloaded local
  resource seam.
- Initialization failure creates no partial annotation, releases the failed
  promise, and permits a later retry. The stored origin setting remains outside
  the page session and is not reset by the failure.

## Automated and local-resource verification

The following commands passed under Node 24.14.0:

- `npm test`: 37 of 37 tests passed.
- `npm run test:loader-real`: verified all twelve local dictionary assets and
  produced `kyō`, `tōkyō`, `nihongo`, `benkyō`, `taberu`, `hōhō`, and `omou`.
- `npm run test:feasibility`: requested only the twelve in-memory
  `verified:/dictionary/*.dat.gz` assets and preserved the unknown reading case.
- `npm run test:resource-prototype`: verified twelve Blob-backed local resources
  with no remote runtime URL.
- `npm run build`: generated the 0.1.3 userscript from `src/`.
- `node scripts/audit-build.mjs`: verified the single origin-menu expression,
  twelve exact SRI resources, absence of the removed temporary command, and no
  runtime remote URLs, dynamic evaluation, ordinary fetch, or page persistence
  APIs.
- `npm run verify:vendor`: downloaded all twelve pinned unpkg resources and
  matched every manifest byte length and SHA-256 digest.

The first vendor-verification attempt ended with a TLS read `ETIMEDOUT` and a
separate small-resource probe encountered an HTTP/2 framing error. A large
resource probe returned HTTP 200, and the second complete verifier run passed
all twelve assets. The successful run, not the failed attempt, is the basis for
the final manifest result; the transient failure is retained here for accuracy.

New or expanded tests cover the one-command bootstrap states, menu changes
before persistence and tokenizer completion, setting-write failure, rapid
enable/disable convergence, disabling during loading, abortable local-resource
reads, stale asynchronous completion, failed-initialization retry, fresh
tokenizer construction after disable, annotator-start rollback and retry,
complete DOM restoration, and stopping later dynamic annotation. Existing
reading, DOM safety, author-ruby restoration, Katakana Terminator, scheduler,
integrity, and strict-CSP loader coverage remains green.

## Evidence boundary

This report does not establish that Tampermonkey installed or updated 0.1.3,
that its twelve resources persist across full reloads or new tabs without a
remote transfer, that its returned resource URLs have an accepted local scheme,
that real x.com content is compatible, or that extension-background network
traffic contains no page-derived data. Those conclusions require the separately
authorized Chrome and Tampermonkey procedure in `docs/manual-test-plan.md`.
