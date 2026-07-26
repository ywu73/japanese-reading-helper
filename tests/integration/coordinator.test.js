import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { AnnotationCoordinator } from "../../src/coordinator.js";

test("renders non-overlapping kanji and katakana annotations through one coordinated DOM plan", async () => {
  const dom = new JSDOM("<main><p>日本語とゲーム</p></main>");
  const { document } = dom.window;
  const translatedBatches = [];
  const coordinator = new AnnotationCoordinator({
    document,
    IntersectionObserver: undefined,
    MutationObserver: dom.window.MutationObserver,
    requestIdleCallback: undefined,
    cancelIdleCallback: undefined,
  });

  coordinator.enableKanji((text) => text === "日本語とゲーム"
    ? [
      { type: "annotation", surface: "日本語", reading: "ニホンゴ", romaji: "nihongo" },
      { type: "text", text: "とゲーム" },
    ]
    : [{ type: "text", text }]);
  coordinator.enableKatakana(async (phrases) => {
    translatedBatches.push(phrases);
    return new Map([["ゲーム", "game"]]);
  });
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));

  assert.deepEqual(translatedBatches, [["ゲーム"]]);
  assert.equal(
    document.querySelector('[data-yomi-ruby-feature="kanji"] rt').textContent,
    "nihongo",
  );
  assert.equal(
    document.querySelector('[data-yomi-ruby-feature="katakana"] rt').textContent,
    "game",
  );
  assert.equal(document.querySelector("p").textContent, "日本語nihongoとゲームgame");
});

test("reserves an overlapping katakana range without a placeholder and lets katakana win after success", async () => {
  const dom = new JSDOM("<main><p>型ゲーム</p></main>");
  const { document } = dom.window;
  const translationGate = deferred();
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKanji((text) => [{
    type: "annotation",
    surface: text,
    reading: "カタゲーム",
    romaji: "katagēmu",
  }]);
  assert.equal(document.querySelector('[data-yomi-ruby-feature="kanji"] rt').textContent, "katagēmu");

  coordinator.enableKatakana(async (phrases) => {
    assert.deepEqual(phrases, ["ゲーム"]);
    return translationGate.promise;
  });
  await Promise.resolve();

  assert.equal(document.querySelectorAll("ruby").length, 0, "pending ranges render no empty ruby");
  assert.equal(document.querySelector("p").textContent, "型ゲーム");

  translationGate.resolve(new Map([["ゲーム", "game"]]));
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));
  assert.equal(document.querySelectorAll("ruby").length, 1);
  assert.equal(document.querySelector("ruby .yomi-ruby-base").textContent, "ゲーム");
  assert.equal(document.querySelector("ruby rt").textContent, "game");
  assert.equal(document.querySelector("p").firstChild.textContent, "型");
});

test("releases a failed katakana reservation to reliable kanji without retrying in the same page session", async () => {
  const dom = new JSDOM("<main><p>型ゲーム</p></main>");
  const { document } = dom.window;
  let translationCalls = 0;
  const coordinator = immediateCoordinator(dom);
  const analyze = (text) => [{
    type: "annotation",
    surface: text,
    reading: "カタゲーム",
    romaji: "katagēmu",
  }];

  coordinator.enableKanji(analyze);
  coordinator.enableKatakana(async () => {
    translationCalls += 1;
    return new Map();
  });
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="kanji"]'));

  assert.equal(document.querySelector('[data-yomi-ruby-feature="kanji"] rt').textContent, "katagēmu");
  assert.equal(document.querySelector('[data-yomi-ruby-feature="katakana"]'), null);

  coordinator.disableKanji();
  coordinator.enableKanji(analyze);
  await Promise.resolve();
  assert.equal(translationCalls, 1);
});

test("disabling katakana after success deterministically restores the remaining kanji plan", async () => {
  const dom = new JSDOM("<main><p>型ゲーム</p></main>");
  const { document } = dom.window;
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKanji((text) => [{
    type: "annotation",
    surface: text,
    reading: "カタゲーム",
    romaji: "katagēmu",
  }]);
  coordinator.enableKatakana(async () => new Map([["ゲーム", "game"]]));
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));

  coordinator.disableKatakana();

  assert.equal(document.querySelectorAll("ruby").length, 1);
  assert.equal(document.querySelector('[data-yomi-ruby-feature="kanji"] .yomi-ruby-base').textContent, "型ゲーム");
  assert.equal(document.querySelector('[data-yomi-ruby-feature="kanji"] rt').textContent, "katagēmu");
});

