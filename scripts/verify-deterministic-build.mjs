import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const buildScript = new URL("build.mjs", import.meta.url);
const outputUrl = new URL("../dist/yomi-ruby.user.js", import.meta.url);

const buildOnce = async () => {
  execFileSync(process.execPath, [buildScript.pathname], { stdio: "inherit" });
  return readFile(outputUrl);
};

const first = await buildOnce();
const second = await buildOnce();
assert.deepEqual(second, first, "Two builds from the same source were not byte-for-byte identical.");

const sha256 = createHash("sha256").update(second).digest("hex");
console.log(`deterministic build passed: ${second.byteLength} bytes, sha256=${sha256}`);
