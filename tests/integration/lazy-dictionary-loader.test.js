import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";

import { loadLazyVerifiedKuromoji, readAndVerifyDictionary } from "../../src/lazy-dictionary-loader.js";
import { buildStaticTokenizer } from "../../src/static-tokenizer.js";
import { createAnalyzer } from "../../src/analyzer.js";

const bytes = new TextEncoder().encode("verified dictionary fixture");
const asset = {
  name: "base.dat.gz",
  url: "https://unpkg.com/kuromoji@0.1.2/dict/base.dat.gz",
  size: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
const cacheKey = "yomi-ruby:dictionary-cache:kuromoji@0.1.2:base.dat.gz";

test("a cold dictionary read anonymously fetches only the pinned asset and saves verified bytes", async () => {
  const cache = new Map();
  const requests = [];
  const verified = await readAndVerifyDictionary({
    asset,
    getValue: (key, fallback) => cache.get(key) ?? fallback,
    setValue: (key, value) => cache.set(key, value),
    gmRequest(options) {
      requests.push(options);
      queueMicrotask(() => options.onload({ status: 200, finalUrl: asset.url, response: buffer(bytes) }));
      return { abort() {} };
    },
  });

  assert.deepEqual(new Uint8Array(verified), bytes);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, asset.url);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].responseType, "arraybuffer");
  assert.equal(requests[0].anonymous, true);
  assert.equal(requests[0].redirect, "error");
  assert.equal("data" in requests[0], false);
  assert.equal("headers" in requests[0], false);
  assert.deepEqual([...cache], [[cacheKey, { sha256: asset.sha256, base64: Buffer.from(bytes).toString("base64") }]]);
});

test("a warm dictionary read revalidates cached bytes without network or storage writes", async () => {
  let digests = 0;
  const verified = await readAndVerifyDictionary({
    asset,
    getValue(key) {
      assert.equal(key, cacheKey);
      return { sha256: asset.sha256, base64: Buffer.from(bytes).toString("base64") };
    },
    setValue() { assert.fail("valid cache must not be rewritten"); },
    gmRequest() { assert.fail("valid cache must not contact unpkg"); },
    subtle: { digest(...args) { digests += 1; return globalThis.crypto.subtle.digest(...args); } },
  });
  assert.deepEqual(new Uint8Array(verified), bytes);
  assert.equal(digests, 1, "a cache hit must not skip integrity verification");
});

test("invalid cache entries are cleared before exactly one verified replacement download", async (t) => {
  const valid = { sha256: asset.sha256, base64: Buffer.from(bytes).toString("base64") };
  const cases = [
    ["wrong cache shape", "unexpected value"],
    ["extra field", { ...valid, reading: "private page text" }],
    ["wrong declared digest", { ...valid, sha256: "0".repeat(64) }],
    ["changed content", { ...valid, base64: Buffer.from("x".repeat(bytes.length)).toString("base64") }],
    ["wrong decoded size", { ...valid, base64: valid.base64.slice(0, -1) + "=" }],
    ["oversized base64", { ...valid, base64: valid.base64 + "AAAA" }],
    ["invalid base64 alphabet", { ...valid, base64: "!" + valid.base64.slice(1) }],
  ];
  for (const [name, cached] of cases) {
    await t.test(name, async () => {
      const writes = [];
      const requests = [];
      const verified = await readAndVerifyDictionary({
        asset,
        getValue: () => cached,
        setValue(key, value) { assert.equal(key, cacheKey); writes.push(value); },
        gmRequest(options) {
          assert.deepEqual(writes, [null], "discard invalid storage before reacquiring it");
          requests.push(options);
          queueMicrotask(() => options.onload({ status: 200, finalUrl: asset.url, response: buffer(bytes) }));
          return { abort() {} };
        },
      });
      assert.deepEqual(new Uint8Array(verified), bytes);
      assert.equal(requests.length, 1);
      assert.deepEqual(writes, [null, valid]);
    });
  }
});

