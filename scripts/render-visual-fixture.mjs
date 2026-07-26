import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

import { createAnalyzer } from "../src/analyzer.js";
import { AnnotationCoordinator } from "../src/coordinator.js";
import { installStyles } from "../src/styles.js";
import { loadVerifiedKuromoji } from "../src/vendor-loader.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.dirname(fileURLToPath(import.meta.resolve("kuromoji/package.json")));
const manifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
const source = await readFile(path.join(projectRoot, "tests/fixtures/manual.html"), "utf8");
const bytesByUrl = new Map();
const resourceUrlByName = new Map();

for (const asset of manifest.dictionary) {
  const buffer = await readFile(path.join(packageRoot, asset.path));
  const resourceUrl = `blob:yomi-ruby-visual-resource/${asset.resourceName}`;
  resourceUrlByName.set(asset.resourceName, resourceUrl);
  bytesByUrl.set(resourceUrl, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

const tokenizer = await loadVerifiedKuromoji({
  manifest,
  getResourceUrl: (name) => resourceUrlByName.get(name),
  gmRequest({ url, onload, onerror }) {
    const response = bytesByUrl.get(url);
    queueMicrotask(() => response
      ? onload({ status: 200, response: response.slice(0) })
      : onerror(new Error(`Unexpected URL ${url}`)));
  },
});

const dom = new JSDOM(source, { pretendToBeVisual: true });
installStyles(dom.window.document);
const coordinator = new AnnotationCoordinator({
  document: dom.window.document,
  IntersectionObserver: undefined,
  MutationObserver: undefined,
  requestIdleCallback: undefined,
  cancelIdleCallback: undefined,
});
coordinator.enableKanji(createAnalyzer(tokenizer));
dom.window.document.title = "YomiRuby annotated visual fixture";

const outputPath = path.join(projectRoot, "work/prototypes/annotated-preview.html");
await writeFile(outputPath, dom.serialize(), "utf8");
console.log(`rendered ${path.relative(projectRoot, outputPath)}`);