test("does not translate off-screen katakana until its element reaches the viewport margin", async () => {
  const dom = new JSDOM("<main><p>ゲーム</p></main>");
  const observers = [];
  const translatedBatches = [];

  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      observers.push(this);
    }
    observe(element) { this.elements.add(element); }
    unobserve(element) { this.elements.delete(element); }
    disconnect() { this.elements.clear(); }
    triggerAll() {
      this.callback([...this.elements].map((target) => ({ target, isIntersecting: true })));
    }
  }

  const coordinator = new AnnotationCoordinator({
    document: dom.window.document,
    IntersectionObserver: FakeIntersectionObserver,
    MutationObserver: dom.window.MutationObserver,
    requestIdleCallback: undefined,
    cancelIdleCallback: undefined,
  });
  coordinator.enableKatakana(async (phrases) => {
    translatedBatches.push(phrases);
    return new Map([["ゲーム", "game"]]);
  });
  await Promise.resolve();
  assert.deepEqual(translatedBatches, []);

  observers[0].triggerAll();
  await waitFor(() => translatedBatches.length === 1);
  assert.deepEqual(translatedBatches, [["ゲーム"]]);
});

test("aborts pending translation and discards a late result after the source text changes", async () => {
  const dom = new JSDOM("<main><p>ゲーム</p></main>");
  const { document } = dom.window;
  const translationGate = deferred();
  let receivedSignal;
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKatakana(async (_phrases, { signal }) => {
    receivedSignal = signal;
    return translationGate.promise;
  });
  await waitFor(() => receivedSignal);
  document.querySelector("p").firstChild.textContent = "ラジオ";
  coordinator.disableKatakana();

  assert.equal(receivedSignal.aborted, true);
  translationGate.resolve(new Map([["ゲーム", "game"]]));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(document.querySelector("p").innerHTML, "ラジオ");
  assert.equal(document.querySelector("ruby"), null);
});

test("provider replacement aborts old work, clears page translations, and rejects a late old-provider result", async () => {
  const dom = new JSDOM("<main><p>ゲーム</p></main>");
  const { document } = dom.window;
  const oldGate = deferred();
  let oldSignal;
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKatakana(async (_phrases, { signal }) => {
    oldSignal = signal;
    return oldGate.promise;
  });
  await waitFor(() => oldSignal);

  coordinator.disableKatakana();
  coordinator.enableKatakana(async () => new Map([["ゲーム", "new provider"]]));
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));

  assert.equal(oldSignal.aborted, true);
  assert.equal(document.querySelector("rt").textContent, "new provider");

  oldGate.resolve(new Map([["ゲーム", "stale provider"]]));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(document.querySelector("rt").textContent, "new provider");
});

test("discards detached ownership and re-coordinates the same element if the site later reinserts it", async () => {
  const dom = new JSDOM('<main><p id="target">ゲーム</p></main>');
  const { document } = dom.window;
  const target = document.querySelector("#target");
  const translationGate = deferred();
  let translationCalls = 0;
  const coordinator = immediateCoordinator(dom);
  coordinator.enableKatakana(async () => {
    translationCalls += 1;
    return translationGate.promise;
  });
  await waitFor(() => translationCalls === 1);

  target.remove();
  await new Promise((resolve) => setTimeout(resolve, 0));
  translationGate.resolve(new Map([["ゲーム", "game"]]));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(target.querySelector("ruby"), null);

  document.querySelector("main").append(target);
  await waitFor(() => target.querySelector('[data-yomi-ruby-feature="katakana"]'));

  assert.equal(target.querySelector("rt").textContent, "game");
  assert.equal(translationCalls, 1, "the page-memory success cache avoids a duplicate request");
});

test("handles dynamic near-viewport content and stops observing after complete rollback", async () => {
  const dom = new JSDOM("<main><p>前文</p></main>");
  const { document } = dom.window;
  const translatedBatches = [];
  const coordinator = immediateCoordinator(dom);
  coordinator.enableKatakana(async (phrases) => {
    translatedBatches.push(phrases);
    return new Map(phrases.map((phrase) => [phrase, phrase === "ゲーム" ? "game" : "radio"]));
  });

  document.querySelector("main").insertAdjacentHTML("beforeend", '<p id="dynamic">ゲーム</p>');
  await waitFor(() => document.querySelector("#dynamic ruby"));
  assert.equal(document.querySelector("#dynamic rt").textContent, "game");

  coordinator.disableKatakana();
  assert.equal(document.querySelector("#dynamic").innerHTML, "ゲーム");
  document.querySelector("main").insertAdjacentHTML("beforeend", '<p id="later">ラジオ</p>');
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(document.querySelector("#later").innerHTML, "ラジオ");
  assert.deepEqual(translatedBatches, [["ゲーム"]]);
});

