import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const vendorManifest = JSON.parse(await readFile(path.join(projectRoot, "vendor/manifest.json"), "utf8"));
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
// @description  Add local kanji romaji and opt-in katakana English ruby to Japanese web text.
// @description:zh-CN  为日语网页添加本地汉字罗马音和按网站授权的片假名英文注音。
// @match        http://*/*
// @match        https://*/*
// @noframes
// @run-at       document-idle
${resourceMetadata}
// @connect      translate.googleapis.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceURL
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
//
// Runtime attribution: statically bundled Kuromoji.js 0.1.2 modules, Apache-2.0.
// Source and license: https://github.com/takuyaa/kuromoji.js/tree/0.1.2
// Katakana matching semantics derived from Katakana Terminator, MIT.
// Source: https://github.com/Arnie97/katakana-terminator`;

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
