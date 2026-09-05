import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AnnotationCoordinator } from "../../src/coordinator.js";

const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

test("large excluded subtrees do not consume scan slices or hide safe siblings", () => {
  const dom = new JSDOM(`<p>東京</p><section><pre>${"<span>禁止</span>".repeat(5000)}</pre><form><div>入力</div></form></section><p>大阪</p>`);
  const harness = controlled(dom);
  let traversals = 0;
  const create = dom.window.document.createTreeWalker.bind(dom.window.document);
  dom.window.document.createTreeWalker = (...args) => {
    const walker = create(...args);
    for (const method of ["nextNode", "nextSibling", "parentNode"]) {
      const original = walker[method].bind(walker);
      walker[method] = () => { traversals++; return original(); };
    }
    return walker;
  };
  try {
    harness.start(); harness.drain();
    assert.deepEqual(harness.seen, ["東京", "大阪"]);
    assert.ok(traversals < 100, `Excluded descendants were traversed: ${traversals}`);
    assert.equal(dom.window.document.querySelector("pre").children.length, 5000);
  } finally { harness.stop(); }
});

test("blocked scan roots and terminal blocked children never escape into outer siblings", async () => {
  const dom = new JSDOM('<main></main><p>東京</p>');
  const harness = controlled(dom);
  try {
    harness.start(); harness.drain();
    dom.window.document.querySelector("main").innerHTML = '<section><p>京都</p><code><span>禁止</span></code></section><pre><span>入力</span></pre>';
    await tick(); harness.drain();
    assert.deepEqual(harness.seen, ["東京", "京都"]);
    assert.equal(harness.pending(), 0);
  } finally { harness.stop(); }
});

test("direct insertion inside code stays excluded and moving that content outside is scanned", async () => {
  const dom = new JSDOM('<main><pre id="code"></pre><section id="text"></section></main>');
  const harness = controlled(dom);
  try {
    harness.start(); harness.drain();
    const code = dom.window.document.querySelector("#code");
    code.innerHTML = '<span>東京</span><ruby>京都<rt class="author">きょうと</rt></ruby>';
    await tick(); harness.drain();
    assert.deepEqual(harness.seen, []);
    assert.equal(code.querySelector("rt").outerHTML, '<rt class="author">きょうと</rt>');
    dom.window.document.querySelector("#text").append(...code.childNodes);
    await tick(); harness.drain();
    assert.deepEqual(harness.seen, ["東京"]);
    assert.equal(dom.window.document.querySelector("rt").textContent, "kyōto");
    harness.coordinator.stop();
    assert.equal(dom.window.document.querySelector("rt").outerHTML, '<rt class="author">きょうと</rt>');
  } finally { harness.stop(); }
});

test("author ruby converts and restores while Terminator and generated ruby remain untouched", () => {
  const dom = new JSDOM('<ruby id="author">東京<rt class="original" title="reading">とうきょう</rt></ruby><ruby id="kt">ゲーム<rt class="katakana-terminator-rt">game</rt></ruby><ruby data-yomi-ruby-generated><span>大阪</span><rt>ōsaka</rt></ruby>');
  const harness = controlled(dom);
  const original = dom.window.document.body.innerHTML;
  try {
    for (let cycle = 0; cycle < 2; cycle++) {
      harness.start(); harness.drain();
      assert.equal(dom.window.document.querySelector("#author rt").textContent, "tōkyō");
      assert.equal(dom.window.document.querySelector("#kt rt").textContent, "game");
      assert.equal(dom.window.document.querySelectorAll("ruby").length, 3);
      assert.deepEqual(harness.seen, []);
      harness.coordinator.stop();
      assert.equal(dom.window.document.body.innerHTML, original);
    }
  } finally { harness.stop(); }
});

test("a queued scan root moved into a blocked parent during a yield is dropped", async () => {
  const dom = new JSDOM('<main></main><pre id="code"></pre>');
  const harness = controlled(dom, 1);
  try {
    harness.start(); harness.drain();
    const root = dom.window.document.createElement("section");
    root.innerHTML = '<p>東京</p><ruby>京都<rt>きょうと</rt></ruby>';
    dom.window.document.querySelector("main").append(root);
    await tick();
    harness.next(); // Flush the mutation root.
    harness.next(); // Visit only the section, then yield.
    dom.window.document.querySelector("#code").append(root);
    await tick(); harness.drain();
    assert.deepEqual(harness.seen, []);
    assert.equal(root.querySelector("rt").textContent, "きょうと");
    dom.window.document.querySelector("main").append(root);
    await tick(); harness.drain();
    assert.deepEqual(harness.seen, ["東京"]);
  } finally { harness.stop(); }
});

test("nested and dynamically inserted author ruby each convert and restore", async () => {
  const original = '<ruby id="outer"><ruby id="inner">東京<rt class="inner">とうきょう</rt></ruby><rt class="outer">とうきょう</rt></ruby>';
  const dom = new JSDOM(original);
  const harness = controlled(dom);
  try {
    harness.start(); harness.drain();
    assert.deepEqual([...dom.window.document.querySelectorAll("rt")].map((rt) => rt.textContent), ["tōkyō", "tōkyō"]);
    const added = '<ruby id="added">京都<rt title="new">きょうと</rt></ruby>';
    dom.window.document.querySelector("#outer").insertAdjacentHTML("beforeend", added);
    await tick(); harness.drain();
    assert.equal(dom.window.document.querySelector("#added rt").textContent, "kyōto");
    harness.coordinator.stop();
    assert.equal(dom.window.document.body.innerHTML, original.slice(0, -7) + added + "</ruby>");
  } finally { harness.stop(); }
});

function controlled(dom, scanBatchSize = 100) {
  const timers = [], seen = [];
  const coordinator = new AnnotationCoordinator({ document: dom.window.document,
    requestIdleCallback: null, now: () => 0, scanBatchSize,
    setTimer(callback) { const timer = { callback }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  const next = () => { const timer = timers.shift(); if (timer && !timer.cancelled) timer.callback(); };
  return { coordinator, seen, next,
    start() { coordinator.enableKanji({ plan(record) { seen.push(record.text); return { ranges: [] }; }, forget() {}, pause() {}, resume() {} }); },
    drain() { let remaining = 20000; while (timers.length && remaining-- > 0) next(); assert.ok(remaining > 0, "Unbounded scan loop"); },
    pending: () => timers.filter((timer) => !timer.cancelled).length,
    stop() { coordinator.stop(); dom.window.close(); },
  };
}
