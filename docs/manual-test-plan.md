# Chrome and Tampermonkey manual test plan for YomiRuby 0.1.4

Do not install the candidate until the user explicitly authorizes installation.

1. Build `dist/yomi-ruby.user.js` and inspect the metadata header. Confirm
   `@name YomiRuby`, `@name:zh-CN 日语网页注音助手`, `@version 0.1.4`, and
   `@namespace yomi-ruby.local`.
2. Start a local static server for `tests/fixtures/manual.html`; keep DevTools
   Network and Console open before enabling the userscript.
3. While saving/updating the candidate, confirm Tampermonkey accepts all twelve
   SRI `@resource` entries. Installation/update may download approximately
   17.0 MiB once; record the actual extension-background evidence available.
4. On an unconfigured origin, confirm the only YomiRuby command is **开启本网站自动标注**
   and that no YomiRuby style, status, observer, or dictionary read exists before the
   click. Click it and confirm the menu immediately becomes **关闭本网站自动标注**
   before tokenizer initialization finishes. Confirm runtime reads use only
   local resource URLs and no runtime request reaches unpkg. Confirm no request
   carries page text, title, origin, or a request body.
5. Check ordinary kanji, mixed `食べる`, macrons, `思う`, unknown readings,
   links, author ruby, and Katakana Terminator ruby.
6. Hover and keyboard-focus a generated ruby; confirm romaji stays above the
   word and kana appears in the tooltip.
7. Confirm form controls, editable content, code/pre, hidden content, SVG/MathML
   if added, and Katakana Terminator annotations are unchanged.
8. Click the dynamic-content button and scroll distant content into view. Check
   incremental annotation without an observer loop or duplicate ruby.
9. Use **关闭本网站自动标注** during loading, after loading, and after adding
   dynamic content. Confirm the menu immediately returns to the single enable
   command, queued work stops, all project ruby and author-rt conversions are
   restored exactly, and a late tokenizer result cannot restart annotation.
10. Repeat enable/disable three times. Simulate an asset failure and a hash
    mismatch; confirm fail-closed behavior and no partial annotation.
11. Reload an allowed origin and verify it starts automatically with only the
    close command present. Disable it, reload, and confirm it remains off. Verify
    another protocol, hostname, or port remains unaffected. Simulate a setting
    write failure and confirm the page stays fail closed with an explicit error.
    Rapidly enable, disable, and enable again; the last action must determine
    both the persisted origin value and the single visible menu.
12. Reload repeatedly and record whether the extension performs any new remote
    dictionary transfer. Do not infer persistent caching merely from a page
    target Blob URL or a request row without transferred-byte evidence.
13. Repeat the same checks on x.com: strict CSP, dynamic posts, links, composer,
    menus, rollback, and coexistence with the separately installed Katakana
    Terminator. Do not enable x.com automatic mode until manual activation is
    stable.
14. Treat the namespace change as a script-identity cutover. Disable or remove
    the old Japanese Romaji Ruby entry before activating YomiRuby, and confirm
    Tampermonkey contains only one active entry. Confirm a legacy exact-origin
    `jrr:auto-origin:` value is ignored, the new `yomi-ruby:auto-origin:` value
    controls the menu, and every previously allowed origin defaults to off until
    the user explicitly enables it again.
