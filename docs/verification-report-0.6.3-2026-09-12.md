# Japanese Reading Helper 0.6.3 verification — 2026-09-12

## Scope and artifact

The release fixes incremental online kanji results, DOM visibility/editability
changes, retention of unused full-text entries, foreground recovery scheduling,
and exact restoration of markup inside author-provided kana ruby. Provider
endpoints, request limits, persistent setting keys, permissions, and dictionary
assets are unchanged. The project instructions now describe the online kanji
modes already implemented before this release.

- Baseline: `main` at `bb8c585a2e6f1e723cb3550fce532d27d668c59d` (0.6.2).
- Task branch: `codex/fix-reading-lifecycle-063`.
- Artifact: `dist/yomi-ruby.user.js`, version **0.6.3**, **260009 bytes**.
- SHA-256: `fb2dcaf5e30da5cc6d1ce4232932de21211d8579cf49f18fa32a0c51404ceb21`.
- All work was isolated from the pre-existing dirty Chinese-guide checkout.

## Automated verification

Using Node **24.14.0** on macOS:

- `npm run check`: passed, including **238 tests**, real Kuromoji loader,
  tokenizer feasibility, all 12 preloaded-resource round trips, regenerated
  userscript, and build audit.
- `npm run verify:vendor`: all 12 immutable dictionary assets matched their
  recorded URL, length, and SHA-256. No new dependency or license was added.
- `npm run verify:deterministic-build`: two builds were byte-identical.
- `git diff --check`: passed.

Regression tests first failed against the prior behavior. They now cover
Google and Bing progressive batches followed by failure, stale mode results,
hidden/style/class/inert/aria-hidden/contenteditable changes, closed details,
late results entering editable content, author ruby node identity and event
listeners, a 128-entry unused full-text window, and bounded foreground work.
Eviction tests also verify that successful and failed exact words are not
redisclosed to a provider within the same enable cycle.

Existing deterministic transport tests exercise malformed payloads, integrity
failure, strict redirects, anonymous GM requests, 401 refresh limits, CAPTCHA,
429, cancellation, and absence of cross-provider fallback. These are injected
test cases, not claims that every remote failure was induced live.

## Desktop browser exercise

Run on 2026-09-12, approximately 14:30–14:52 Asia/Shanghai, in the user's existing
desktop Chrome installation. Reported user agent: **Chrome/152.0.0.0**;
Tampermonkey extension details: **5.5.0**.

The exact candidate above was served by `node scripts/serve-browser-smoke.mjs`
and installed through Tampermonkey's **Update** flow over the existing 0.6.2
entry. A subsequent installation screen confirmed installed version 0.6.3;
its offered reinstall/reset was cancelled. Existing Chinese locale, Local
kanji mode, and Google katakana selection survived the update.

The committed synthetic fixture is available at `http://127.0.0.1:8767/` and
`http://127.0.0.1:8768/`. The server binds only to loopback and serves only the
fixture, its JavaScript, and the generated userscript.

| Exercise | Observed result |
| --- | --- |
| Unconfigured origin | Both feature menus said Enable; zero generated ruby and unchanged article markup |
| Local dictionary | 11 generated kanji annotations; examples `今日 → kyō`, `東京 → tōkyō`, `日本語 → nihongo`, `食べる → taberu` |
| Reveal hidden/class-hidden/details content | 6 additional annotations appeared; first mutation approximately 504 ms after reveal |
| Hide that content again | Returned to 11 annotations; zero annotations remaining inside hidden content |
| Append 200 paragraphs | 811 total kanji annotations; source projection preserved; zero unsafe annotations |
| Disable after the long-page exercise | Zero generated ruby; article markup exactly restored; original author `rt` child node and its click listener restored |
| Google kanji + katakana | 14 generated annotations; `今日 → Kyō`, `食べる → Taberu`, `ゲーム → games`, `テレビ → television`, `コンピューター → computer` |
| Bing kanji + katakana | Both features returned results; examples `食べる → taberu`, `ゲーム → Games`, `テレビ → Television` |
| Local → Google → Bing → Local and provider changes | Replaced readings appeared; both features remained independently controllable |
| English/Chinese language switch | Menu copy and next-mode order changed; configured feature choices retained |
| `/?csp` with Local enabled | 11 expected annotations with `script-src 'self'`, `connect-src 'self'`, and `worker-src 'none'`; no unsafe-eval allowance |
| Different port, 8768 | Both features remained disabled despite 8767 being enabled |
| Final disable/rollback | Zero generated ruby, exact markup, original author node, and click listener all confirmed |

For every recorded active-mode snapshot, the source projection and existing
Katakana Terminator markup were preserved; forms, editable content, pre/code,
and hidden areas had zero generated annotations after scheduled work settled.
Both features were turned off on the test origin at the end, and global Local,
Google, and Chinese settings were restored.

## Extension-background network observations

Chrome DevTools inspected Tampermonkey's **service worker** Network panel,
not merely the page target. Only synthetic fixture content was deliberately
submitted. Temporary provider configuration and response cookies are not
included in this report or an exported HAR.

- Bing made two independent GETs to `https://www.bing.com/translator` and two
  POSTs to that origin's `/ttranslatev3`, all HTTP 200. No redirect occurred in
  this sample. GET and POST request headers contained no Cookie or
  Authorization. POST Referer was the Bing translator page, not the fixture.
- Katakana POST `text` contained only `ゲーム`, `テレビ`, `コンピューター`,
  joined with newlines; `fromLang=ja`, `to=en`.
- Kanji POST `text` contained only the 11 deduplicated words `今日`, `東京`,
  `日本語`, `勉強`, `食べる`, `方法`, `思う`, `前`, `後`, `𠮷`, `龘`;
  `fromLang=ja`, `to=ja`.
- Google made HTTP 200 GETs to the approved `/translate_a/single` endpoint.
  Kanji `q` contained the same complete words joined by `🧩`, with `tl=ja`,
  `dt=t`, `dt=rm`; katakana `q` contained the same three newline-joined phrases
  with `tl=en`. Neither request carried Cookie, Authorization, page Referer,
  or page Origin. Chrome added its ordinary browser/variation headers.
- No unpkg runtime request appeared during the captured Local reloads. The
  asset integrity and lazy activation checks are also exercised by the real
  loader tests and the installed CSP page.
- Online requests used the browser's existing loopback proxy at port 7892.
  This does **not** establish mainland direct reachability or `cn.bing.com`
  redirect behavior. No proxy setting was changed.

## Limits and follow-up

This is a synthetic-fixture Chrome/Tampermonkey verification, not a broad
real-site or other-browser compatibility certification. Automatic updates via
the renamed GitHub URL were not triggered on a timed update cycle; the native
0.6.2-to-0.6.3 update was exercised directly.

Local cold initialization still produced a longest observed main-thread task
of **1157 ms** on the ordinary fixture and **1259 ms** on the CSP fixture.
These are individual observations in an existing multi-tab browser, not a
benchmark or proof of regression. Moving initialization off the main thread
remains separate work; this release improves foreground scheduling only.

Online readings remain dependent on provider output. Bing returned
`龘 → Guī` in this fixture: source alignment and Latin-shape validation do not
prove a correct Japanese reading. Local mode left the fixture's rare unknown
characters unchanged. This release does not add a dictionary cross-check to
online results or promise contextual reading accuracy.
