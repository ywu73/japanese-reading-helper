import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const packageRoot = path.dirname(fileURLToPath(import.meta.resolve("kuromoji/package.json")));
const manifest = JSON.parse(await readFile(path.join(root, "vendor/manifest.json"), "utf8"));
const assets = new Map();
for (const asset of manifest.dictionary) {
  const bytes = await readFile(path.join(packageRoot, asset.path));
  if (bytes.length !== asset.size || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error(`Dictionary verification failed: ${asset.name}`);
  }
  assets.set(`/dict/${asset.name}`, bytes);
}
const harness = (await build({
  absWorkingDir: root, entryPoints: ["work/prototypes/native-dictionary/harness.js"],
  bundle: true, write: false, format: "iife", platform: "browser", target: "chrome120",
  legalComments: "inline", define: { DICTIONARY_ASSETS: JSON.stringify(manifest.dictionary) },
})).outputFiles[0].contents;
const html = Buffer.from('<!doctype html><meta charset="utf-8"><title>YomiRuby dictionary decompression</title><h1>Native dictionary decompression</h1><p>Ordinary page; real dictionary; synthetic text; Worker disabled by CSP.</p><pre id="result">Running…</pre><script src="/harness.js"></script>');
const server = createServer((request, response) => {
  if (request.method !== "GET") { response.writeHead(405).end(); return; }
  const route = request.url;
  const content = route === "/" ? html : route === "/harness.js" ? harness : assets.get(route);
  if (!content) { response.writeHead(404).end(); return; }
  response.writeHead(200, {
    "Content-Type": route === "/" ? "text/html; charset=utf-8" : route === "/harness.js" ? "text/javascript; charset=utf-8" : "application/octet-stream",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'none'",
  });
  response.end(content);
});
server.listen(0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}/`));
