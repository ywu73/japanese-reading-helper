import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const packageRoot = path.dirname(fileURLToPath(import.meta.resolve("kuromoji/package.json")));
const manifest = JSON.parse(await readFile(path.join(root, "vendor/manifest.json"), "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assets = new Map();
for (const asset of manifest.dictionary) {
  const bytes = await readFile(path.join(packageRoot, asset.path));
  if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) {
    throw new Error(`Dictionary verification failed: ${asset.name}`);
  }
  assets.set(`/dict/${asset.name}`, bytes);
}
const bundle = async (name, define = {}) => (await build({
  absWorkingDir: root,
  entryPoints: [`work/prototypes/local-worker/${name}.js`],
  bundle: true, write: false, format: "iife", platform: "browser",
  target: "chrome120", legalComments: "inline", define,
})).outputFiles[0].contents;
const worker = await bundle("worker");
const harness = await bundle("harness", {
  WORKER_SOURCE: JSON.stringify(new TextDecoder().decode(worker)),
  WORKER_SHA256: JSON.stringify(digest(worker)),
  DICTIONARY_ASSETS: JSON.stringify(manifest.dictionary.map(({ name, size, sha256 }) => ({ name, size, sha256 }))),
});
const baseCsp = "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'";
const pages = new Map([
  ["/allow", `${baseCsp}; worker-src blob:`],
  ["/deny", `${baseCsp}; worker-src 'none'`],
  ["/fallback", baseCsp],
]);
const html = Buffer.from('<!doctype html><meta charset="utf-8"><title>YomiRuby local Worker feasibility</title><h1>Local Worker feasibility</h1><p>Real pinned dictionary; synthetic text; no external requests.</p><pre id="result">Running…</pre><script src="/harness.js"></script>');
const server = createServer((request, response) => {
  if (request.method !== "GET") { response.writeHead(405).end(); return; }
  const route = request.url;
  const content = pages.has(route) ? html : route === "/harness.js" ? harness : assets.get(route);
  if (!content) { response.writeHead(404).end(); return; }
  response.writeHead(200, {
    "Content-Type": pages.has(route) ? "text/html; charset=utf-8" : route === "/harness.js" ? "text/javascript; charset=utf-8" : "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(pages.has(route) ? { "Content-Security-Policy": pages.get(route) } : {}),
  });
  response.end(content);
});
server.listen(0, "127.0.0.1", () => {
  console.log(JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, dictionaryFiles: assets.size, workerBytes: worker.length, workerSha256: digest(worker) }));
});
