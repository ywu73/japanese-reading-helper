# Security and privacy boundary

## Guaranteed by design and automated checks

Page text is passed only to the in-page Kuromoji tokenizer. The userscript has no
remote reading, translation, AI, analytics, or logging endpoint. It does not put
page text, readings, titles, or history into a URL, request body, or persistent
store.

The userscript metadata declares twelve exact `@resource` URLs, each pinned to
`kuromoji@0.1.2` and protected by a SHA-256 SRI fragment. Tampermonkey performs
resource acquisition while installing or updating the script. The runtime has
no `@connect` permission and contains no remote dictionary URL outside the
metadata block.

The only request primitive in the built runtime is `GM_xmlhttpRequest`, used to
read a URL returned by `GM_getResourceURL`. The loader accepts only `blob:`,
`data:`, `chrome-extension:`, or `moz-extension:` resource URLs and rejects an
HTTPS result before making a request. Callers cannot add page-derived query
parameters or bodies. Every response is treated as dictionary bytes, checked
for its exact length and SHA-256 digest, and rejected before dictionary use if
either check differs.

Kuromoji executable modules are statically bundled from the exact
`kuromoji@0.1.2` npm dependency. The generated userscript is audited to reject
`eval`, `new Function`, the legacy `Function("return this")` fallback, and the
remote Kuromoji browser-bundle URL. A project-owned static tokenizer consumes
only preloaded, verified, in-memory dictionary files; it has no native XHR,
fetch, remote-URL, or runtime-download fallback.

Compressed dictionary bytes are removed from the loader map after tokenizer
construction. Token and reading caches live only inside the current page. The
only project-owned persistent value is a boolean automatic-run preference keyed
by the current origin. Tampermonkey separately owns the preloaded `@resource`
dictionary storage; no page text or reading is written there.

## Deliberate limitations

The script executes statically bundled modules from the pinned but old Kuromoji
0.1.2 package. Exact npm version and lockfile integrity protect build
reproducibility; they do not make old code newly maintained or prove it has no
latent defect.

Adding `tabindex="0"` makes generated ruby reachable by keyboard so its kana
tooltip can appear on focus. On a dense Japanese page this adds many tab stops.
This is currently an explicit accessibility tradeoff, not a claim of ideal
keyboard navigation.

Automated jsdom, Node, a Blob-resource prototype, and a strict-CSP controlled
browser fixture cannot prove that Tampermonkey persists binary `@resource`
assets across full page reloads or exposes them through a compatible local URL
on x.com. Actual Chrome plus Tampermonkey validation of the YomiRuby 0.1.4
candidate remains mandatory before claiming a clean script-identity cutover,
persistent caching, x.com compatibility, or complete extension network behavior.
