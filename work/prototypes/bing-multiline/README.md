# PROTOTYPE — Bing multiline katakana mapping

## Question

Can YomiRuby replace one-candidate-per-POST Bing katakana traffic with a small
newline-joined POST while still mapping every English line back to the exact
source candidate without guessing?

This is throwaway protocol and mapping evidence. It is not production code and
does not change `src/`, `dist/`, settings, endpoints, or runtime behavior.

## Run

```bash
npm run prototype:bing-multiline
```

The terminal shows the complete mapping state. Use `n`/`p` to move through the
captured live cases, `d` to remove an output line, and `m` to merge two output
lines. The strict mapper rejects the corrupted cases instead of shifting later
translations onto the wrong katakana source.

For a non-interactive summary:

```bash
npm run prototype:bing-multiline -- --summary
```

## Live evidence boundary

On 2026-07-29, Chrome loaded `https://www.bing.com/translator`, which redirected
to `https://cn.bing.com/translator`. The visible page was explicitly configured
for Japanese to English. Synthetic katakana was entered into the page while the
page's network traffic was observed.

Six completed multiline cases containing 3, 5, or 10 candidates each used one
`POST https://cn.bing.com/ttranslatev3` with the candidates joined by newlines
in the single `text` form field. Every captured response preserved the same line
count and order. The stored evidence deliberately omits temporary key/token
values and unrelated Bing telemetry.

The responses reported `usedLLM: true`. A direct comparison also changed
`ニューラルネットワーク` from `Neural networks` inside a five-line batch to
`Neural network` when sent individually. The observed transport structure is
therefore promising, but batch context can change wording.

The Bing webpage also reused some previously translated lines without creating
a new `/ttranslatev3` request. Those cache hits were not recorded as independent
transport evidence.

## Verdict

The live samples establish **bounded feasibility**, not a stable contract:

- newline-joined `text` is accepted by the current Bing webpage transport;
- the observed responses retained positional line structure;
- strict all-or-nothing line-count validation prevents obvious shifted mapping;
- the response does not echo each original line, so mapping remains positional;
- `usedLLM: true` and the singular/plural difference show context sensitivity;
- the experiment did not install a userscript or exercise `GM_xmlhttpRequest`;
- the endpoint remains undocumented and may change without notice.

Production integration should remain blocked until the same request shape is
captured through the installed Tampermonkey path and a larger repeated corpus
meets an explicit reliability threshold. GET remains out of scope because it
would put candidate text and temporary credentials into the URL without solving
the positional-mapping problem.
