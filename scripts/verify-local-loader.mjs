import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAnalyzer } from "../src/analyzer.js";
import { loadLazyVerifiedKuromoji } from "../src/lazy-dictionary-loader.js";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const packageRoot = path.dirname(fileURLToPath(import.meta.resolve("kuromoji/package.json")));
const manifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
const bytesByUrl = new Map();
const cache = new Map();

for (const asset of manifest.dictionary) {
  const filePath = path.join(packageRoot, asset.path);
  const buffer = await readFile(filePath);
  bytesByUrl.set(asset.url, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

const requested = [];
function gmRequest({ url, onload, onerror }) {
  requested.push(url);
  const response = bytesByUrl.get(url);
  queueMicrotask(() => {
    if (response) {
      onload({ status: 200, finalUrl: url, response: response.slice(0) });
    } else {
      onerror(new Error(`Unlisted dictionary request: ${url}`));
    }
  });
}

const loaderOptions = {
  manifest,
  gmRequest,
  getValue: async (key, fallback) => cache.get(key) ?? fallback,
  setValue: async (key, value) => { cache.set(key, value); },
};
const tokenizer = await loadLazyVerifiedKuromoji(loaderOptions);
const analyze = createAnalyzer(tokenizer);
const segments = analyze("今日は東京で日本語を勉強し、食べる方法を思う。");
const readings = segments
  .filter((segment) => segment.type === "annotation")
  .map(({ surface, romaji }) => `${surface}:${romaji}`);

const expectedRequestCount = manifest.dictionary.length;
if (requested.length !== expectedRequestCount || new Set(requested).size !== expectedRequestCount) {
    throw new Error(`Expected ${expectedRequestCount} unique local resource reads, received ${requested.length}.`);
}
for (const expected of ["今日:kyō", "東京:tōkyō", "日本語:nihongo", "勉強:benkyō", "食べる:taberu", "思う:omou"]) {
  if (!readings.includes(expected)) {
    throw new Error(`Missing expected analyzed output ${expected}: ${readings.join(", ")}`);
  }
}

const warmTokenizer = await loadLazyVerifiedKuromoji(loaderOptions);
if (requested.length !== expectedRequestCount || cache.size !== expectedRequestCount) {
  throw new Error("Verified cache reuse must not issue more dictionary requests.");
}
if (JSON.stringify(createAnalyzer(warmTokenizer)("今日 東京 日本語")) !== JSON.stringify(analyze("今日 東京 日本語"))) {
  throw new Error("Cold and cached tokenizers must produce identical readings.");
}
console.log(`real loader verified ${requested.length} pinned assets and a network-free cached reload: ${readings.join(", ")}`);
