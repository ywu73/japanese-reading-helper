import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadVerifiedKuromoji } from "../../src/vendor-loader.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
const runtimeManifest = {
  dictionary: manifest.dictionary.map(({ name, resourceName, size, sha256 }) => ({
    name,
    resourceName,
    size,
    sha256,
  })),
};

test("builds a tokenizer from verified dictionaries when dynamic JavaScript evaluation is blocked", async () => {
  const requestedResources = [];
  const requestedUrls = [];
  const getResourceUrl = (resourceName) => {
    requestedResources.push(resourceName);
    return `blob:tampermonkey-resource/${resourceName}`;
  };
  const gmRequest = asyncRequestFromPinnedPackage(requestedUrls);
  // Node lazily initializes its HTTP implementation using the global Function
  // intrinsic. Browsers already expose Response before page CSP is applied.
  void globalThis.Response;
  const NativeFunction = globalThis.Function;

  globalThis.Function = function BlockedDynamicFunction() {
    throw new EvalError("CSP unsafe-eval blocked");
  };

  try {
    const tokenizer = await loadVerifiedKuromoji({ manifest: runtimeManifest, getResourceUrl, gmRequest });
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
    assert.deepEqual(requestedResources, manifest.dictionary.map((asset) => asset.resourceName));
    assert.equal(requestedUrls.length, 12);
    assert.ok(requestedUrls.every((url) => url.startsWith("blob:tampermonkey-resource/")));
    assert.ok(requestedUrls.every((url) => !url.startsWith("https:")));
  } finally {
    globalThis.Function = NativeFunction;
  }
});

function asyncRequestFromPinnedPackage(requested) {
  return (details) => {
    assert.equal(details.method, "GET");
    assert.equal(details.responseType, "arraybuffer");
    assert.equal(details.anonymous, true);
    assert.equal("data" in details, false);
    assert.equal("body" in details, false);
    requested.push(details.url);

    const resourceName = details.url.split("/").at(-1);
    const asset = manifest.dictionary.find((candidate) => candidate.resourceName === resourceName);
    assert.ok(asset, `Unknown resource requested: ${resourceName}`);
    const assetPath = path.join(projectRoot, "node_modules/kuromoji/dict", asset.name);
    readFile(assetPath).then(
      (bytes) =>
        details.onload({
          status: 200,
          response: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        }),
      details.onerror,
    );
  };
}
