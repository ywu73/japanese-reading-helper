import { buildStaticTokenizer, buildStaticTokenizerAsync } from "../../../src/static-tokenizer.js";
import { loadVerifiedKuromoji } from "../../../src/vendor-loader.js";
import { createAnalyzer } from "../../../src/analyzer.js";

const assets = DICTIONARY_ASSETS;
const texts = Array(200).fill("今日は東京で日本語を勉強し、食べる方法を思う。😀𠮷 ABC カタカナ。");
const report = { context: "ordinary page, not Tampermonkey", trials: [], checks: {} };
const publish = () => { document.querySelector("#result").textContent = JSON.stringify(report, null, 2); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) => value.toString(16).padStart(2, "0")).join("");

async function main() {
  const files = new Map(await Promise.all(assets.map(async (asset) => {
    const response = await fetch(`/dict/${asset.name}`, { credentials: "omit" });
    assert(response.ok, "Fixture asset unavailable");
    const bytes = await response.arrayBuffer();
    assert(bytes.byteLength === asset.size && await hash(bytes) === asset.sha256, "Asset integrity mismatch");
    return [asset.name, bytes];
  })));
  let expected;
  for (const mode of ["legacy", "native", "native", "legacy", "legacy", "native"]) {
    let last = performance.now();
    let maximum = 0;
    const timer = setInterval(() => { const now = performance.now(); maximum = Math.max(maximum, now - last); last = now; }, 10);
    let tokenizer, started, initialized, finished, segments;
    try {
      await delay(30);
      started = performance.now();
      tokenizer = mode === "legacy" ? buildStaticTokenizer(files) : await buildStaticTokenizerAsync(files);
      initialized = performance.now();
      segments = texts.map(createAnalyzer(tokenizer));
      finished = performance.now();
      await delay(30);
    } finally { clearInterval(timer); }
    const actual = JSON.stringify(segments);
    if (expected === undefined) expected = actual;
    assert(actual === expected, "Native and legacy output differs");
    assert(segments.every((items, index) => items.map((item) => item.surface ?? item.text).join("") === texts[index]), "Source changed");
    report.trials.push({ mode, initializationMs: Math.round(initialized - started), analysisMs: Math.round(finished - initialized), totalMs: Math.round(finished - started), maxTimerGapMs: Math.round(maximum) });
    publish();
  }
  report.checks.identicalOutputAndPreservedSource = true;
  const requests = [];
  const tokenizer = await loadVerifiedKuromoji({
    manifest: { dictionary: assets },
    getResourceUrl: (name) => `blob:fixture/${name}`,
    gmRequest(details) {
      assert(details.method === "GET" && details.anonymous === true && !("data" in details), "Invalid resource request");
      const asset = assets.find((item) => details.url === `blob:fixture/${item.resourceName}`);
      assert(asset, "Unexpected resource URL");
      requests.push(asset.name);
      queueMicrotask(() => details.onload({ status: 200, response: files.get(asset.name).slice(0) }));
    },
  });
  assert(new Set(requests).size === 12 && requests.length === 12 && tokenizer.tokenize("東京")[0].reading === "トウキョウ", "Verified loader failed");
  report.checks.verifiedLoaderWithLocalGmMock = true;
  const NativeStream = globalThis.DecompressionStream;
  try {
    globalThis.DecompressionStream = undefined;
    const fallback = await buildStaticTokenizerAsync(files);
    assert(fallback.tokenize("東京")[0].reading === "トウキョウ", "Missing API fallback failed");
    report.checks.missingApiUsesBundledDecoder = true;
  } finally { globalThis.DecompressionStream = NativeStream; }
  const controller = new AbortController();
  const loading = buildStaticTokenizerAsync(files, { signal: controller.signal });
  const cancellation = setTimeout(() => controller.abort(), 1);
  try {
    await loading;
    throw new Error("Expected initialization cancellation");
  } catch (error) {
    assert(controller.signal.aborted && (error.name === "AbortError" || /aborted/.test(error.message)), "Unexpected cancellation result");
    report.checks.nativeInitializationCancellation = true;
  } finally { clearTimeout(cancellation); }
  files.clear();
  report.status = "passed";
}

main().catch((error) => { report.status = "failed"; report.error = { name: error.name, message: error.message }; }).finally(publish);
