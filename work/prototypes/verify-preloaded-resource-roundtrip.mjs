import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildStaticTokenizer } from "../../src/static-tokenizer.js";
import { readAndVerifyResource } from "../../src/vendor-loader.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
const resourceUrls = new Map();

for (const asset of manifest.dictionary) {
  const bytes = await readFile(path.join(projectRoot, "node_modules/kuromoji/dict", asset.name));
  const resourceName = `yomi-ruby-dict-${asset.name.replace(/\.dat\.gz$/u, "").replaceAll("_", "-")}`;
  resourceUrls.set(resourceName, URL.createObjectURL(new Blob([bytes], { type: "application/gzip" })));
  asset.resourceName = resourceName;
}

const requestedNames = [];
const requestedUrls = [];
const getResourceUrl = (name) => {
  requestedNames.push(name);
  return resourceUrls.get(name);
};
const gmRequest = (details) => {
  requestedUrls.push(details.url);
  const blob = resolveObjectURL(details.url);
  blob.arrayBuffer().then(
    (response) => details.onload({ status: 200, response }),
    details.onerror,
  );
};

const NativeFunction = globalThis.Function;
globalThis.Function = function BlockedDynamicFunction() {
  throw new EvalError("CSP unsafe-eval blocked");
};

try {
  const entries = await Promise.all(
    manifest.dictionary.map(async (asset) => [
      asset.name,
      await readAndVerifyResource(asset, getResourceUrl, gmRequest),
    ]),
  );
  const tokenizer = buildStaticTokenizer(new Map(entries));
  const readings = Object.fromEntries(
    tokenizer
      .tokenize("今日 東京 日本語 勉強")
      .filter((token) => token.reading)
      .map((token) => [token.surface_form, token.reading]),
  );

  assert.deepEqual(readings, {
    今日: "キョウ",
    勉強: "ベンキョウ",
    日本語: "ニホンゴ",
    東京: "トウキョウ",
  });
  assert.deepEqual(requestedNames, manifest.dictionary.map((asset) => asset.resourceName));
  assert.equal(requestedUrls.length, 12);
  assert.ok(requestedUrls.every((url) => url.startsWith("blob:")));
  assert.ok(requestedUrls.every((url) => !url.startsWith("https:")));

  console.log("preloaded resource prototype passed: 12 verified Blob assets, no remote runtime URL");
  console.log(readings);
} finally {
  globalThis.Function = NativeFunction;
  for (const resourceUrl of resourceUrls.values()) {
    URL.revokeObjectURL(resourceUrl);
  }
}
