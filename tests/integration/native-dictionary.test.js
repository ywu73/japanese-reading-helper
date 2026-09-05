import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import zlib from "zlibjs/bin/gunzip.min.js";

import { buildStaticTokenizer, buildStaticTokenizerAsync } from "../../src/static-tokenizer.js";
import { createAnalyzer } from "../../src/analyzer.js";
import { loadVerifiedKuromoji } from "../../src/vendor-loader.js";

const manifest = JSON.parse(await readFile(new URL("../../vendor/manifest.json", import.meta.url), "utf8"));
const files = new Map(await Promise.all(manifest.dictionary.map(async ({ name }) => {
  const bytes = await readFile(new URL(`../../node_modules/kuromoji/dict/${name}`, import.meta.url));
  return [name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)];
})));
const samples = [
  "今日は東京で日本語を勉強し、食べる方法を思う。",
  "😀東京へ行った。𠮷と𪚥、unknown123、カタカナ。",
  "取り扱いについて、お問い合わせください。",
  "かなだけ ABC 123",
];

test("native dictionary initialization preserves complete tokens and segments", async (t) => {
  const NativeStream = globalThis.DecompressionStream;
  let started = 0;
  replaceNativeStream(t, class extends NativeStream {
    constructor(format) { super(format); started += 1; }
  });
  const native = await buildStaticTokenizerAsync(files);
  const legacy = buildStaticTokenizer(files);
  assert.equal(started, 12);
  for (const text of samples) {
    assert.deepEqual(native.tokenize(text), legacy.tokenize(text));
    assert.deepEqual(createAnalyzer(native)(text), createAnalyzer(legacy)(text));
  }
  const readings = createAnalyzer(native)(samples[0]).filter((item) => item.type === "annotation").map((item) => `${item.surface}:${item.romaji}`);
  for (const expected of ["今日:kyō", "東京:tōkyō", "日本語:nihongo", "勉強:benkyō", "食べる:taberu", "思う:omou"]) {
    assert.ok(readings.includes(expected));
  }
});

test("missing native API uses the existing bundled tokenizer", async (t) => {
  replaceNativeStream(t, undefined);
  const tokenizer = await buildStaticTokenizerAsync(files);
  assert.equal(tokenizer.tokenize("東京")[0].reading, "トウキョウ");
});

test("native construction and gzip failures do not retry with the bundled decoder", async (t) => {
  const legacy = t.mock.method(zlib.Zlib, "Gunzip", () => { throw new Error("Unexpected fallback"); });
  const NativeStream = globalThis.DecompressionStream;
  replaceNativeStream(t, class {
    constructor() { throw new Error("Native constructor failed"); }
  });
  await assert.rejects(buildStaticTokenizerAsync(files), /Native constructor failed/);
  globalThis.DecompressionStream = NativeStream;
  const truncated = new Map([["base.dat.gz", files.get("base.dat.gz").slice(0, 100)]]);
  await assert.rejects(buildStaticTokenizerAsync(truncated));
  assert.equal(legacy.mock.callCount(), 0);
});

test("abort before initialization starts no native stream", async (t) => {
  let started = 0;
  replaceNativeStream(t, class { constructor() { started += 1; throw new Error("Must not start"); } });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(buildStaticTokenizerAsync(files, { signal: controller.signal }), /aborted/);
  assert.equal(started, 0);
});

test("abort during decompression rejects and never starts the next file", async (t) => {
  const controller = new AbortController();
  let started = 0;
  replaceNativeStream(t, class extends TransformStream {
    constructor() {
      super({ transform() { controller.abort(new Error("Stop dictionary decoding")); } });
      started += 1;
    }
  });
  const legacy = t.mock.method(zlib.Zlib, "Gunzip", () => { throw new Error("Unexpected fallback"); });
  await assert.rejects(buildStaticTokenizerAsync(files, { signal: controller.signal }), /Dictionary initialization aborted/);
  assert.equal(started, 1);
  assert.equal(legacy.mock.callCount(), 0);
});

test("loader verifies all asset sizes and digests before native initialization", async (t) => {
  let started = 0;
  replaceNativeStream(t, class { constructor() { started += 1; throw new Error("Must not start"); } });
  const bytes = gzipSync("local synthetic dictionary");
  const asset = { name: "base.dat.gz", resourceName: "test-base", size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  for (const invalid of [{ ...asset, size: bytes.length + 1 }, { ...asset, sha256: "0".repeat(64) }]) {
    await assert.rejects(loadVerifiedKuromoji({
      manifest: { dictionary: [invalid] },
      getResourceUrl: () => "blob:local/test-base",
      gmRequest: ({ onload }) => queueMicrotask(() => onload({ status: 200, response: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })),
    }), /mismatch/);
  }
  assert.equal(started, 0);
});

function replaceNativeStream(t, replacement) {
  const original = globalThis.DecompressionStream;
  globalThis.DecompressionStream = replacement;
  t.after(() => { globalThis.DecompressionStream = original; });
}
