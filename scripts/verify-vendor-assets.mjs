import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestUrl = new URL("../vendor/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const assets = manifest.dictionary;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const results = await Promise.all(assets.map(async (asset) => {
  const response = await fetch(asset.url, {
    redirect: "follow",
    headers: { "user-agent": "yomi-ruby-vendor-verifier/0.6.1" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`${asset.name}: HTTP ${response.status} from ${asset.url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = sha256(bytes);
  if (bytes.byteLength !== asset.size) {
    throw new Error(`${asset.name}: expected ${asset.size} bytes, received ${bytes.byteLength}`);
  }
  if (digest !== asset.sha256) {
    throw new Error(`${asset.name}: expected SHA-256 ${asset.sha256}, received ${digest}`);
  }
  return `verified ${asset.name} ${bytes.byteLength} bytes sha256:${digest}`;
}));

for (const result of results) {
  console.log(result);
}

console.log(`verified ${assets.length} pinned assets from ${manifest.baseUrl}`);
