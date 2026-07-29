# YomiRuby 0.4.1 local verification report — 2026-07-27

## Candidate identity

| Field | Verified value |
|---|---|
| Branch | `main` |
| Baseline `HEAD` | `9b4d0f4b2fe9d028c21c7642532f54d2a0518d67` |
| Baseline `origin/main` | `9b4d0f4b2fe9d028c21c7642532f54d2a0518d67` |
| Package/userscript version | `0.4.1` |
| Node | `v24.14.0` |
| npm | `11.9.0` |
| Artifact | `dist/yomi-ruby.user.js` |
| Artifact size | `192803` bytes |
| Artifact SHA-256 | `b60ea52fee17fcc07ec27fb91d1a4e6672e9ce3d03b51f4a08444a535b72bb72` |

The 0.4.1 changes remain unstaged working-tree changes on the synchronized
baseline above. No commit, branch creation, push, PR, merge, tag, userscript
installation, Chrome/Tampermonkey mutation, or release/publication action was
performed.

The untracked `docs/google-romaji-live-test-2026-07-27.md` file predates this
Bing repair and is a separate user-authorized documentation change. It was
preserved but is not evidence for the 0.4.1 Bing compatibility implementation.

## Problem and root cause

The 0.4.0 Bing client failed against the translator page and response observed
on 2026-07-27 for two independent schema changes:

1. The initializer no longer exposed IG only as
   `window._G.IG = "..."`. The observed page used a bounded global object
   initializer containing `IG: "..."`, so the strict 0.4.0 parser found no IG
   and stopped before sending a phrase.
2. A successful `/ttranslatev3` response contained the required translation
   result followed by an `{ inputTransliteration, script: "Latn" }` metadata
   object. The 0.4.0 parser required `payload.length === 1` and rejected the
   otherwise valid response before reading the English translation.

A separate command-line differential found that Bing returned HTTP 401 to
Node/Undici's default User-Agent but returned HTTP 200 for the same anonymous,
Cookie-free request when the throwaway adapter used a Chrome-formatted
User-Agent. YomiRuby does not add or spoof a User-Agent. That finding diagnoses
the Node live-test harness and is not represented as a Tampermonkey transport
result.

## Implemented repair

- Retained the legacy direct `window._G.IG = "..."` parser.
- Added a separate bounded parser for `_G = { ..., IG: "...", ... }` object
  initializers without executing returned script.
- Combines direct and object-initializer IG candidates and still requires
  exactly one total candidate. Missing or duplicate values across either shape
  fail closed.
- Retained the exact approved initialization and translation hosts, paths,
  methods, query fields, form fields, redirect behavior, status validation,
  anonymous mode, timeout, serialization, and bounded 401 refresh.
- Accepts either one required translation result or that result followed by one
  exact bounded transliteration metadata object.
- Requires optional transliteration metadata to contain exactly
  `inputTransliteration` and `script`, with a non-empty, trimmed, bounded,
  Latin-bearing value and exact `script: "Latn"`.
- Validates and ignores optional transliteration metadata. It is not displayed,
  persisted, returned as the English translation, or routed into Local Kanji
  Romaji.
- Rejects a wrong script, non-Latin or oversized transliteration, unknown
  metadata field, third response item, duplicate translation, wrong target, or
  contradictory detected language.
- Added no Cookie, account state, custom User-Agent, new endpoint, remote kanji
  path, analytics, logging, or cross-provider fallback.

## Red-green regression evidence

Two focused regression tests were added before the source repair:

- current object-initializer IG shape reaches the Bing POST path;
- current optional transliteration metadata is accepted but not exposed as the
  English translation.

Before the repair, the focused Bing suite produced the intended red result:

```text
tests 38
pass 36
fail 2
```

The failures were the missing POST after the new IG fixture and
`Bing translation returned an unexpected response structure.` for the
two-element successful response.

After the repair, the same command passed:

```text
node --test tests/integration/bing-translation.test.js
tests 39
pass 39
fail 0
```

Negative regression coverage includes duplicate old/new IG candidates, wrong
transliteration script, non-Latin or oversized transliteration, extra metadata,
and a third response item.

## Live command-line feedback loop

Before the source repair, the current client failed twice at initialization
with:

```text
Bing translator initialization returned missing or ambiguous configuration.
```

After the repair, the original client path processed a fresh Bing
initialization page and successful response through the active local system
proxy. The throwaway GM adapter supplied a Chrome-formatted User-Agent only to
avoid the independently diagnosed Node/Undici 401 behavior. The source client
itself supplied no custom User-Agent or Cookie. The result was:

```json
{
  "verdict": "GREEN",
  "translations": [
    ["ゲーム", "Game"]
  ]
}
```

This is live command-line endpoint evidence, not real Chrome/Tampermonkey or
extension-background evidence.

## Automated local results

### Full repository check

`npm run check` passed. It included:

- all **123/123** unit and integration tests;
- real local loading of all twelve preloaded dictionary assets;
- expected local readings including `今日:kyō`, `東京:tōkyō`,
  `日本語:nihongo`, `勉強:benkyō`, `食べる:taberu`, `方法:hōhō`, and
  `思う:omou`;
- static Kuromoji feasibility with known and unknown token behavior;
- twelve verified Blob-resource round trips with no remote runtime URL;
- generation of `dist/yomi-ruby.user.js`;
- the 0.4.1 static build audit.

The build audit passed exact version and metadata, the fixed Google/Bing routes,
the three approved `@connect` hosts, three audited `GM_xmlhttpRequest` paths,
anonymous Bing behavior, strict current response compatibility, absence of a
custom User-Agent, approved storage calls, prohibited network/persistence and
dynamic-execution primitives, twelve SRI resources, and embedded canonical
licenses/notices.

### Vendor verification

The vendor verifier was run through the active local system proxy. It downloaded
all **12/12** pinned `https://unpkg.com/kuromoji@0.1.2/` dictionary resources.
Every byte length and SHA-256 matched `vendor/manifest.json`.

### Deterministic artifact

`npm run verify:deterministic-build` built the userscript twice and compared the
bytes. Both outputs were identical:

```text
192803 bytes
sha256=b60ea52fee17fcc07ec27fb91d1a4e6672e9ce3d03b51f4a08444a535b72bb72
```

An independent `shasum -a 256` and `wc -c` check returned the same digest and
size for the final artifact.

## Explicitly unverified and unauthorized gates

The following remain outstanding and are not claimed by this report:

- installation or execution of 0.4.1 in desktop Chrome + Tampermonkey;
- the actual User-Agent, Cookie, redirect, and request-header behavior of
  Tampermonkey's extension-background `GM_xmlhttpRequest`;
- extension-background proof that Bing traffic is limited to the approved
  hosts, paths, fields, and matched katakana phrase;
- no-proxy mainland-China reachability;
- actual browser behavior for token expiry, 401, 429, CAPTCHA, redirects,
  response-shape changes, abort, provider switching, and rollback;
- proof that only the matched phrase and no surrounding page context reaches
  Bing in the real extension environment;
- strict-CSP execution of this exact 0.4.1 artifact;
- x.com behavior, performance, translation accuracy, tabs, cross-origin
  behavior, and complete browser rollback;
- update from an older installed version through GitHub Raw;
- disabling or migrating a separately installed Katakana Terminator;
- staging, commit, push, PR, merge, tag, GitHub Release, or publication.

No claim of Chrome/Tampermonkey compatibility, extension-background privacy,
no-proxy mainland-China reachability, public availability, performance,
accuracy, or complete browser rollback is made by this local report.