test("storage write failure keeps verified bytes usable for this page without retrying storage", async (t) => {
  for (const cached of [null, { sha256: "outdated", base64: "" }]) {
    await t.test(cached ? "corrupt-cache clear fails" : "new cache write fails", async () => {
      let writes = 0;
      let requests = 0;
      const verified = await readAndVerifyDictionary({
        asset, getValue: () => cached,
        setValue() { writes += 1; throw new Error("storage quota exceeded"); },
        gmRequest(options) {
          requests += 1;
          queueMicrotask(() => options.onload({ status: 200, finalUrl: asset.url, response: buffer(bytes) }));
          return { abort() {} };
        },
      });
      assert.deepEqual(new Uint8Array(verified), bytes);
      assert.equal(requests, 1);
      assert.equal(writes, 1);
    });
  }
});

test("a cache read failure stops before network or storage writes", async () => {
  await assert.rejects(readAndVerifyDictionary({
    asset, getValue: async () => { throw new Error("storage unavailable"); },
    setValue() { assert.fail("failed cache read must not write"); },
    gmRequest() { assert.fail("failed cache read must not fetch"); },
  }), /storage unavailable/);
});

test("unavailable or failing integrity verification never treats the cache as a network miss", async () => {
  const options = {
    asset,
    getValue: () => ({ sha256: asset.sha256, base64: Buffer.from(bytes).toString("base64") }),
    setValue() { assert.fail("unverified bytes must not be cached or cleared"); },
    gmRequest() { assert.fail("verification failure must not fetch"); },
  };
  await assert.rejects(readAndVerifyDictionary({ ...options, subtle: null }), /SHA-256 is unavailable/);
  await assert.rejects(readAndVerifyDictionary({
    ...options, subtle: { digest: async () => { throw new Error("Web Crypto failed"); } },
  }), /Web Crypto failed/);
});

test("an already cancelled read performs no storage or network operation", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(readAndVerifyDictionary({
    asset, signal: controller.signal,
    getValue() { assert.fail("cancelled read must not inspect storage"); },
    setValue() { assert.fail("cancelled read must not write storage"); },
    gmRequest() { assert.fail("cancelled read must not fetch"); },
  }), { name: "AbortError" });
});

test("cancelling a request aborts its handle and ignores a late valid response", async () => {
  const controller = new AbortController();
  let request;
  let aborted = 0;
  const loading = readAndVerifyDictionary({
    asset, signal: controller.signal, getValue: () => null,
    setValue() { assert.fail("late response must not write storage"); },
    gmRequest(options) { request = options; return { abort() { aborted += 1; options.onabort(); } }; },
  });
  await settle();
  controller.abort();
  await assert.rejects(loading, { name: "AbortError" });
  request.onload({ status: 200, finalUrl: asset.url, response: buffer(bytes) });
  await settle();
  assert.equal(aborted, 1);
});

test("cancellation settles a pending storage read without waiting for its late result", async () => {
  const controller = new AbortController();
  const gate = deferred();
  const loading = readAndVerifyDictionary({
    asset, signal: controller.signal, getValue: () => gate.promise,
    setValue() { assert.fail("late storage read must not write"); },
    gmRequest() { assert.fail("late storage read must not fetch"); },
  });
  controller.abort();
  const result = await Promise.race([loading.then(() => "resolved", (error) => error.name), delay(20, "pending")]);
  gate.resolve(null);
  await assert.rejects(loading, { name: "AbortError" });
  assert.equal(result, "AbortError");
});

