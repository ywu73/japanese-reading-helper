# YomiRuby 0.6.0 Google kanji emoji batching verification — 2026-07-30

## Decision and scope

This report records the implementation and local verification of the
emoji-delimited Google kanji-romaji fast path specified in
`docs/google-kanji-emoji-batching-plan-2026-07-30.md`. The implementation keeps
the existing anonymous no-key endpoint and adds no endpoint, persistent state,
cross-provider fallback, surrounding-text disclosure, or normalization of
candidate identity. The resulting package and userscript metadata version is
`0.6.0`.

The task branch was created from local `main` at
`52e7502ad12c37b47d69f9e7a7cfa3b1edf155f2`. At that checkpoint, local
`origin/main` pointed to the same commit. No live remote comparison was made,
so that is not evidence of current GitHub parity. The supplied batching plan
was the only pre-existing worktree change and remained untracked and unedited.

The live Google observations that motivated the design were performed before
this implementation and are recorded in the plan document. This implementation
session did not send another live Google request.

## Implemented behavior

Eligible exact words are still deduplicated without normalization and must
contain kanji, contain no control character or surrounding whitespace, and be
at most 200 characters. A word containing the private `🧩` separator is now
ineligible and is never submitted.

The Google fast path groups candidates in stable discovery order with both of
these limits:

| Limit | Value |
| --- | ---: |
| Maximum candidates per request | 50 |
| Maximum encoded request URL length | 1800 characters |
| Minimum interval between serialized requests | 250 ms |
| Request timeout | 8000 ms |

Each fast-path request remains an anonymous `GET` with redirects rejected and
uses the fixed endpoint plus `client=gtx`, `sl=ja`, `tl=ja`, `dt=t`, `dt=rm`,
and `q=<word🧩word...>`. An individually over-budget candidate bypasses the
fast path and goes directly to the existing exact single-word path.

Batch output is accepted only when all batch-level alignment gates hold:

- `payload[2]` is exactly `ja`;
- there is exactly one source-echo field and it exactly equals the submitted
  `🧩`-joined source;
- there is exactly one string-valued `item[2]` romaji field;
- splitting that field on `🧩` yields exactly the submitted word count.

If any gate fails, or if the batch request returns an HTTP error (including
429), times out, fails its final-URL check, or encounters a network error, the
whole affected batch is retried through the pre-existing single-word
`tl=en`/`item[3]` parser. Cancellation remains terminal: it aborts the active
request and never starts fallback work.

After alignment succeeds, each romaji segment is trimmed and checked
independently. The fast-path whitelist adds an internal ASCII space for values
such as `Kanagawa ken`; its other accepted letters, macrons, apostrophes, and
hyphen remain bounded by the existing 1000-character limit. An unsafe segment
such as `Ni~Tsu` is omitted without discarding or shifting other aligned
segments. The single-word fallback retains its original no-space whitelist.

## Automated verification

The focused public client suite passed under Node `v24.14.0`:

```text
node --test tests/integration/google-kanji-romaji.test.js
tests 28
pass 28
fail 0
```

The focused coverage includes `tl=ja` batch construction, `item[2]` extraction,
source-echo uniqueness, source mismatch, missing echo, duplicate romaji fields,
wrong language, segment-count drift, residual-separator drift, per-segment
unsafe-value skipping, phrase-count and URL-length bounds, separator-bearing
input exclusion, the 250 ms inter-batch interval, exact single-word fallback,
HTTP 429, timeout, final-URL rejection, serialized operations, the existing
strict single-word parser, and cancellation.

The complete local suite and full check chain passed:

```text
npm test
tests 182
pass 182
fail 0

npm run check
passed: 182 tests, real local Kuromoji loader, feasibility prototype,
preloaded-resource prototype, userscript build, and static build audit
```

The static audit now asserts the Google batch limits, `🧩` request join,
`tl=ja` fast path, unique `item[2]` extraction, exact source and segment-count
gates, the space-aware batch whitelist, separator input exclusion, and
continued `tl=en`/`item[3]` single-word fallback. Existing endpoint, request,
storage, runtime-isolation, DOM, dependency, and forbidden-capability audits
remain green.

Independent fixed-resource and deterministic-build checks also passed:

```text
npm run verify:vendor
verified 12 pinned assets from https://unpkg.com/kuromoji@0.1.2/

npm run verify:deterministic-build
deterministic build passed: 240044 bytes
sha256=bd7db031f5464a6ebda3518a175ba7a8d9a65a904196f0cef47ce7413f9ffed7
```

The generated local artifact is therefore:

```text
dist/yomi-ruby.user.js
size: 240044 bytes
sha256: bd7db031f5464a6ebda3518a175ba7a8d9a65a904196f0cef47ce7413f9ffed7
```

`git diff --check` passed after implementation and before this report was
written; it is rerun as part of the final worktree review.

## Deliberate limits

This session did not install or update Tampermonkey, operate Chrome or a real
site, exercise the implementation through real `GM_xmlhttpRequest`, capture
extension-background traffic, probe Google's current rate limit, or establish
that Google will preserve `🧩` indefinitely. It also did not stage, commit,
merge, push, create a pull request, tag, publish, or release any artifact.

The Google endpoint and separator behavior remain undocumented, empirical
interfaces. Local tests prove the intended fail-closed parser, bounded request
construction, and fallback mechanics against controlled responses; they do not
prove provider-wide accuracy, long-run compatibility, real-site performance,
browser compatibility, privacy outside the statically bounded request path, or
complete browser rollback. Production/release status remains **NO-GO** pending
the existing manual and release gates.