test("limits katakana translation to safe body text while preserving existing ruby and links", async () => {
  const dom = new JSDOM(`
    <main>
      <script>ゲーム</script><style>.ゲーム{}</style><code>ゲーム</code>
      <form><label>ゲーム<input value="ゲーム"></label></form>
      <div contenteditable="true">ゲーム</div><div hidden>ゲーム</div>
      <div aria-hidden="true">ゲーム</div><div style="display:none">ゲーム</div>
      <ruby id="author">ゲーム<rt>げーむ</rt></ruby>
      <ruby id="kt">ゲーム<rt class="katakana-terminator-rt" data-rt="game"></rt></ruby>
      <div data-yomi-ruby-status>ゲーム</div>
      <a id="link" href="/ゲーム">ゲーム</a>
    </main>
  `);
  const { document } = dom.window;
  const originalAuthor = document.querySelector("#author").outerHTML;
  const originalKt = document.querySelector("#kt").outerHTML;
  const translatedBatches = [];
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKatakana(async (phrases) => {
    translatedBatches.push(phrases);
    return new Map([["ゲーム", "game"]]);
  });
  await waitFor(() => document.querySelector("#link ruby"));

  assert.deepEqual(translatedBatches, [["ゲーム"]]);
  assert.equal(document.querySelector("#link rt").textContent, "game");
  assert.equal(document.querySelector("#author").outerHTML, originalAuthor);
  assert.equal(document.querySelector("#kt").outerHTML, originalKt);
  assert.equal(document.querySelector("form").textContent, "ゲーム");
  assert.equal(document.querySelector("code").textContent, "ゲーム");
  assert.equal(document.querySelector('[contenteditable="true"]').textContent, "ゲーム");
});

test("serializes newly discovered phrases behind the active page translation request", async () => {
  const dom = new JSDOM("<main><p>ゲーム</p></main>");
  const { document } = dom.window;
  const firstGate = deferred();
  const calls = [];
  const coordinator = immediateCoordinator(dom);
  coordinator.enableKatakana(async (phrases) => {
    calls.push(phrases);
    if (calls.length === 1) {
      return firstGate.promise;
    }
    return new Map([["テレビ", "television"]]);
  });
  await waitFor(() => calls.length === 1);

  document.querySelector("main").insertAdjacentHTML("beforeend", "<p>テレビ</p>");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, [["ゲーム"]]);

  firstGate.resolve(new Map([["ゲーム", "game"]]));
  await waitFor(() => calls.length === 2);
  assert.deepEqual(calls, [["ゲーム"], ["テレビ"]]);
});

test("restores converted author ruby when kanji is disabled without removing katakana annotations", async () => {
  const dom = new JSDOM(`
    <main>
      <ruby id="author" class="original">日本語<rt title="reading">にほんご</rt></ruby>
      <p>ゲーム</p>
    </main>
  `);
  const { document } = dom.window;
  const originalAuthor = document.querySelector("#author").outerHTML;
  const coordinator = immediateCoordinator(dom);

  coordinator.enableKanji((text) => [{ type: "text", text }]);
  assert.equal(document.querySelector("#author rt").textContent, "nihongo");
  coordinator.enableKatakana(async () => new Map([["ゲーム", "game"]]));
  await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));

  coordinator.disableKanji();

  assert.equal(document.querySelector("#author").outerHTML, originalAuthor);
  assert.equal(document.querySelector('[data-yomi-ruby-feature="katakana"] rt').textContent, "game");
});

test("preserves nested inline markup and restores exact text across repeated complete cycles", async () => {
  const dom = new JSDOM('<main><p>前<strong class="kept">日本語とゲーム</strong>後</p></main>');
  const { document } = dom.window;
  const original = document.querySelector("main").innerHTML;
  const coordinator = immediateCoordinator(dom);
  const analyze = (text) => text === "日本語とゲーム"
    ? [
      { type: "annotation", surface: "日本語", reading: "ニホンゴ", romaji: "nihongo" },
      { type: "text", text: "とゲーム" },
    ]
    : [{ type: "text", text }];

  for (let cycle = 0; cycle < 3; cycle += 1) {
    coordinator.enableKanji(analyze);
    coordinator.enableKatakana(async () => new Map([["ゲーム", "game"]]));
    await waitFor(() => document.querySelector('[data-yomi-ruby-feature="katakana"]'));
    assert.equal(document.querySelector("strong").className, "kept");
    coordinator.stop();
    assert.equal(document.querySelector("main").innerHTML, original);
  }
});

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}

function immediateCoordinator(dom) {
  return new AnnotationCoordinator({
    document: dom.window.document,
    IntersectionObserver: undefined,
    MutationObserver: dom.window.MutationObserver,
    requestIdleCallback: undefined,
    cancelIdleCallback: undefined,
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
