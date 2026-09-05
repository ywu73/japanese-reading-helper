import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const baseline = "5888690618d8d495a06c6da186a6d16c8660f140";
const files = new Set(["coordinator.js", "dom.js", "romanize.js", "katakana.js", "viewport-scheduler.js"]);
const result = await build({
  absWorkingDir: root, entryPoints: ["work/prototypes/blocked-subtrees/harness.js"],
  bundle: true, write: false, platform: "browser", format: "iife", target: "chrome120",
  plugins: [{ name: "local-baseline", setup(builder) {
    builder.onResolve({ filter: /^baseline:/ }, (args) => ({ path: args.path.slice(9), namespace: "baseline" }));
    builder.onResolve({ filter: /^\.\//, namespace: "baseline" }, (args) => ({ path: path.posix.normalize(args.path), namespace: "baseline" }));
    builder.onLoad({ filter: /.*/, namespace: "baseline" }, (args) => {
      if (!files.has(args.path)) throw new Error(`Unexpected historical module: ${args.path}`);
      return { contents: execFileSync("git", ["show", `${baseline}:src/${args.path}`], { cwd: root, encoding: "utf8" }), loader: "js" };
    });
  } }],
});
const html = Buffer.from('<!doctype html><meta charset="utf-8"><title>YomiRuby subtree scanning</title><h1>Subtree scanning benchmark</h1><pre id="result">Running…</pre><script src="/harness.js"></script>');
const server = createServer((request, response) => {
  if (request.method !== "GET") { response.writeHead(405).end(); return; }
  const content = request.url === "/" ? html : request.url === "/harness.js" ? result.outputFiles[0].contents : null;
  if (!content) { response.writeHead(404).end(); return; }
  response.writeHead(200, {
    "Content-Type": request.url === "/" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'",
  });
  response.end(content);
});
server.listen(0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}/`));
