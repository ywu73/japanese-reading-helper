import { buildStaticTokenizer } from "../../../src/static-tokenizer.js";
import { createAnalyzer } from "../../../src/analyzer.js";

// Build-time constants contain only locally bundled code and pinned asset metadata.
const source = WORKER_SOURCE;
const expectedHash = WORKER_SHA256;
const assets = DICTIONARY_ASSETS;
const sample = "今日は東京で日本語を勉強し、食べる方法を思う。カタカナ ABC 𠮷。";
const texts = Array.from({ length: 200 }, () => sample);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) => value.toString(16).padStart(2, "0")).join("");
const report = { context: "ordinary page, not Tampermonkey", policy: location.pathname, trials: [], checks: {} };
const violations = [];
document.addEventListener("securitypolicyviolation", (event) => {
  violations.push({ directive: event.effectiveDirective, blockedScheme: event.blockedURI.split(":")[0] });
});
const publish = () => { document.querySelector("#result").textContent = JSON.stringify(report, null, 2); };
let constructions = 0;
let activeWorkers = 0;
let activeUrls = 0;

async function verifyAsset(bytes, asset) {
  assert(bytes.byteLength === asset.size && await sha256(bytes) === asset.sha256, "Dictionary integrity mismatch");
}

async function loadEntries() {
  return Promise.all(assets.map(async (asset) => {
    const response = await fetch(`/dict/${asset.name}`, { credentials: "omit" });
    assert(response.ok, "Local fixture asset unavailable");
    const bytes = await response.arrayBuffer();
    await verifyAsset(bytes, asset);
    return [asset.name, bytes];
  }));
}

async function createClient(code = source) {
  assert(await sha256(new TextEncoder().encode(code)) === expectedHash, "Worker integrity mismatch");
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  activeUrls += 1;
  const pending = new Map();
  let worker;
  let closed = false;
  let sequence = 0;
  function close(error = new Error("Worker terminated")) {
    if (closed) return;
    closed = true;
    if (worker) { worker.terminate(); activeWorkers -= 1; }
    URL.revokeObjectURL(url);
    activeUrls -= 1;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(error); }
    pending.clear();
  }
  try {
    constructions += 1;
    worker = new Worker(url);
    activeWorkers += 1;
    worker.onerror = (event) => { event.preventDefault(); close(new Error("Worker startup/runtime error")); };
    worker.onmessage = ({ data }) => {
      const task = pending.get(data.id);
      if (!task) return;
      pending.delete(data.id);
      clearTimeout(task.timer);
      if (data.error) task.reject(new Error(data.error)); else task.resolve(data.result);
    };
  } catch (error) { close(error); throw error; }
  return {
    close,
    request(type, payload, transfer = []) {
      if (closed) return Promise.reject(new Error("Worker terminated"));
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => close(new Error("Worker timed out")), 10000);
        pending.set(id, { resolve, reject, timer });
        try { worker.postMessage({ id, type, ...payload }, transfer); }
        catch (error) { close(error); }
      });
    },
  };
}

async function measure(mode, entries) {
  let lastTick = performance.now();
  let maxTimerGapMs = 0;
  let ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    maxTimerGapMs = Math.max(maxTimerGapMs, now - lastTick);
    lastTick = now;
    ticks += 1;
  }, 10);
  let client;
  try {
    await delay(30);
    const start = performance.now();
    let analyze;
    if (mode === "worker") {
      client = await createClient();
      assert(await client.request("initialize", { entries }, entries.map(([, bytes]) => bytes)) === "ready", "Initialization acknowledgement missing");
      assert(entries.every(([, bytes]) => bytes.byteLength === 0), "Dictionary buffers were not transferred");
      analyze = () => client.request("analyze", { texts });
    } else {
      const files = new Map(entries);
      let analyzer;
      try { analyzer = createAnalyzer(buildStaticTokenizer(files)); } finally { files.clear(); }
      analyze = () => texts.map(analyzer);
    }
    const initialized = performance.now();
    const results = await analyze();
    const completed = performance.now();
    // Let a timer observe any synchronous stall before stopping measurement.
    // Output assertions and equivalence hashing below are outside the sample.
    await delay(30);
    clearInterval(timer);
    const readings = results[0].filter((item) => item.type === "annotation").map((item) => `${item.surface}:${item.romaji}`);
    for (const expected of ["今日:kyō", "東京:tōkyō", "日本語:nihongo", "勉強:benkyō", "食べる:taberu", "思う:omou"]) {
      assert(readings.includes(expected), `Missing expected reading ${expected}`);
    }
    assert(results.every((segments, index) => segments.map((item) => item.surface ?? item.text).join("") === texts[index]), "Source changed");
    const outputSha256 = await sha256(new TextEncoder().encode(JSON.stringify(results)));
    return {
      mode, initializationMs: Math.round(initialized - start), analysisMs: Math.round(completed - initialized),
      totalMs: Math.round(completed - start), maxTimerGapMs: Math.round(maxTimerGapMs), ticks, outputSha256,
    };
  } finally { clearInterval(timer); client?.close(); }
}

async function main() {
  if (location.pathname !== "/allow") {
    let client;
    try {
      client = await createClient();
      await client.request("initialize", { entries: [] });
      throw new Error("Expected CSP to reject Blob Worker");
    } catch (error) {
      // Integrity/input errors must not accidentally count as a CSP rejection.
      assert(error.name === "SecurityError" || error.message === "Worker startup/runtime error", error.message);
      await delay(50);
      assert(violations.some((event) => event.directive === "worker-src" && event.blockedScheme === "blob"), "Missing Worker CSP violation evidence");
      report.checks.cspRejected = true;
      report.violations = violations;
      report.error = { name: error.name, message: error.message };
    } finally { client?.close(); }
  } else {
    const before = constructions;
    try { await createClient(`${source}\n/* corrupted */`); throw new Error("Integrity check missed corruption"); }
    catch (error) { assert(error.message === "Worker integrity mismatch", error.message); }
    report.checks.corruptCodeRejectedBeforeConstruction = constructions === before;
    const corrupt = new ArrayBuffer(assets[0].size);
    try { await verifyAsset(corrupt, assets[0]); throw new Error("Dictionary check missed corruption"); }
    catch (error) { assert(error.message === "Dictionary integrity mismatch", error.message); }
    report.checks.corruptDictionaryRejected = true;
    for (const mode of ["sync", "worker", "worker", "sync", "sync", "worker"]) {
      report.trials.push(await measure(mode, await loadEntries()));
      publish();
    }
    assert(new Set(report.trials.map((trial) => trial.outputSha256)).size === 1, "Worker output differs from main-thread output");
    report.checks.identicalOutput = true;
    const client = await createClient();
    try {
      const entries = await loadEntries();
      await client.request("initialize", { entries }, entries.map(([, bytes]) => bytes));
      const pending = client.request("analyze", { texts: Array(1000).fill(sample) });
      const observed = pending.then(() => "unexpected completion", (error) => error.message);
      client.close();
      assert(await observed === "Worker terminated", "Pending operation was not cancelled");
      report.checks.pendingRejectedOnTermination = true;
    } finally { client.close(); }
  }
  assert(activeWorkers === 0 && activeUrls === 0, "Prototype resource cleanup incomplete");
  report.checks.noActiveWorkersOrBlobUrls = true;
  report.status = "passed";
}

main().catch((error) => { report.status = "failed"; report.error = { name: error.name, message: error.message }; }).finally(publish);
