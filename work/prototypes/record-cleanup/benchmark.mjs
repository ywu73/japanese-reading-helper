import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { KanjiRuntime } from "../../../src/kanji-runtime.js";
import { KatakanaRuntime } from "../../../src/katakana-runtime.js";

// This fixed local Git baseline predates indexed record cleanup. No network or
// provider is used. Only the forget loop is timed, not setup or DOM restoration.
const baseline = "0cf27a9424236a679b0762163a4dad30de29f90f";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const readBaseline = (file) => execFileSync("git", ["show", `${baseline}:src/${file}`], { cwd: root, encoding: "utf8" });
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const katakanaUrl = moduleUrl(readBaseline("katakana.js"));
const before = {
  kanji: (await import(moduleUrl(readBaseline("kanji-runtime.js")))).KanjiRuntime,
  katakana: (await import(moduleUrl(readBaseline("katakana-runtime.js").replace('"./katakana.js"', JSON.stringify(katakanaUrl))))).KatakanaRuntime,
};
const after = { kanji: KanjiRuntime, katakana: KatakanaRuntime };
const size = 5000;
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const kanaNumber = (number) => {
  let result = "ゲーム";
  do { result += String.fromCharCode(0x30a1 + number % 64); number = Math.floor(number / 64); } while (number);
  return result;
};

async function measure(Runtime, kind, pending) {
  let complete;
  const gate = new Promise((resolve) => { complete = resolve; });
  let notified = 0;
  const runtime = kind === "kanji"
    ? new Runtime({ mode: "local", analyzerFactories: { local: () => (text) => [{ type: "text", text }] }, onPlanChanged: () => notified++ })
    : new Runtime({ provider: "google", translatorFactories: { google: () => () => gate }, onPlanChanged: () => notified++ });
  await runtime.enable();
  if (pending) runtime.pause();
  const records = Array.from({ length: size }, (_, index) => ({ text: kind === "kanji" ? `東京${index}` : kanaNumber(index) }));
  for (const record of records) runtime.plan(record);
  if (!pending && kind === "katakana") { complete(new Map()); await tick(); }
  assert.equal(runtime.cache.size, size);
  assert.equal(notified, pending ? 0 : size);
  const started = performance.now();
  for (const record of records) runtime.forget(record);
  const durationMs = performance.now() - started;
  for (const entry of runtime.cache.values()) assert.equal(entry.waiters.size, 0);
  runtime.stop();
  complete(new Map());
  await tick();
  return Number(durationMs.toFixed(3));
}

const results = [];
for (const kind of ["kanji", "katakana"]) {
  for (const pending of [false, true]) {
    const trials = { before: [], after: [] };
    for (const version of ["before", "after", "after", "before", "before", "after"]) {
      trials[version].push(await measure((version === "before" ? before : after)[kind], kind, pending));
    }
    const median = (values) => [...values].sort((a, b) => a - b)[1];
    results.push({ kind, state: pending ? "pending" : "settled", records: size,
      beforeMs: trials.before, afterMs: trials.after,
      medianBeforeMs: median(trials.before), medianAfterMs: median(trials.after) });
  }
}
console.log(JSON.stringify({ baseline, node: process.version, workload: "synthetic runtime record cleanup; no DOM or provider time", results }, null, 2));
