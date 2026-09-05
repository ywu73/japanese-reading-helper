# Native dictionary decompression — 2026-09-05

## Delivery state

The previous Worker feasibility prototype and report were committed as `50dc931`
and fast-forward merged into local `main`. The merge added five research files;
it did not change production source or the installable userscript. The merged
worktree was removed and its task branch retained. Worker integration remains
unverified in Tampermonkey and is not enabled by this merge.

This round implements native dictionary decompression on
`codex/optimize-dictionary-loading`, based on `50dc931`. The source, generated
userscript, tests and documentation were uncommitted on this task branch at
initial verification. No push, installation or release was performed. The
original Chinese user-guide branch and uncommitted files were preserved.

## Change

The verified local loader now awaits native GZIP decompression before constructing
the same Kuromoji tokenizer. It verifies all compressed resources first, starts
one decompression stream at a time, forwards cancellation and clears temporary
Maps after completion or failure. The synchronous builder is retained for existing
tools and for browsers where `DecompressionStream` is absent. Native construction
or stream errors reject initialization without retrying the legacy decoder.

This uses the browser's [Compression API](https://compression.spec.whatwg.org/#decompression-stream),
which defines GZIP decoding and rejects malformed data. No new executable library,
Worker, resource origin, network permission or persistent storage was added.
Existing preloaded resource acquisition and SHA-256 validation are unchanged.

## Browser measurement

The reproducible fixture uses the actual 12 pinned dictionary files, verified
against `vendor/manifest.json`, and 200 identical synthetic Japanese sentences per
trial. It runs six interleaved trials in an ordinary Codex in-app browser page.
The CSP sets `script-src 'self'`, `connect-src 'self'`, `worker-src 'none'`, and
does not allow inline scripts or dynamic evaluation. This is not a Tampermonkey
session or an end-to-end page annotation benchmark.

Timing starts after fixture scripts and compressed assets have been loaded and
verified. Initialization includes decompression and tokenizer assembly. Analysis
measures processing the 200 sentences. A 10 ms interval samples the maximum
main-thread timer gap, with 30 ms settling windows before and after each workload.
Assertions and output comparison occur after the timer stops.

The final measurements after cancellation-error normalization were:

| Run | Decoder | Initialization ms | Analysis ms | Total ms | Maximum timer gap ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Bundled JavaScript | 753 | 16 | 769 | 770 |
| 2 | Native GZIP | 231 | 14 | 245 | 66 |
| 3 | Native GZIP | 222 | 14 | 236 | 57 |
| 4 | Bundled JavaScript | 727 | 12 | 739 | 741 |
| 5 | Bundled JavaScript | 704 | 12 | 715 | 715 |
| 6 | Native GZIP | 194 | 11 | 205 | 54 |
| Median | Bundled JavaScript | 727 | 12 | 739 | 741 |
| Median | Native GZIP | 222 | 14 | 236 | 57 |

For this workload, median initialization time fell about 69%. The main-thread gap
also fell substantially, but synchronous tokenizer assembly and tokenization
remain. Three trials per mode on one machine do not establish general performance,
memory savings or complete browser compatibility. Resource download/reading and
SHA-256 latency are excluded from the table.

## Verification

- `npm run check` passed on Node 24.14.0: **208 tests, zero failures, zero skips**,
  followed by the real local-loader verification, existing tokenizer feasibility
  check, preloaded resource roundtrip, userscript build and build audit.
- Real-loader verification accessed 12 preloaded local assets and produced
  `kyō`, `tōkyō`, `nihongo`, `benkyō`, `taberu`, `hōhō` and `omou`.
- New tests compare complete native/legacy token and annotation data, including
  kanji-kana mixed words, macrons, unknown characters and supplementary Unicode
  before Japanese text. Native initialization exercised all 12 streams.
- API absence returned a valid tokenizer through the existing decoder. Native
  constructor failure and truncated GZIP input rejected without legacy retry.
- Aborting before initialization started no stream. Aborting during decompression
  rejected initialization and prevented subsequent files from starting. Size or
  SHA mismatch rejected before any decompression stream was created.
- The existing CSP simulation still passes. Its Node-only setup now initializes
  the lazily exposed `Response` intrinsic before replacing global `Function`;
  dynamic evaluation remains blocked while the loader runs. The separate browser
  fixture also executed under the actual restrictive CSP described above.
- The final browser fixture passed output equivalence and complete source
  preservation across all six runs, verified-loader execution with local GM mocks,
  API-absence fallback and cancellation during actual native decompression.
- A preliminary Node experiment compared the decompressed bytes of all 12 files
  between native GZIP and the bundled decoder: all **100,260,388 bytes** matched.
  This exploratory comparison is not included in the browser timing table.
- Independent read-only review found no concrete correctness issue and reran the
  14 focused loader/decompression/CSP tests successfully.

Early testing exposed two Node test-harness issues involving lazy built-ins and
mocked constructor restoration; those were corrected. Browser testing also showed
that cancellation did not always surface as `AbortError`, so the builder now
normalizes errors when its signal is aborted. The final full check and browser
run both passed after these corrections.

## Reproduction and limits

With installed project dependencies and a supported Node version, run:

```sh
node work/prototypes/native-dictionary/serve.mjs
```

Open the printed loopback URL and keep the tab foreground until its JSON reports
`status: passed`. The server exposes only the fixture and pinned dictionary routes
on `127.0.0.1`; stop it with Ctrl-C. It does not install a userscript or upload
measurements. The benchmark calls the retained synchronous builder for the baseline
and the new async builder for the native path.

Actual Chrome + Tampermonkey installation, preloaded GM resource behavior, real
page enable/disable cycles and provider traffic were not revalidated in this
round. This is a tested code candidate, not a release compatibility claim. The
previous Worker feasibility gate remains separate and unresolved.
