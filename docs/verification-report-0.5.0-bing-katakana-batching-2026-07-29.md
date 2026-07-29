# YomiRuby 0.5.0 Bing katakana batching verification — 2026-07-29

## Decision and scope

The user explicitly chose to align Bing katakana batching with the existing
Google katakana path on candidate count, encoded payload budget, inter-batch
interval, and timeout. This report records the resulting implementation,
current Bing webpage evidence, and local verification. It does not supersede
the earlier runtime-isolation snapshot, whose one-candidate-per-request
description was accurate when that report was recorded.

Only the Bing katakana transport changed. Bing kanji romaji still sends one
locally segmented Japanese word per request. No endpoint, persistent setting,
cross-provider fallback, surrounding-text submission, or remote telemetry path
was added.

## Implemented behavior

Google and Bing katakana now share these limits:

| Limit | Google katakana | Bing katakana |
| --- | --- | --- |
| Maximum candidates per batch | 50 | 50 |
| Encoded budget | Complete GET URL at most 1800 characters | `encodeURIComponent(phrases.join("\n")).length` at most 1800 characters |
| Minimum interval between batch starts | 250 ms | 250 ms |
| Request timeout | 8000 ms | 8000 ms |

Bing retains the existing 200-character maximum for each individual phrase.
Eligible exact phrases are deduplicated without normalization and retain stable
FIFO order. Each serialized POST sends one newline-joined `text` field to the
initialized allowed Bing origin's exact `/ttranslatev3` path.

The response mapper splits the single translated string only on `\r?\n`. The
output line count must exactly equal the input phrase count, and every line must
be non-empty, differ from its corresponding source phrase, and contain a Latin
character. A wrong target, contradictory detected language, malformed response,
missing line, extra line, blank line, unchanged line, or non-Latin line rejects
the complete operation. It never shifts later output onto an earlier phrase,
resends individual phrases after a mapping failure, or falls back to Google.

HTTP 401 invalidates the temporary Bing configuration once, reloads it, and
retries only the affected batch. A second 401, HTTP 429, CAPTCHA, timeout,
redirect, network failure, malformed response, or cancellation remains
fail-closed.

## Live Bing webpage evidence

On 2026-07-29, Chrome loaded `https://www.bing.com/translator`, followed the
current redirect to `https://cn.bing.com/translator`, and explicitly selected
Japanese to English. Six completed multiline cases containing 43 candidates in
total were captured: a 3-candidate common case, a 5-candidate varied case, two
10-candidate boundary/common cases, a 5-candidate rare case, and a 10-candidate
reversed-order case.

Each completed case produced one:

```text
POST https://cn.bing.com/ttranslatev3
```

The request placed newline-joined candidates in the single `text` form field.
All six observed responses preserved input line count and order. Temporary
key/token values and unrelated Bing telemetry were not retained.

All observed responses reported `usedLLM: true`. A direct comparison showed
batch-context sensitivity:

```text
ニューラルネットワーク
multiline batch: Neural networks
individual request: Neural network
```

This is current bounded transport evidence, not a documented Bing API contract
or a provider-wide semantic guarantee. The response does not echo every source
line, so the accepted mapping remains positional and deliberately strict.

GET was excluded. It would expose candidate text and temporary credentials in
the URL while providing no stronger source-to-output mapping.

## Automated verification

The focused Bing translation suite passed after implementation:

```text
tests 47
pass 47
fail 0
```

It covers newline batching, exact deduplication, stable FIFO order, the
50-candidate split, encoded-payload splitting, the default 250 ms interval,
the default 8000 ms timeout, batch-level 401 refresh/retry, strict line mapping,
redirect and temporary-config parsing, CAPTCHA, HTTP 429, timeout, cancellation,
and absence of retry/fallback after non-401 failures.

The complete repository test suite passed:

```text
tests 158
pass 158
fail 0
```

The complete local `npm run check` chain also passed, including the full test
suite, the real local Kuromoji loader with 12 assets, the feasibility and
preloaded-resource prototypes, the userscript build, and the static build
audit. The audit now requires the aligned Bing limits, newline request body,
newline response parsing, and exact line-count validation.

Additional final checks passed:

```text
npm run verify:vendor
verified 12 pinned assets from https://unpkg.com/kuromoji@0.1.2/

npm run verify:deterministic-build
deterministic build passed: 233929 bytes
sha256=0941805a2a856c297739a1ad4fc8281318aefaeaf0543fbbd252d72f31f51e7b

git diff --check
passed
```

The generated artifact recorded by these checks is:

```text
dist/yomi-ruby.user.js
size: 233929 bytes
sha256: 0941805a2a856c297739a1ad4fc8281318aefaeaf0543fbbd252d72f31f51e7b
```

## Deliberate limits

The live experiment exercised the Bing Translator webpage, not an installed
YomiRuby userscript. It did not capture newline batching through Tampermonkey's
real `GM_xmlhttpRequest` path. This session did not install or update the
userscript, operate the implementation on a real third-party site, publish a
release, stage or commit files, push Git state, or modify the existing mixed
worktree outside the requested implementation and evidence paths.

Consequently, the local checks and webpage experiment do not prove installed
Tampermonkey transport, browser-wide privacy, long-run provider stability,
translation accuracy, real-site performance, browser compatibility, or
complete rollback. Bing `/ttranslatev3` remains an undocumented webpage-
internal interface that may change without notice. Production/release status
therefore remains NO-GO until the existing manual and release gates are
completed and recorded.