test("cancellation settles pending digest verification without publishing or caching late bytes", async () => {
  const controller = new AbortController();
  const gate = deferred();
  let digestStarted = false;
  const loading = readAndVerifyDictionary({
    asset, signal: controller.signal,
    getValue: () => ({ sha256: asset.sha256, base64: Buffer.from(bytes).toString("base64") }),
    setValue() { assert.fail("cancelled digest must not write"); },
    gmRequest() { assert.fail("cancelled cached digest must not fetch"); },
    subtle: { digest() { digestStarted = true; return gate.promise; } },
  });
  await settle();
  assert.equal(digestStarted, true);
  controller.abort();
  const result = await Promise.race([loading.then(() => "resolved", (error) => error.name), delay(20, "pending")]);
  gate.resolve(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  await assert.rejects(loading, { name: "AbortError" });
  assert.equal(result, "AbortError");
});

test("untrusted HTTP status, redirects, and corrupted downloads never enter persistent storage", async (t) => {
  const valid = { status: 200, finalUrl: asset.url, response: buffer(bytes) };
  const cases = [
    ...[undefined, 0, "200", 200.5, 199, 300, 429].map((status) => [`HTTP ${String(status)}`, { ...valid, status }]),
    ["missing final URL", { ...valid, finalUrl: undefined }],
    ["cross host", { ...valid, finalUrl: "https://example.com/base.dat.gz" }],
    ["changed path", { ...valid, finalUrl: asset.url.replace("dict/", "other/") }],
    ["added query", { ...valid, finalUrl: asset.url + "?tracking=1" }],
    ["added hash", { ...valid, finalUrl: asset.url + "#unexpected" }],
    ["nonbinary response", { ...valid, response: "invalid bytes" }],
    ["wrong byte length", { ...valid, response: buffer(bytes.subarray(1)) }],
    ["wrong SHA-256", { ...valid, response: buffer(new Uint8Array(bytes.length)) }],
  ];
  for (const [name, response] of cases) {
    await t.test(name, async () => {
      let requests = 0;
      await assert.rejects(readAndVerifyDictionary({
        asset, getValue: () => null,
        setValue() { assert.fail("unverified download must not be persisted"); },
        gmRequest(options) {
          requests += 1;
          queueMicrotask(() => options.onload(response));
          return { abort() {} };
        },
      }));
      assert.equal(requests, 1, "a failed asset request must not retry or fall back");
    });
  }
});

test("accepts the exact responseURL compatibility field and fails once on timeout or network error", async (t) => {
  for (const kind of ["responseURL", "timeout", "network"]) {
    await t.test(kind, async () => {
      let requests = 0;
      const loading = readAndVerifyDictionary({
        asset, getValue: () => null,
        setValue() { assert.equal(kind, "responseURL"); },
        gmRequest(options) {
          requests += 1;
          queueMicrotask(() => {
            if (kind === "responseURL") options.onload({ status: 200, responseURL: asset.url, response: buffer(bytes) });
            else if (kind === "timeout") options.ontimeout();
            else options.onerror();
          });
          return { abort() {} };
        },
      });
      if (kind === "responseURL") assert.deepEqual(new Uint8Array(await loading), bytes);
      else await assert.rejects(loading, /failed|timed out/);
      assert.equal(requests, 1);
    });
  }
});

test("unknown names, package versions, URL variants and malformed asset metadata fail before any effect", async (t) => {
  const cases = [
    { ...asset, name: "program.js", url: "https://unpkg.com/kuromoji@0.1.2/dict/program.js" },
    { ...asset, url: asset.url.replace("0.1.2", "latest") },
    { ...asset, url: asset.url.replace("https:", "http:") },
    { ...asset, url: asset.url + "?cache=1" },
    { ...asset, url: asset.url + "#hash" },
    { ...asset, size: -1 },
    { ...asset, size: 1.5 },
    { ...asset, sha256: "not-a-sha256" },
  ];
  for (const candidate of cases) {
    await t.test(`${candidate.url} ${candidate.size}`, async () => {
      await assert.rejects(readAndVerifyDictionary({
        asset: candidate,
        getValue() { assert.fail("unapproved asset must not read storage"); },
        setValue() { assert.fail("unapproved asset must not write storage"); },
        gmRequest() { assert.fail("unapproved asset must not request"); },
      }), /approved.*manifest/);
    });
  }
});

test("an incomplete or invalid dictionary set fails before acquisition or tokenizer creation", async () => {
  const realManifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
  const dictionary = realManifest.dictionary;
  for (const manifest of [
    {}, { dictionary: [] }, { dictionary: dictionary.slice(1) },
    { dictionary: dictionary.map(() => dictionary[0]) },
    { dictionary: [...dictionary.slice(0, -1), { ...dictionary.at(-1), url: "https://example.com/asset" }] },
  ]) {
    await assert.rejects(loadLazyVerifiedKuromoji({
      manifest,
      getValue() { assert.fail("invalid manifest must not read storage"); },
      setValue() { assert.fail("invalid manifest must not write storage"); },
      gmRequest() { assert.fail("invalid manifest must not fetch"); },
    }), /approved.*manifest/);
  }
});

test("cancelling a full load rejects and never starts the next dictionary after a late first response", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
  const controller = new AbortController();
  const requests = [];
  let aborts = 0;
  const loading = loadLazyVerifiedKuromoji({
    manifest, signal: controller.signal, getValue: () => null,
    setValue() { assert.fail("cancelled loading must not persist late bytes"); },
    gmRequest(options) { requests.push(options); return { abort() { aborts += 1; } }; },
  });
  await settle();
  assert.equal(requests.length, 1);
  controller.abort();
  await assert.rejects(loading, { name: "AbortError" });
  requests[0].onload({ status: 200, finalUrl: requests[0].url, response: new ArrayBuffer(manifest.dictionary[0].size) });
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(aborts, 1);
});

