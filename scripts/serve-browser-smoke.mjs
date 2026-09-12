import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const routes = new Map([
  ["/", ["tests/fixtures/browser-smoke.html", "text/html; charset=utf-8"]],
  ["/smoke.js", ["tests/fixtures/browser-smoke.js", "text/javascript; charset=utf-8"]],
  ["/yomi-ruby.user.js", ["dist/yomi-ruby.user.js", "text/javascript; charset=utf-8"]],
]);
for (const port of [8767, 8768]) {
  createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const route = routes.get(url.pathname);
    if (!route) { response.writeHead(404).end("Not found"); return; }
    try {
      const bytes = await readFile(new URL(`../${route[0]}`, import.meta.url));
      const headers = { "Content-Type": route[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
      if (url.searchParams.has("csp")) {
        headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'none'; object-src 'none'";
      }
      response.writeHead(200, headers).end(bytes);
    } catch { response.writeHead(500).end("Fixture unavailable"); }
  }).listen(port, "127.0.0.1", () => console.log(`Browser verification: http://127.0.0.1:${port}/`));
}
