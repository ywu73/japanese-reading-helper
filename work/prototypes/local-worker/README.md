# Local tokenizer Worker feasibility

This is an ordinary-page experiment, not an installable userscript or a production
loader. It reuses the current tokenizer and analyzer without modifying `src/` or
`dist/`. The Tampermonkey delivery gate remains open.

From the repository root, with the project's installed dependencies and a supported
Node version (tested with Node 24.14.0):

```sh
node work/prototypes/local-worker/serve.mjs
```

Open the printed loopback base URL plus one of these paths. Keep the benchmark tab
foreground while measuring; background timer throttling invalidates comparisons.

- `/allow`: six interleaved runs (three synchronous, three Worker), using 200
  identical synthetic Japanese sentences per run and the actual 12 dictionary assets.
- `/deny`: `worker-src 'none'`; a matching Worker CSP violation is required.
- `/fallback`: no `worker-src` or `child-src`; `script-src 'self'` applies, and a
  matching Worker CSP violation is required.

The page prints JSON with individual timings and assertions. Stop the server with
Ctrl-C. All serving is restricted to explicit fixture routes on `127.0.0.1`; the
server does not accept result uploads or write output files.

Dictionary bytes come from installed `kuromoji@0.1.2`, checked against
`vendor/manifest.json` both by the server and before transfer in the browser. The
Worker code is bundled locally with existing esbuild, embedded in the harness,
and checked against a build-time SHA-256 before Blob construction. These checks
exercise integrity mechanics, not a Tampermonkey distribution trust chain.

Timing starts **after** reading and verifying dictionary bytes. It covers tokenizer
initialization and 200 analyses, including Worker creation, code digest, buffer
transfer and returned-message delivery in the Worker case. A 10 ms interval samples
the maximum main-thread timer gap, with 30 ms settling windows before and after.
Output assertions and comparison hashing run after the timer stops. Script parsing,
asset reads/checks, DOM annotation, memory use and actual user input latency are not
measured. This is not an end-to-end cold-start benchmark.

Checks cover expected readings and source preservation, equivalent output across
modes, corrupted dictionary/code rejection, transferred buffers, cancellation of
pending analysis, and explicit termination/revocation of Worker and Blob URL handles.
They do not establish garbage-collection timing or userscript enable/disable behavior.

See [the dated report](../../../docs/verification-report-local-worker-2026-09-05.md)
for observed results and the unresolved Tampermonkey gate.
