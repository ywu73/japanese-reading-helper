import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createAnnotationSession } from "../../src/session.js";
import { PageAnnotator } from "../../src/scheduler.js";

test("disabling during tokenizer loading prevents the stale result from starting annotation", async () => {
  const dom = new JSDOM("<main>日本語</main>");
  const tokenizerGate = deferred();
  let annotatorStarts = 0;
  const session = createAnnotationSession({
    document: dom.window.document,
    loadTokenizer: async () => tokenizerGate.promise,
    createAnnotator: () => ({
      start() {
        annotatorStarts += 1;
      },
      stop() {},
    }),
  });

  const enabling = session.enable();
  session.disable();
  tokenizerGate.resolve({ id: "stale-tokenizer" });
  await enabling;

  assert.equal(annotatorStarts, 0);
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-status]"), null);
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-style]"), null);
});

test("disable releases the active tokenizer session so re-enable constructs a fresh one", async () => {
  const dom = new JSDOM("<main>日本語</main>");
  const loadedTokenizers = [];
  const startedTokenizers = [];
  let stopCount = 0;
  const session = createAnnotationSession({
    document: dom.window.document,
    loadTokenizer: async () => {
      const tokenizer = { id: loadedTokenizers.length + 1 };
      loadedTokenizers.push(tokenizer);
      return tokenizer;
    },
    createAnnotator: (tokenizer) => ({
      start() {
        startedTokenizers.push(tokenizer);
      },
      stop() {
        stopCount += 1;
      },
    }),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.enable();
  session.disable();
  await session.enable();

  assert.deepEqual(startedTokenizers.map(({ id }) => id), [1, 2]);
  assert.equal(stopCount, 1);
});

test("an initialization failure remains fail closed and a later enable retries", async () => {
  const dom = new JSDOM("<main>日本語</main>");
  const errors = [];
  let loadCount = 0;
  let startCount = 0;
  const session = createAnnotationSession({
    document: dom.window.document,
    loadTokenizer: async () => {
      loadCount += 1;
      if (loadCount === 1) {
        throw new Error("dictionary unavailable");
      }
      return { id: "retry-tokenizer" };
    },
    createAnnotator: () => ({
      start() {
        startCount += 1;
      },
      stop() {},
    }),
    setTimer: () => 1,
    clearTimer: () => {},
    logger: { error: (...values) => errors.push(values) },
  });

  await session.enable();
  assert.equal(startCount, 0);
  assert.equal(dom.window.document.querySelector("[data-yomi-ruby-status]").getAttribute("role"), "alert");

  await session.enable();
  assert.equal(loadCount, 2);
  assert.equal(startCount, 1);
  assert.equal(errors.length, 1);
});

test("an annotator start failure rolls back partial work and permits retry", async () => {
  const dom = new JSDOM("<main>日本語</main>");
  const { document } = dom.window;
  let factoryCount = 0;
  let successfulStarts = 0;
  let failedStopCount = 0;
  const session = createAnnotationSession({
    document,
    loadTokenizer: async () => ({ id: "tokenizer" }),
    createAnnotator: () => {
      factoryCount += 1;
      if (factoryCount === 1) {
        return {
          start() {
            document.body.setAttribute("data-yomi-ruby-partial", "");
            throw new Error("observer startup failed");
          },
          stop() {
            failedStopCount += 1;
            document.body.removeAttribute("data-yomi-ruby-partial");
          },
        };
      }
      return {
        start() {
          successfulStarts += 1;
        },
        stop() {},
      };
    },
    setTimer: () => 1,
    clearTimer: () => {},
    logger: { error: () => {} },
  });

  await session.enable();
  assert.equal(failedStopCount, 1);
  assert.equal(document.body.hasAttribute("data-yomi-ruby-partial"), false);

  await session.enable();
  assert.equal(factoryCount, 2);
  assert.equal(successfulStarts, 1);
});

test("disabling an active session restores the DOM and stops later dynamic annotation", async () => {
  const dom = new JSDOM("<main><p>日本語</p></main>");
  const { document, MutationObserver } = dom.window;
  const session = createAnnotationSession({
    document,
    loadTokenizer: async () => ({ id: "tokenizer" }),
    createAnnotator: () => new PageAnnotator({
      document,
      analyzeText: analyze,
      IntersectionObserver: undefined,
      MutationObserver,
      requestIdleCallback: undefined,
      cancelIdleCallback: undefined,
    }),
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await session.enable();
  assert.equal(document.querySelector("rt").textContent, "nihongo");

  session.disable();
  assert.equal(document.querySelector("main").innerHTML, "<p>日本語</p>");
  assert.equal(document.querySelector("[data-yomi-ruby-status]"), null);
  assert.equal(document.querySelector("[data-yomi-ruby-style]"), null);

  document.querySelector("main").insertAdjacentHTML("beforeend", "<p>日本語</p>");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelectorAll("rt").length, 0);
});

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function analyze(text) {
  return text === "日本語"
    ? [{ type: "annotation", surface: text, reading: "ニホンゴ", romaji: "nihongo" }]
    : [{ type: "text", text }];
}
