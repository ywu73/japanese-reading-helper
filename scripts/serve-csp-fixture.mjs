import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const host = "127.0.0.1";
const port = 8766;
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
].join("; ");

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
    const requestedPath = pathname === "/" ? "/tests/fixtures/csp.html" : pathname;
    const filePath = path.resolve(projectRoot, `.${requestedPath}`);
    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": csp,
      "Content-Type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`strict CSP fixture listening on http://${host}:${port}/tests/fixtures/csp.html`);
});
