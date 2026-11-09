import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const candidate = await build({
  entryPoints: [new URL("../tests/fixtures/coordinator-smoke.js", import.meta.url).pathname],
  bundle: true, format: "iife", platform: "browser", target: "chrome120", write: false,
});
const optimization = await build({
  entryPoints: [new URL("../tests/fixtures/optimization-smoke.js", import.meta.url).pathname],
  bundle: true, format: "iife", platform: "browser", target: "chrome120", write: false,
});
const manifest = JSON.parse(await readFile(new URL("../vendor/manifest.json", import.meta.url), "utf8"));

const routes = new Map([
  ["/", ["tests/fixtures/browser-smoke.html", "text/html; charset=utf-8"]],
  ["/candidate", ["tests/fixtures/browser-smoke.html", "text/html; charset=utf-8"]],
  ["/optimization", ["tests/fixtures/optimization-smoke.html", "text/html; charset=utf-8"]],
  ["/smoke.js", ["tests/fixtures/browser-smoke.js", "text/javascript; charset=utf-8"]],
  ["/yomi-ruby.user.js", ["dist/yomi-ruby.user.js", "text/javascript; charset=utf-8"]],
]);
for (const asset of manifest.dictionary) {
  routes.set(`/dict/${asset.name}`, [`node_modules/kuromoji/dict/${asset.name}`, "application/octet-stream"]);
}
for (const port of [8767, 8768]) {
  createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/candidate.js" || url.pathname === "/optimization.js") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" })
        .end((url.pathname === "/candidate.js" ? candidate : optimization).outputFiles[0].text);
      return;
    }
    const route = routes.get(url.pathname);
    if (!route) { response.writeHead(404).end("Not found"); return; }
    try {
      let bytes = await readFile(new URL(`../${route[0]}`, import.meta.url));
      if (url.pathname === "/candidate") {
        bytes = Buffer.from(bytes.toString("utf8").replace("</html>", '<script src="/candidate.js"></script>\n</html>'));
      }
      const headers = { "Content-Type": route[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
      if (url.searchParams.has("csp")) {
        headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'none'; object-src 'none'";
      }
      response.writeHead(200, headers).end(bytes);
    } catch { response.writeHead(500).end("Fixture unavailable"); }
  }).listen(port, "127.0.0.1", () => console.log(`Browser verification: http://127.0.0.1:${port}/`));
}
