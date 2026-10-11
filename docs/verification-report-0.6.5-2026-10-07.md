# Japanese Reading Helper 0.6.5 candidate verification — 2026-10-07

Browser regression completed on **2026-10-11**.

## Scope and baseline

Baseline: `main` at `b47effb` (0.6.4). Candidate branch:
`codex/fix-review-followups`. This report records verification completed before
committing or merging the candidate. Remote publication is outside this
verification run.

The initial review inspected the older `codex/add-chinese-user-guide` checkout
at `c498484` (0.6.1). The implementation was checked again against current
`main` before making changes. Unsafe author-ruby exclusion, original author
child-node/listener restoration, and Google request pacing were already fixed
on `main`; this candidate retains those implementations and their tests.
The older checkout and its uncommitted guide changes were left untouched.

| Remaining issue | Candidate behavior | Regression coverage |
| --- | --- | --- |
| Disable waited for persistent storage | Stop the active session, cancel pending work and restore this page before awaiting storage; a failed write leaves this page off | Delayed and rejected writes for both features |
| Earlier queued write succeeded but last write failed | Recover menus, locale and active runtime to the last successfully persisted value | Rapid provider, kanji-mode and locale changes |
| Page partially edited an annotated record | Unwrap surviving owned ruby while retaining the page's current text, markup and child-node identity | Disable before/after observer delivery, replaced tail, nested base element |
| Google katakana accepted incomplete transport evidence | Require integer 2xx status and the exact request URL in `finalUrl` or `responseURL`; reject redirects | Missing/noninteger/error status, missing/malformed/changed URL, valid compatibility field |

No endpoint, permission, persistent key, dependency version, dictionary, payload
selection or provider fallback rule was added. Version 0.6.5 allows a normal
Tampermonkey update from 0.6.4 instead of a same-version reinstall/reset.

Project instructions, both READMEs, the security boundary and the manual test
plan now describe the actual bundled runtime, preloaded dictionary resources,
lazy local tokenizer activation, provider-specific readings, setting failure
behavior and ownership-based cleanup consistently. Historical verification
reports remain unchanged.

## Automated verification

Using Node **24.14.0**:

- The eight new controls/coordinator regressions failed on the unmodified
  implementation, then passed with the fixes.
- `npm run check`: **267 passed, 0 failed**, including the real local Kuromoji
  loader, tokenizer feasibility, preloaded-resource round trips, build and audit.
- `npm run verify:vendor`: all **12** immutable dictionary assets passed byte
  length and SHA-256 checks against the approved manifest.
- `npm ci --offline`: installed the locked dependencies locally in the candidate
  worktree. The final build uses physical dependencies, not another checkout's
  `node_modules` symlink.
- `npm run verify:deterministic-build`: two byte-identical builds.
- Build audit and `git diff --check`: passed.

Artifact: `dist/yomi-ruby.user.js`, version **0.6.5**, **261782 bytes**.
SHA-256: `ea2b6af705b89358a28ff70014322829c2d74df6f95600c2879378b27599ff8d`.

Storage-write rejection and malformed provider responses are injected test
cases. They have not been induced in the installed Tampermonkey extension.

## Real browser regression — 2026-10-11

After the user's explicit confirmation, the normal **0.6.4 → 0.6.5 Update**
was applied in Tampermonkey on 2026-10-07, using the loopback-served candidate
above. The dashboard displayed 0.6.5 after updating. On resuming testing on
2026-10-11, the candidate artifact hash was unchanged and the dashboard again
confirmed **0.6.5**. The installed code was not exported for a byte comparison.

Environment: Chrome **154.0.0.0**, Tampermonkey **5.5.0**, macOS. Browser
observations ran from **11:24 to 11:32 Asia/Shanghai** (03:24–03:32 UTC), using
native Chrome/Tampermonkey controls and the visible fixture's snapshot report.
The existing browser/network configuration was used without changes; proxy
routing was not inspected, so provider success is specific to this environment.

The fixture adds an **Edit annotated paragraph tail** action, hidden/editable
author-ruby cases, and source-preservation assertions for the edited paragraph.

