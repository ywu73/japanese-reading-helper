import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { PageAnnotator } from "../../src/scheduler.js";

test("processes viewport-near content, handles additions, then cancels and rolls back", async () => {
  const dom = new JSDOM(`<main><p id="first">日本語</p></main>`, { pretendToBeVisual: true });
  const { document, MutationObserver } = dom.window;
  const intersections = [];
  const idleCallbacks = new Map();
  let idleId = 0;

  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      intersections.push(this);
    }
    observe(element) { this.elements.add(element); }
    unobserve(element) { this.elements.delete(element); }
    disconnect() { this.elements.clear(); }
    triggerAll() {
      this.callback([...this.elements].map((target) => ({ target, isIntersecting: true })));
    }
  }

  const scheduler = new PageAnnotator({
    document,
    analyzeText: analyze,
    IntersectionObserver: FakeIntersectionObserver,
    MutationObserver,
    requestIdleCallback(callback) {
      const id = ++idleId;
      idleCallbacks.set(id, callback);
      return id;
    },
    cancelIdleCallback(id) { idleCallbacks.delete(id); },
  });

  scheduler.start();
  assert.equal(document.querySelectorAll("[data-yomi-ruby-generated]").length, 0);
  intersections[0].triggerAll();
  flushIdle(idleCallbacks);
  assert.equal(document.querySelector("#first rt").textContent, "nihongo");

  document.querySelector("main").insertAdjacentHTML("beforeend", `<p id="second">勉強</p>`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  intersections[0].triggerAll();
  flushIdle(idleCallbacks);
  assert.equal(document.querySelector("#second rt").textContent, "benkyō");

  document.querySelector("main").insertAdjacentHTML(
    "beforeend",
    `<ruby id="dynamic-ruby">日本語<rt class="author">にほんご</rt></ruby>`,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelector("#dynamic-ruby rt").textContent, "nihongo");

  scheduler.stop();
  assert.equal(
    document.querySelector("main").innerHTML,
    `<p id="first">日本語</p><p id="second">勉強</p><ruby id="dynamic-ruby">日本語<rt class="author">にほんご</rt></ruby>`,
  );
  document.querySelector("main").insertAdjacentHTML("beforeend", `<p id="third">東京</p>`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  flushIdle(idleCallbacks);
  assert.equal(document.querySelector("#third").innerHTML, "東京");
});

test("falls back when IntersectionObserver and requestIdleCallback are unavailable", () => {
  const dom = new JSDOM(`<p>東京</p>`);
  const scheduler = new PageAnnotator({
    document: dom.window.document,
    analyzeText: analyze,
    IntersectionObserver: undefined,
    MutationObserver: dom.window.MutationObserver,
    requestIdleCallback: undefined,
    cancelIdleCallback: undefined,
  });
  scheduler.start();
  assert.equal(dom.window.document.querySelector("rt").textContent, "tōkyō");
  scheduler.stop();
  assert.equal(dom.window.document.querySelector("p").textContent, "東京");
});

function analyze(text) {
  const values = {
    日本語: ["ニホンゴ", "nihongo"],
    勉強: ["ベンキョウ", "benkyō"],
    東京: ["トウキョウ", "tōkyō"],
  };
  const value = values[text];
  return value
    ? [{ type: "annotation", surface: text, reading: value[0], romaji: value[1] }]
    : [{ type: "text", text }];
}

function flushIdle(callbacks) {
  while (callbacks.size) {
    const entries = [...callbacks.entries()];
    callbacks.clear();
    for (const [, callback] of entries) {
      callback({ didTimeout: false, timeRemaining: () => 50 });
    }
  }
}
