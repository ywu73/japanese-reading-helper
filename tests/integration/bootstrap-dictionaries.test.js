import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const manifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
const bundle = await build({
  entryPoints: [new URL("../../src/main.js", import.meta.url).pathname],
  bundle: true, format: "iife", platform: "browser", write: false,
  plugins: [{ name: "test-manifest", setup(context) {
    context.onResolve({ filter: /^yomi-ruby:runtime-manifest$/ }, () => ({ path: "manifest", namespace: "fixture" }));
    context.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export default ${JSON.stringify(manifest)}`, loader: "js" }));
  } }],
});

for (const feature of [null, "kanji", "katakana"]) {
  test(`${feature ?? "default-off"} bootstrap does not read dictionary cache or start dictionary requests`, async () => {
    const dom = new JSDOM("<p>日本語とコーヒー</p>", {
      url: "https://fixture.example/", pretendToBeVisual: true, runScripts: "outside-only",
    });
    const { window } = dom;
    const menus = new Map();
    const reads = [];
    const requests = [];
    const errors = [];
    let nextId = 0;
    const values = new Map([
      ["yomi-ruby:locale", "en"],
      ["yomi-ruby:kanji-romaji-mode", feature === "katakana" ? "local" : "google"],
      ["yomi-ruby:translation-provider", "google"],
      ["yomi-ruby:auto-origin:https://fixture.example", feature === "kanji"],
      ["yomi-ruby:katakana-origin:https://fixture.example", feature === "katakana"],
    ]);
    window.GM_getValue = (key, fallback) => { reads.push(key); return values.get(key) ?? fallback; };
    window.GM_setValue = (key, value) => { values.set(key, value); };
    window.GM_registerMenuCommand = (label, callback) => { const id = ++nextId; menus.set(id, { label, callback }); return id; };
    window.GM_unregisterMenuCommand = (id) => menus.delete(id);
    window.GM_addValueChangeListener = () => 0;
    window.GM_removeValueChangeListener = () => {};
    window.GM_xmlhttpRequest = (options) => {
      requests.push(options.url);
      const url = new URL(options.url);
      assert.equal(url.origin, "https://translate.googleapis.com");
      const word = url.searchParams.get("q");
      queueMicrotask(() => options.onload({ status: 200, finalUrl: options.url,
        responseText: JSON.stringify(feature === "kanji"
          ? [[[word, word, "nihongo"]], null, "ja"]
          : [[["coffee", word]]]),
      }));
      return { abort() {} };
    };
    window.addEventListener("error", (event) => errors.push(event.message));
    try {
      window.eval(bundle.outputFiles[0].text);
      for (let attempt = 0; attempt < 100; attempt++) {
        if (menus.size === 5 && (!feature || window.document.querySelector("ruby"))) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(menus.size, 5);
      assert.deepEqual(errors, []);
      assert.ok(reads.every((key) => !key.startsWith("yomi-ruby:dictionary-cache:")));
      assert.equal(requests.length, feature ? 1 : 0);
      if (feature) assert.ok(window.document.querySelector("ruby"), "The selected online path must actually finish annotation.");
    } finally {
      const stop = [...menus.values()].find(({ label }) => label.startsWith("Disable "));
      await stop?.callback();
      window.close();
    }
  });
}

test("Local bootstrap cancels acquisition, then annotates through cold and cached complete dictionary loads", async () => {
  const files = new Map(await Promise.all(manifest.dictionary.map(async (asset) => [
    asset.url, await readFile(new URL(`../../node_modules/kuromoji/dict/${asset.name}`, import.meta.url)),
  ])));
  const dom = new JSDOM("<p>今日は東京で日本語を勉強する。</p>", {
    url: "https://fixture.example/", pretendToBeVisual: true, runScripts: "outside-only",
  });
  const { window } = dom;
  Object.defineProperty(window.crypto, "subtle", { value: webcrypto.subtle });
  const menus = new Map();
  const requests = [];
  const values = new Map([
    ["yomi-ruby:locale", "en"], ["yomi-ruby:kanji-romaji-mode", "local"],
    ["yomi-ruby:translation-provider", "google"],
  ]);
  let nextId = 0;
  let aborts = 0;
  window.GM_getValue = (key, fallback) => values.get(key) ?? fallback;
  window.GM_setValue = (key, value) => { values.set(key, value); };
  window.GM_registerMenuCommand = (label, callback) => { const id = ++nextId; menus.set(id, { label, callback }); return id; };
  window.GM_unregisterMenuCommand = (id) => menus.delete(id);
  window.GM_addValueChangeListener = () => 0;
  window.GM_removeValueChangeListener = () => {};
  window.GM_xmlhttpRequest = (options) => {
    requests.push(options);
    if (requests.length > 1) {
      assert.ok(files.has(options.url), "Only fixed dictionary URLs may be requested in Local mode.");
      queueMicrotask(() => options.onload({ status: 200, finalUrl: options.url,
        response: new window.Uint8Array(files.get(options.url)).buffer,
      }));
    }
    return { abort() { aborts++; options.onabort(); } };
  };
  const invoke = (prefix) => {
    const command = [...menus.values()].find(({ label }) => label.startsWith(prefix));
    assert.ok(command, `Missing ${prefix} menu`);
    return command.callback();
  };
  try {
    window.eval(bundle.outputFiles[0].text);
    await until(() => menus.size === 5);
    assert.equal(requests.length, 0);
    const enabling = invoke("Enable Kanji");
    await until(() => requests.length === 1);
    await invoke("Disable Kanji");
    await enabling;
    assert.equal(aborts, 1);
    assert.equal(window.document.querySelector("ruby"), null);
    requests[0].onload({ status: 200, finalUrl: requests[0].url,
      response: new window.Uint8Array(files.get(requests[0].url)).buffer });
    await Promise.resolve();
    assert.equal([...values.keys()].filter((key) => key.startsWith("yomi-ruby:dictionary-cache:")).length, 0);

    await invoke("Enable Kanji");
    await until(() => window.document.querySelector("ruby"));
    assert.equal(requests.length, 13);
    assert.equal([...values.keys()].filter((key) => key.startsWith("yomi-ruby:dictionary-cache:")).length, 12);
    const readings = [...window.document.querySelectorAll("rt")].map((node) => node.textContent);
    assert.ok(readings.includes("kyō"));
    assert.ok(readings.includes("nihongo"));
    await invoke("Disable Kanji");
    assert.equal(window.document.body.innerHTML, "<p>今日は東京で日本語を勉強する。</p>");
    await invoke("Enable Kanji");
    await until(() => window.document.querySelector("ruby"));
    assert.equal(requests.length, 13, "A complete verified cache must avoid all network acquisition.");
  } finally {
    const stop = [...menus.values()].find(({ label }) => label.startsWith("Disable Kanji"));
    await stop?.callback();
    window.close();
  }
});

async function until(predicate) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Bootstrap did not reach the expected state.");
}