| Exercise | Observed result |
| --- | --- |
| Start with both features off | Zero annotations, unchanged source and author ruby |
| Enable Local kanji | 12 annotations, including `今日 → kyō`, `東京 → tōkyō`, `食べる → taberu`; no hidden/unsafe annotations |
| Reveal hidden/class-hidden/details content | 18 annotations; source projection, unsafe author ruby and Katakana Terminator content preserved |
| Hide content and append 200 paragraphs | After observer processing: 812 annotations, zero hidden/unsafe annotations and unchanged source projection |
| Remove added paragraphs and edit annotated paragraph tail | Page edit `日本語ですね` retained; closing Kanji left zero annotations and exact expected markup |
| Check complete rollback after partial edit | `editedParagraphPreserved`, `unsafeAuthorPreserved`, `terminatorPreserved`, `sourcePreserved`, `completeRollback`, `originalAuthorNodeConnected` and `authorListenerPreserved` all true at 03:26:25 UTC |
| Enable Google katakana | Three real translations: `ゲーム → games`, `テレビ → television`, `コンピューター → computer`; source projection and existing ruby preserved |
| Switch active katakana Google → Bing → Google | Three Bing results (`Games`, `Television`, `Computer`), then three Google results; selected provider reflected in the menu |
| Switch Chinese → English → Chinese | Menu labels changed; active katakana annotations and saved provider retained |
| Cycle Kanji mode while Kanji was off | Local → Google → Bing → Local reflected in saved menus; Kanji remained off |
| Disable katakana | Zero annotations, exact expected markup and original author node/listener preserved at 03:29:20 UTC |
| Enable Local again on edited source | 12 annotations, edited paragraph preserved |
| Navigate to the strict CSP fixture on origin 8767 | Persisted Local preference loaded; 12 annotations with source projection and unsafe author ruby preserved |
| Open origin 8768 while 8767 remained enabled | Zero annotations, both menu commands offered Enable; exact-origin setting did not leak across ports |
| Final disable on CSP page and reload | Zero annotations; exact rollback and author node/listener checks passed before reload; both features still off after reload |
| Final settings/version | Chinese locale, Local kanji, Google katakana; both test origins off; dashboard showed version 0.6.5 |

Both features were left off for `http://127.0.0.1:8767`; origin 8768 was never
enabled. Test tabs were closed and the loopback fixture server was stopped.
The authorized candidate remains installed; no other userscript was changed.

## Interpretation and remaining limits

The successful Google run demonstrates that actual Tampermonkey success
responses pass the new status/final-URL validation. Rejected redirects,
missing metadata, malformed statuses, delayed/rejected setting writes and
queued-write races remain deterministic injected-test evidence. Normal menu
switches do not establish those failure cases in the live extension.

Complete rollback here refers to the exercised synthetic fixture sequences.
Broad real-site compatibility, live Google request timing, repeated extension
background network capture and timed automatic updates were not tested in this
run. Earlier broader evidence remains in the
[0.6.4 report](verification-report-0.6.4-2026-09-30.md) and
[0.6.3 report](verification-report-0.6.3-2026-09-12.md).

Local tokenizer startup still produced visible long-task measurements:
the main fixture's maximum was **1538 ms** after the first enable and **1874 ms**
after re-enabling; the CSP navigation reported **1406 ms**. These are single-run
fixture observations, not controlled benchmarks. The fixture's first-annotation
timer also includes manual menu interaction in some sequences and must not be
interpreted as provider latency. This change does not claim to eliminate main
thread stalls or introduce worker execution.

## Local merge and installation refresh — 2026-10-11

With explicit user authorization, the three fixes and the integrated package
were committed separately and fast-forwarded into local `main` at `3397850`.
The merged artifact retained the SHA-256 above and passed the build audit. The
original checkout's uncommitted guide changes were preserved. No push, PR or
public release was performed.

Tampermonkey's same-version Reinstall dialog warned that script settings would
be reset, so that operation was cancelled. Instead, the complete UTF-8 file
from the merged `main` worktree was loaded into the existing script's editor
and saved, preserving the existing entry and storage. The saved installation
was then exported with Save to disk: `cmp` confirmed **byte-for-byte equality**
with the merged artifact, **261782 bytes**, SHA-256
`ea2b6af705b89358a28ff70014322829c2d74df6f95600c2879378b27599ff8d`.

A fresh fixture load after saving started with both features off. Menus retained
Chinese, Local kanji and Google katakana. A final Local enable produced
**12 annotations** at 03:57:36 UTC; disabling and checking rollback produced
**zero annotations**, exact expected markup, and preserved author node/listener
at 03:57:58 UTC. Both test-origin features were left off. This was a smoke check
of the byte-identical installed artifact, not a repeat of the full matrix.
