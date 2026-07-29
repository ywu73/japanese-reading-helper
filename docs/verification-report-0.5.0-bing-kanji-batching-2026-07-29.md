# YomiRuby 0.5.0 Bing kanji romaji batching verification — 2026-07-29

## Decision and scope

The user authorized a one-time live probe against Google's no-key romaji
endpoint and Bing's translator webpage to decide whether online kanji
romanization can be batched the way the existing katakana translation path is
batched. Based on the probe evidence recorded below, only the **Bing** kanji
romaji transport was changed to newline batching. The **Google** kanji romaji
path was left one word per request because the probe showed its romaji output
cannot be positionally mapped.

This report records the probe evidence, the resulting implementation, and local
verification. It does not supersede the earlier
`verification-report-0.5.0-bing-katakana-batching-2026-07-29.md`; the two align
Bing katakana and Bing kanji romaji on the same bounded batch limits.

No endpoint, persistent setting, cross-provider fallback, surrounding-text
submission, macron/style normalization, or remote telemetry path was added. The
product boundary is unchanged: online kanji romaji stays behind explicit
exact-origin enablement and provider selection.

## Live probe evidence

The probe ran locally on 2026-07-29 (Asia/Shanghai). Google
`translate.googleapis.com` timed out on a direct connection and succeeded only
through the active local macOS proxy at `127.0.0.1:7897`; Bing
`www.bing.com/translator` was reachable directly and redirected to
`https://cn.bing.com/translator`.

### Google `dt=rm` — batch mapping is not possible

A multiline `q` (`神奈川県\n大阪市\n東京都`) returned:

```json
[[["Kanagawa prefecture\n","神奈川県\n",...],["Osaka city\n","大阪市\n",...],
  ["Tokyo","東京都",...],
  [null,null,null,"Kanagawa ken Ōsaka ichi Tōkyōto"]],null,"ja",...]
```

The translation tuples echo each source line, but the romaji item (`item[3]`)
is a single **space-joined** string with **no newline boundary and no echoed
source**. A single word's romaji can itself contain a space
(`神奈川県` alone returned `"Kanagawa ken"`), so splitting the romaji string on
spaces cannot recover per-word boundaries. Google kanji romaji therefore remains
one word per request.

### Bing `to=ja` — batch mapping is reliable

Multiline `text` posted to `/ttranslatev3` with `to=ja` returned, for
`神奈川県\n大阪市\n東京都` and for `山\n東京\n日本語\n水曜日\n新聞`:

```json
[{"translations":[{"text":"神奈川県\n大阪市\n東京都","to":"ja",
  "transliteration":{"text":"Kanagawa-ken\nOsakashi\nToukyou-to","script":"Latn"}}],
  "usedLLM":true,"detectedLanguage":{"language":"ja"}},
 {"inputTransliteration":"Kanagawa-ken\nOsakashi\nToukyou-to","script":"Latn"}]
```

Both the echoed `translations[0].text` and the `inputTransliteration` preserved
the input `\n` count and order in every observed case. This gives two aligned
anchors: the echoed source lets each line be checked against its input word, and
the transliteration lines map positionally. Bing romaji uses hyphens
(`Kanagawa-ken`) and no macrons (`Toukyou-to`), both already accepted by the
existing `SAFE_ROMAJI` set.

A valid POST required full browser-like request headers; a bare request returned
`{"ShowCaptcha":false}`. GET was not used: it would expose candidate text and
temporary credentials in the URL without a stronger mapping.

## Implemented behavior

Bing kanji romaji now shares the katakana batch limits:

| Limit | Bing katakana | Bing kanji romaji |
| --- | --- | --- |
| Maximum words per batch | 50 | 50 |
| Encoded budget | `encodeURIComponent(join("\n")).length` ≤ 1800 | same |
| Minimum interval between batch starts | 250 ms | 250 ms (was 1000 ms per word) |
| Request timeout | 8000 ms | 8000 ms |

Eligible words still require kanji, at most 200 characters, no control
characters, and no surrounding whitespace. They are deduplicated without
normalization and keep stable FIFO order. Each serialized POST sends one
newline-joined `text` field with `fromLang=ja` and `to=ja` to the initialized
allowed Bing origin's exact `/ttranslatev3` path.

The response mapper splits both `translations[0].text` and
`inputTransliteration` on `\r?\n`. Both line counts must equal the input word
count, and each echoed line must equal its input word after trimming. Any
line-count drift or echo mismatch discards the **whole batch** and never
misattributes a later reading to an earlier word. When alignment holds, each
transliteration line is validated independently against `SAFE_ROMAJI` and the
1000-character romaji limit; a single unsafe line skips only that word. Wrong
target, wrong script, malformed or extra metadata, CAPTCHA, and malformed JSON
all yield no readings for the batch.

HTTP 401 invalidates the temporary Bing configuration once, reloads it, and
retries only the affected batch. A second 401, HTTP 429, timeout, redirect,
network failure, or cancellation remains fail-closed with no cross-provider
fallback.

## Automated verification

The focused Bing kanji romaji suite passed after implementation:

```text
tests 18
pass 18
fail 0
```

It covers single-word requests, multiline batching with positional mapping,
exact deduplication and FIFO order, the 50-word split with a 250 ms interval,
whole-batch discard on line-count drift and on echo mismatch, per-line unsafe
romaji skipping, `zh-Hans` detected-language tolerance, rewritten-source and
malformed-metadata rejection, batch-level 401 refresh/retry, HTTP 429 fail-close,
and cancellation.

The complete repository suite and the full `npm run check` chain passed,
including the real local Kuromoji loader, prototypes, userscript build, and the
static build audit (now asserting the aligned Bing kanji batch limits, newline
request body, dual newline response parsing, and exact line-count alignment):

```text
tests 164
pass 164
fail 0

npm run verify:deterministic-build
deterministic build passed: 235795 bytes
sha256=49fc85a97741b992d33d093fa424ac126aca9c53b33d40a601a7d8e0dcb3bb7a
```

## Deliberate limits

The probe exercised the Google web endpoint through a local proxy and the Bing
Translator webpage with curl, not an installed YomiRuby userscript through
Tampermonkey's `GM_xmlhttpRequest`. It did not capture batching on a real
third-party site, and it did not install, update, commit, push, or release
anything.

The local checks and probe therefore do not prove installed Tampermonkey
transport, browser-wide privacy, long-run provider stability, romanization
accuracy, real-site performance, or complete rollback. Bing `/ttranslatev3` and
Google `dt=rm` remain undocumented webpage-internal interfaces that may change
without notice, so the observed multiline mapping is bounded evidence, not a
provider contract. Production/release status remains NO-GO until the existing
manual and release gates are completed and recorded.
