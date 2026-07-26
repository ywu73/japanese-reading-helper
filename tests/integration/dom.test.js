import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import {
  annotateTextNode,
  convertExistingKanaRuby,
  restoreAll,
  shouldSkipTextNode,
} from "../../src/dom.js";

const analyze = (text) => {
  if (text === "日本語を勉強する") {
    return [
      { type: "annotation", surface: "日本語", reading: "ニホンゴ", romaji: "nihongo" },
      { type: "text", text: "を" },
      { type: "annotation", surface: "勉強", reading: "ベンキョウ", romaji: "benkyō" },
      { type: "text", text: "する" },
    ];
  }
  return [{ type: "text", text }];
};

test("adds attributable ruby and restores the exact original text", () => {
  const dom = new JSDOM(`<p id="target">日本語を勉強する</p>`);
  const { document } = dom.window;
  const p = document.querySelector("#target");

  assert.equal(annotateTextNode(p.firstChild, analyze(p.textContent)), true);
  assert.equal(p.querySelectorAll("ruby[data-yomi-ruby-generated]").length, 2);
  assert.equal(p.querySelector("rt.yomi-ruby-rt").textContent, "nihongo");
  assert.equal(p.querySelector("ruby").getAttribute("data-yomi-ruby-kana"), "ニホンゴ");
  assert.equal(p.querySelector("ruby").tabIndex, 0);

  restoreAll(document);
  assert.equal(p.innerHTML, "日本語を勉強する");
});

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

  restoreAll(document);
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

test("preserves nested inline markup while annotating eligible text nodes", () => {
  const dom = new JSDOM(`<p id="nested">前<strong>日本語</strong>後</p>`);
  const { document } = dom.window;
  const strong = document.querySelector("strong");
  const originalOuter = strong.outerHTML;

  annotateTextNode(strong.firstChild, [{
    type: "annotation",
    surface: "日本語",
    reading: "ニホンゴ",
    romaji: "nihongo",
  }]);
  assert.equal(document.querySelector("#nested").firstChild.textContent, "前");
  assert.equal(strong.tagName, "STRONG");
  restoreAll(document);
  assert.equal(strong.outerHTML, originalOuter);
});

test("repeat annotation and rollback cycles remain isolated", () => {
  const dom = new JSDOM(`<p>日本語を勉強する</p>`);
  const { document } = dom.window;
  const p = document.querySelector("p");

  for (let cycle = 0; cycle < 3; cycle += 1) {
    annotateTextNode(p.firstChild, analyze(p.textContent));
    assert.equal(p.querySelectorAll("[data-yomi-ruby-generated]").length, 2);
    restoreAll(document);
    assert.equal(p.innerHTML, "日本語を勉強する");
  }
});