test("cold and warm loading of all twelve real dictionaries retains native gzip and identical readings", async (t) => {
  const manifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
  const files = new Map(await Promise.all(manifest.dictionary.map(async ({ name }) => {
    const source = await readFile(new URL(`../../node_modules/kuromoji/dict/${name}`, import.meta.url));
    return [name, buffer(source)];
  })));
  const samples = [
    "今日は東京で日本語を勉強し、食べる方法を思う。",
    "😀東京へ行った。𠮷と𪚥、unknown123、カタカナ。",
    "取り扱いについて、お問い合わせください。",
    "かなだけ ABC 123",
  ];
  const legacy = buildStaticTokenizer(files);
  const expected = samples.map((text) => ({ tokens: legacy.tokenize(text), segments: createAnalyzer(legacy)(text) }));
  const NativeStream = globalThis.DecompressionStream;
  let streams = 0;
  globalThis.DecompressionStream = class extends NativeStream {
    constructor(format) { super(format); streams += 1; }
  };
  t.after(() => { globalThis.DecompressionStream = NativeStream; });
  const cache = new Map();
  const requests = [];
  const options = {
    manifest,
    getValue: (key, fallback) => cache.get(key) ?? fallback,
    setValue: (key, value) => cache.set(key, value),
    gmRequest(request) {
      requests.push(request.url);
      const asset = manifest.dictionary.find(({ url }) => url === request.url);
      assert.ok(asset, "only a manifest-approved dictionary can be requested");
      queueMicrotask(() => request.onload({ status: 200, finalUrl: asset.url, response: files.get(asset.name).slice(0) }));
      return { abort() {} };
    },
  };
  for (const [index, mode] of ["cold", "warm"].entries()) {
    const tokenizer = await loadLazyVerifiedKuromoji(options);
    assert.equal(streams, 12 * (index + 1), `${mode} initialization retains native gzip`);
    for (const [sampleIndex, text] of samples.entries()) {
      assert.deepEqual(tokenizer.tokenize(text), expected[sampleIndex].tokens);
      assert.deepEqual(createAnalyzer(tokenizer)(text), expected[sampleIndex].segments);
    }
  }
  assert.deepEqual(requests, manifest.dictionary.map(({ url }) => url), "warm reload makes no request");
  assert.equal(cache.size, 12);
  for (const { name, sha256 } of manifest.dictionary) {
    const cached = cache.get(`yomi-ruby:dictionary-cache:kuromoji@0.1.2:${name}`);
    assert.deepEqual(Object.keys(cached).sort(), ["base64", "sha256"]);
    assert.equal(cached.sha256, sha256);
  }
  const readings = expected[0].segments.filter(({ type }) => type === "annotation").map(({ surface, romaji }) => `${surface}:${romaji}`);
  for (const reading of ["今日:kyō", "東京:tōkyō", "日本語:nihongo", "食べる:taberu"]) {
    assert.ok(readings.includes(reading));
  }
});

async function settle() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

function deferred() {
  let resolve;
  const promise = new Promise((finish) => { resolve = finish; });
  return { promise, resolve };
}

function buffer(value) {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}
