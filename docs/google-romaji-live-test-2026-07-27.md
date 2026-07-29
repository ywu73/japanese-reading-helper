# Google no-key romaji live test — 2026-07-27

## Purpose and decision boundary

This document records a one-time live capability probe against Google's
no-key web translation endpoint. The probe asked whether the endpoint can
return a Latin-script reading when the submitted source is Japanese kanji.

The user explicitly authorized sending one context-free kanji sample for this
test. That authorization was limited to the probe recorded here. It does not
change YomiRuby's product boundary: the implemented kanji-reading path remains
local, and the online translation feature remains limited to matched katakana
phrases after exact-origin enablement. It also does not authorize a source,
build, userscript, installation, or release change.

Only Google results are recorded here. The separate Bing attempt and its
time-specific failure are deliberately outside this document.

## Test identity

| Field | Recorded value |
|---|---|
| Local test date | 2026-07-27, Asia/Shanghai |
| Repository baseline | `main` at `9b4d0f4b2fe9d028c21c7642532f54d2a0518d67` |
| Endpoint | `https://translate.googleapis.com/translate_a/single` |
| Authentication | No account, API key, or application credential |
| HTTP method | `GET` |
| Source language | `ja` |
| Target language | `en` |
| Decisive sample | `山` |
| Expected English meaning | `mountain` |
| Expected Japanese reading | `やま` / `yama` |
| Network path | `curl` through the active local macOS HTTP(S) proxy at `127.0.0.1:7897` |

The initial sample was `漢字`. Google returned `Kanji`, but that observation is
ambiguous because the English loanword and Japanese romanization are the same
apart from capitalization. The decisive sample was therefore changed to `山`,
whose English translation (`mountain`) and romanization (`yama`) are distinct.

No surrounding sentence, page title, page URL, origin, browsing history, or
other page-derived value was included. The source character was nevertheless
disclosed to Google in the URL query string.

## Control: the current `dt=t` request

YomiRuby's current Google adapter requests only the translation response item:

```text
GET https://translate.googleapis.com/translate_a/single
    ?client=gtx
    &dt=t
    &sl=ja
    &tl=en
    &q=%E5%B1%B1
```

Normalized reproduction command, excluding the environment-specific proxy
argument:

```sh
curl --silent --show-error --max-time 25 --get \
  'https://translate.googleapis.com/translate_a/single' \
  --data-urlencode 'client=gtx' \
  --data-urlencode 'dt=t' \
  --data-urlencode 'sl=ja' \
  --data-urlencode 'tl=en' \
  --data-urlencode 'q=山'
```

The live response was HTTP 200:

```json
[[["mountain","山",null,null,2]],null,"ja",null,null,null,null,[]]
```

### Control interpretation

The response contains the English translation `mountain`. It does not contain
`yama` or another explicit Latin-script source reading. The current `dt=t`
request therefore did not return romaji for this sample.

## Probe: add the `dt=rm` response item

The second request kept the same endpoint, source, target, and sample, and
added a second `dt` value:

```text
GET https://translate.googleapis.com/translate_a/single
    ?client=gtx
    &dt=t
    &dt=rm
    &sl=ja
    &tl=en
    &q=%E5%B1%B1
```

Normalized reproduction command:

```sh
curl --silent --show-error --max-time 25 --get \
  'https://translate.googleapis.com/translate_a/single' \
  --data-urlencode 'client=gtx' \
  --data-urlencode 'dt=t' \
  --data-urlencode 'dt=rm' \
  --data-urlencode 'sl=ja' \
  --data-urlencode 'tl=en' \
  --data-urlencode 'q=山'
```

The live response was HTTP 200:

```json
[[["mountain","山",null,null,2],[null,null,null,"Yama"]],null,"ja",null,null,null,0,[],[["ja"],null,[0],["ja"]]]
```

For this observed response, the returned values can be addressed as:

```js
payload[0][0][0] === "mountain";
payload[0][0][1] === "山";
payload[0][1][3] === "Yama";
```

### Probe interpretation

`Yama` is distinct from the English translation and matches the expected
Latin-script reading of `山`. The live endpoint therefore returned a romaji-like
source reading for this sample when `dt=rm` was requested.

This single sample does not establish that the output is consistently Hepburn,
that capitalization is stable, that long vowels use macrons, or that readings
are reliable for names, compounds, mixed kanji-kana words, unknown tokens, or
context-dependent Japanese.

## Relationship to the current implementation

The current source sets only one response item:

```js
url.searchParams.set("dt", "t");
```

See `src/katakana-translation.js` in `buildUrl()`.

The current parser also accepts translation tuples by reading `item[0]` as the
translated text and `item[1]` as the original phrase. It does not extract the
observed romaji location at `payload[0][1][3]`. Adding `dt=rm` to the request
without a separate, strict response parser would therefore not make the
current client return `Yama`.

The implemented Google client also filters and batches matched katakana
phrases. It is not currently a remote kanji-reading client. This probe must not
be represented as an implemented or deliverable YomiRuby capability.

## Privacy and transport implications

Google receives the complete `q` value. Because the request uses `GET`, the
submitted text also appears in the request URL and may be visible to the
browser, userscript manager, network stack, local proxy, upstream proxy, Google,
and their respective logging surfaces.

Using `dt=rm` does not remove that disclosure. A future remote-kanji design
would disclose text that the current product intentionally keeps local. Such a
change would require a new explicit product decision, revised user disclosure,
strict input filtering, request and response validation, cancellation and
rollback coverage, and real Tampermonkey network observation.

## Reliability limitations

`translate.googleapis.com/translate_a/single` is an undocumented,
non-contractual web endpoint rather than a supported project API. This test is
time-bounded evidence, not a stability guarantee. Availability, network
reachability, rate limits, accepted parameters, response positions,
capitalization, romanization behavior, and continued no-key access may change
without notice.

The direct command-line connection to `translate.googleapis.com` timed out in
the test environment. Both successful Google requests used the active local
macOS proxy. That proves the two responses through that network path only; it
does not prove direct mainland-China reachability or Chrome/Tampermonkey
behavior.

The following were not tested:

- a real Chrome or Tampermonkey request;
- extension-background request headers or storage behavior;
- batching or throttling with `dt=rm`;
- long vowels such as `東京` / `Tōkyō`;
- mixed kanji-kana words, proper names, or ambiguous readings;
- failure, malformed-response, abort, disable, or rollback cycles;
- output correctness across a representative Japanese corpus.

## Recorded conclusion

On 2026-07-27, the anonymous no-key Google endpoint returned only `mountain`
for `山` with the current `dt=t` request. With `dt=rm` added, the same endpoint
returned both `mountain` and `Yama`, with the observed romaji value at
`payload[0][1][3]`.

The narrow capability finding is therefore positive: Google returned a
romaji-like reading when explicitly asked for the `rm` response item. The
product conclusion remains unchanged: YomiRuby's current Google adapter neither
requests nor parses that value, the kanji path remains local, and no remote
kanji-romaji feature has been approved or implemented.
