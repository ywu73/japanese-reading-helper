import { AnnotationCoordinator as Before } from "baseline:coordinator.js";
import { AnnotationCoordinator as After } from "../../../src/coordinator.js";

const report = { context: "ordinary page, synthetic adapter, no provider requests", results: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function measure(Coordinator, scenario) {
  const fixture = document.createElement("main");
  fixture.innerHTML = scenario === "code"
    ? `<pre>${"<span>日本語のコード</span>".repeat(10000)}</pre><p>東京</p>`
    : `${"<span>plain English text</span>".repeat(10000)}<p>東京</p>`;
  document.body.append(fixture);
  // Measure scanning of an already laid-out page, not fixture construction's
  // deferred style/layout work on the first safe text node.
  fixture.getBoundingClientRect();
  const timers = [], seen = [];
  let slices = 0, traversals = 0;
  const original = document.createTreeWalker;
  document.createTreeWalker = function (...args) {
    const walker = original.apply(this, args);
    for (const method of ["nextNode", "nextSibling", "parentNode"]) {
      const call = walker[method].bind(walker);
      walker[method] = () => { traversals++; return call(); };
    }
    return walker;
  };
  const coordinator = new Coordinator({ document, MutationObserver: null,
    requestIdleCallback: null, now: () => 0, scanBatchSize: 100,
    setTimer(callback) { const timer = { callback }; timers.push(timer); return timer; },
    clearTimer(timer) { timer.cancelled = true; },
  });
  try {
    const start = performance.now();
    coordinator.enableKanji({ plan(record) { seen.push(record.text); return { ranges: [] }; }, forget() {}, pause() {}, resume() {} });
    let remaining = 10000;
    while (timers.length && remaining-- > 0) {
      const timer = timers.shift();
      if (!timer.cancelled) { slices++; timer.callback(); }
    }
    const elapsedMs = Number((performance.now() - start).toFixed(2));
    assert(remaining > 0 && JSON.stringify(seen) === '["東京"]', "Traversal lost or added source records");
    assert(fixture.querySelectorAll("span").length === 10000, "Fixture changed");
    return { elapsedMs, traversals, slices };
  } finally { coordinator.stop(); document.createTreeWalker = original; fixture.remove(); }
}

async function main() {
  for (const scenario of ["code", "english-control"]) {
    const trials = [];
    for (const version of ["before", "after", "after", "before", "before", "after"]) {
      await delay(30);
      trials.push({ version, ...measure(version === "before" ? Before : After, scenario) });
    }
    report.results.push({ scenario, trials });
  }
  report.status = "passed";
}
main().catch((error) => { report.status = "failed"; report.error = error.message; }).finally(() => {
  document.querySelector("#result").textContent = JSON.stringify(report, null, 2);
});
