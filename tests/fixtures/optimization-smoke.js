import manifest from "../../vendor/manifest.json";
import { loadLazyVerifiedKuromoji } from "../../src/lazy-dictionary-loader.js";
import { createAnalyzer, createCooperativeAnalyzer } from "../../src/analyzer.js";
import { AnnotationCoordinator } from "../../src/coordinator.js";
import { createYomiRubySession } from "../../src/session.js";
import { createOnlineKanjiAnalyzer } from "../../src/online-kanji-analyzer.js";

const output = document.querySelector("#result");
const article = document.querySelector("#article");
const button = document.querySelector("#run");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cache = new Map();
let requests = 0;

button.addEventListener("click", async () => {
  button.disabled = true;
  let session;
  const report = { userAgent: navigator.userAgent, checks: {}, measurements: {} };
  try {
    output.textContent = "Loading verified local fixture dictionaries…";
    const progress = [];
    const options = {
      manifest, getValue: (key) => cache.get(key), setValue: (key, value) => cache.set(key, value),
      onProgress: ({ completed }) => progress.push(completed),
      gmRequest({ url, onload, onerror }) {
        const asset = manifest.dictionary.find((entry) => entry.url === url);
        if (!asset) throw new Error("Unapproved fixture dictionary");
        requests++;
        const controller = new AbortController();
        // This fixture maps fixed production URLs to local files. It exercises
        // validation and cache behavior, not Tampermonkey transport or headers.
        fetch(`/dict/${asset.name}`, { signal: controller.signal }).then(async (response) => {
          onload({ status: response.status, finalUrl: url, response: await response.arrayBuffer() });
        }).catch(onerror);
        return { abort: () => controller.abort() };
      },
    };
    const before = requests;
    const tokenizer = await loadLazyVerifiedKuromoji(options);
    report.checks.dictionaryProgress = progress.join(",") === Array.from({ length: 13 }, (_, index) => index).join(",");
    report.checks.coldRequests = requests - before === 12;
    await loadLazyVerifiedKuromoji(options);
    report.checks.warmCache = requests - before === 12;
    const source = "今日は東京で日本語を勉強し、食べる方法を思う。".repeat(500);
    const sync = createAnalyzer(tokenizer);
    const cooperative = createCooperativeAnalyzer(tokenizer);
    sync("東京");
    output.textContent = "Comparing long-text analysis…";
    const baseline = await measure(() => sync(source));
    const candidate = await measure(() => cooperative(source));
    report.checks.identicalSegments = JSON.stringify(baseline.value) === JSON.stringify(candidate.value);
    report.measurements.characters = source.length;
    report.measurements.synchronous = baseline.timing;
    report.measurements.cooperative = candidate.timing;

    const paragraph = document.createElement("p");
    paragraph.textContent = source;
    article.replaceChildren(paragraph);
    const coordinator = new AnnotationCoordinator({ document });
    session = createYomiRubySession({ document, coordinator,
      kanjiAnalyzerFactories: { local: async () => cooperative },
      translationProviderFactories: { google: () => async () => new Map() },
    });
    const expected = candidate.value.filter((segment) => segment.type === "annotation").length;
    output.textContent = "Checking scheduled DOM rendering…";
    const rendered = await measure(async () => {
      await session.kanji.enable();
      await until(() => paragraph.querySelectorAll("rt").length === expected);
    });
    report.measurements.analyzeAndRender = rendered.timing;
    report.measurements.annotations = expected;
    report.checks.sourcePreserved = [...paragraph.querySelectorAll(".yomi-ruby-base")].length === expected;
    const base = paragraph.querySelector(".yomi-ruby-base");
    const added = document.createElement("span");
    added.textContent = base.textContent;
    let clicked = 0;
    added.addEventListener("click", () => clicked++);
    base.replaceChildren(added);
    session.stop();
    added.click();
    report.checks.rollback = paragraph.textContent === source && paragraph.querySelectorAll("ruby").length === 0;
    report.checks.pageNodePreserved = added.isConnected && clicked === 1;

    const providerCalls = [];
    paragraph.textContent = "東京と大阪";
    session = createYomiRubySession({ document, coordinator, kanjiMode: "google",
      kanjiAnalyzerFactories: { google: async () => createOnlineKanjiAnalyzer({
        romanizeWords: async (words) => {
          providerCalls.push(words);
          return providerCalls.length === 1 ? new Map([["東京", "Tokyo"]]) : new Map([["大阪", "Osaka"]]);
        },
      }) },
      translationProviderFactories: { google: () => async () => new Map() },
    });
    await session.kanji.enable();
    await until(() => session.kanji.getState().hasFailures);
    await session.kanji.retry();
    await until(() => paragraph.querySelectorAll("rt").length === 2);
    report.checks.retryOnlyFailures = JSON.stringify(providerCalls) === JSON.stringify([["東京", "大阪"], ["大阪"]]);
    session.stop();
    report.checks.retryRollback = paragraph.textContent === "東京と大阪" && !paragraph.querySelector("ruby");
    report.passed = Object.values(report.checks).every(Boolean);
    article.replaceChildren();
  } catch (error) {
    report.passed = false;
    report.error = error.stack ?? String(error);
  } finally {
    session?.stop();
    output.textContent = JSON.stringify(report, null, 2);
    button.disabled = false;
  }
});

async function measure(operation) {
  let previous = performance.now();
  let maxGapMs = 0;
  const timer = setInterval(() => {
    const current = performance.now();
    maxGapMs = Math.max(maxGapMs, current - previous);
    previous = current;
  }, 10);
  await delay(30);
  const start = performance.now();
  try {
    const value = await operation();
    const durationMs = performance.now() - start;
    await delay(30);
    return { value, timing: { durationMs: Math.round(durationMs), maxTimerGapMs: Math.round(maxGapMs) } };
  } finally { clearInterval(timer); }
}

async function until(predicate) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    if (predicate()) return;
    await delay(10);
  }
  throw new Error("Fixture operation did not finish within 20 seconds.");
}
