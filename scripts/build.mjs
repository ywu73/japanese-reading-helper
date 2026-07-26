import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { asLineComments } from "./legal-comments.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const vendorManifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
const legalFiles = [
  ["YomiRuby — MIT License", "LICENSE"],
  ["Kuromoji.js — Apache License 2.0", "licenses/Apache-2.0.txt"],
  ["Kuromoji.js — upstream code copyright", "licenses/Kuromoji-COPYRIGHT.txt"],
  ["Kuromoji.js — upstream NOTICE", "licenses/Kuromoji-NOTICE.md"],
  ["doublearray 0.0.2 — MIT License", "licenses/doublearray-MIT.txt"],
  ["zlibjs 0.3.1 — MIT License", "licenses/zlibjs-MIT.txt"],
  ["Katakana Terminator — MIT License", "third_party/katakana-terminator/LICENSE"],
];
const embeddedLegal = (await Promise.all(legalFiles.map(async ([title, relativePath]) => {
  const contents = await readFile(path.join(projectRoot, relativePath), "utf8");
  return [
    `// ===== ${title} =====`,
    asLineComments(contents),
  ].join("\n");
}))).join("\n//\n");
const runtimeManifest = {
  dictionary: vendorManifest.dictionary.map(({ name, resourceName, size, sha256 }) => ({
    name,
    resourceName,
    size,
    sha256,
  })),
};
const resourceMetadata = vendorManifest.dictionary
  .map((asset) => `// @resource     ${asset.resourceName} ${asset.url}#sha256=${asset.sha256}`)
  .join("\n");
const header = `// ==UserScript==
// @name         YomiRuby
// @name:zh-CN   日语网页注音助手
// @namespace    yomi-ruby.local
// @version      ${packageJson.version}
// @description  Add local Kanji Romaji and optional online Katakana English ruby to Japanese web text.
// @description:zh-CN  为日语网页添加本地汉字罗马音和可选的联网片假名英文注音。
// @homepageURL  https://github.com/ywu73/yomi-ruby
// @supportURL   https://github.com/ywu73/yomi-ruby/issues
// @downloadURL  https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js
// @updateURL    https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @noframes
// @run-at       document-idle
${resourceMetadata}
// @connect      translate.googleapis.com
// @connect      www.bing.com
// @connect      cn.bing.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceURL
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
//
// YomiRuby copyright (c) 2026 ywu73.
// Third-party provenance and independent license files are retained in the repository.
//
${embeddedLegal}`;

const result = await build({
  entryPoints: [path.join(projectRoot, "src/main.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  charset: "utf8",
  legalComments: "none",
  minify: false,
  sourcemap: false,
  plugins: [
    {
      name: "yomi-ruby-runtime-manifest",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^yomi-ruby:runtime-manifest$/ }, () => ({
          path: "runtime-manifest",
          namespace: "yomi-ruby",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "yomi-ruby" }, () => ({
          contents: `export default ${JSON.stringify(runtimeManifest)};`,
          loader: "js",
        }));
      },
    },
  ],
  write: false,
});

await mkdir(path.join(projectRoot, "dist"), { recursive: true });
const legacyOutputPath = path.join(projectRoot, "dist/japanese-romaji-ruby.user.js");
const outputPath = path.join(projectRoot, "dist/yomi-ruby.user.js");
await rm(legacyOutputPath, { force: true });
await writeFile(outputPath, `${header}\n\n${result.outputFiles[0].text}`, "utf8");
console.log(`built ${path.relative(projectRoot, outputPath)}`);
