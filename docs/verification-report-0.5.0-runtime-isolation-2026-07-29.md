# YomiRuby 0.5.0 runtime-isolation verification — 2026-07-29

## Scope

This report records local evidence for the 0.5.0 runtime-isolation refactor. It
does not supersede the earlier online-kanji capability report and does not turn
0.5.0 into a published or browser-validated release.

The implementation replaces cross-owned session/coordinator state with:

- `KanjiRuntime`, which owns its selected analyzer adapter, enable-cycle cache,
  FIFO, waiters, cancellation, generation, pause/resume, and mode lifecycle;
- `KatakanaRuntime`, which independently owns the corresponding translation
  state and provider lifecycle;
- a DOM-only coordinator that owns safe foreground scanning, approximately
  500 ms mutation buffering, cooperative ordered chunks, visibility handling,
  text ownership, overlap arbitration, ruby rendering, and rollback.

Google katakana remains a bounded multi-phrase request path with both the
50-phrase and 1800-character encoded-URL limits. Google kanji, Bing kanji, and
Bing katakana retain one exact candidate per HTTP request. No cross-provider
fallback was added.

## Automated evidence executed in this session

The pre-change mixed 0.5.0 baseline first passed `npm test` with 162 tests.
After replacing the old shallow-interface tests with tests at the new runtime
and DOM seams, the final suite passed:

```text
tests 150
pass 150
fail 0
```

The final tests directly cover exact pending sharing, success/failure caching,
FIFO, full-width/half-width identity separation, independent same-provider
runtimes, cancellation and generation replacement, katakana overlap priority
and failure release, full safe foreground scanning, dynamic additions, injected
500 ms scheduling, hidden/visible behavior, cooperative-scan cancellation,
Katakana Terminator preservation, DOM safety, and repeated exact rollback.

The session also executed the complete local check chain before the final two
evidence-only test additions:

- real Kuromoji loader: 12 preloaded local assets verified;
- feasibility prototype: all 12 dictionary assets loaded and representative
  Japanese text tokenized;
- preloaded-resource prototype: 12 verified Blob assets, with no remote runtime
  URL;
- generated userscript build and static audit: passed;
- vendor verification: all 12 `kuromoji@0.1.2` assets matched recorded byte
  sizes and SHA-256 digests;
- `git diff --check`: passed.

After the final test additions, `npm test`, `npm run build`,
`node scripts/audit-build.mjs`, `npm run verify:deterministic-build`, and
`git diff --check` passed again. The deterministic generated artifact is:

```text
dist/yomi-ruby.user.js
size: 232179 bytes
sha256: 16338ad5ffccf7d3a34fb82170b5723fb0528607bcdc0912e8076ff48a85ba9a
```

## Static boundary evidence

The build audit continues to require exactly five `GM_xmlhttpRequest` call
sites: the local-resource reader plus independent Google/Bing katakana and
kanji adapters. It also asserts the three exact `@connect` hosts, approved
persistent keys, five-menu order, source-romaji response gates, and the absence
of ordinary fetch/XHR/WebSocket/EventSource/sendBeacon, page storage, dynamic
evaluation, wildcard Bing permission, or extra request paths.

New source-level assertions require both runtime modules and reject provider,
translation cache/queue, online-reading, and IntersectionObserver ownership in
the DOM coordinator.

## Deliberate limits

This session did not install or update the userscript, operate Chrome or a real
site, send real Google/Bing candidates, disable or modify Katakana Terminator,
stage or commit files, push Git state, publish a tag/release, or change the
0.5.0 version. Consequently, these local results do not prove Tampermonkey
transport, extension-background privacy, provider-wide throttling behavior,
real-site accuracy/performance, browser compatibility, or complete browser
rollback. The production status remains NO-GO pending the existing manual and
release gates.
