import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import {
  convertExistingKanaRuby,
  restoreConvertedKanaRuby,
  shouldSkipTextNode,
} from "../../src/dom.js";

test("converts author kana ruby, preserves Katakana Terminator, and restores attributes", () => {
  const dom = new JSDOM(`
    <main>
      <ruby id="author" class="original">日本語<rt title="reading">にほんご</rt></ruby>
      <ruby id="kt">型<rt class="katakana-terminator-rt" data-rt="type">タイプ</rt></ruby>
    </main>
  `);
  const { document } = dom.window;
  const authorRt = document.querySelector("#author rt");
  const originalMarkup = document.querySelector("main").innerHTML;

  assert.equal(convertExistingKanaRuby(document), 1);
  assert.equal(authorRt.textContent, "nihongo");
  assert.equal(authorRt.getAttribute("title"), "reading");
  assert.equal(document.querySelector("#kt rt").textContent, "タイプ");

  restoreConvertedKanaRuby(document);
  assert.equal(document.querySelector("main").innerHTML, originalMarkup);
});

test("skips unsafe, hidden, editable, code, ruby, and form nodes but permits links", () => {
  const dom = new JSDOM(`
    <main>
      <script>日本語</script><style>.日本語{}</style><code>日本語</code>
      <form><label>日本語<input value="日本語"></label></form>
      <div contenteditable="true">日本語</div><div hidden>日本語</div>
      <div aria-hidden="true">日本語</div><div style="display:none"><span>日本語</span></div>
      <ruby>日本<rt>にほん</rt></ruby>
      <a id="link" href="/日本語">日本語</a>
    </main>
  `);
  const { document } = dom.window;
  const nodes = [...document.querySelectorAll("main *")]
    .map((element) => element.firstChild)
    .filter((node) => node?.nodeType === 3 && node.textContent.includes("日本語"));

  for (const node of nodes) {
    const allowedLink = node.parentElement.id === "link";
    assert.equal(shouldSkipTextNode(node), !allowedLink, node.parentElement.outerHTML);
  }
});

test("skips YomiRuby status UI", () => {
  const dom = new JSDOM(`<div data-yomi-ruby-status>罗马音标注已开启</div>`);
  const { document } = dom.window;
  const statusText = document.querySelector("[data-yomi-ruby-status]").firstChild;

  assert.equal(shouldSkipTextNode(statusText), true);
});
