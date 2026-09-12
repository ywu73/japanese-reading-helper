const article = document.querySelector("#article");
const expected = article.cloneNode(true);
const authorSpan = article.querySelector("#author rt span");
let authorClicks = 0;
authorSpan.addEventListener("click", () => authorClicks++);
let firstAnnotationMs = null;
let lastActionAt = performance.now();
let mutationBatches = 0;
const longTasks = [];
if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration));
  }).observe({ type: "longtask" });
}
new MutationObserver(() => {
  mutationBatches++;
  if (firstAnnotationMs == null && article.querySelector("ruby[data-yomi-ruby-generated]")) {
    firstAnnotationMs = Math.round(performance.now() - lastActionAt);
  }
}).observe(article, { childList: true, subtree: true });

function sourceMarkup(root) {
  const clone = root.cloneNode(true);
  for (const ruby of clone.querySelectorAll("ruby[data-yomi-ruby-generated]")) {
    ruby.replaceWith(document.createTextNode(ruby.querySelector(".yomi-ruby-base").textContent));
  }
  const authorRt = clone.querySelector("#author rt");
  authorRt.replaceWith(expected.querySelector("#author rt").cloneNode(true));
  return clone.innerHTML;
}

function snapshot(extra = {}) {
  const rubies = [...article.querySelectorAll("ruby[data-yomi-ruby-generated]")];
  const report = {
    time: new Date().toISOString(),
    userAgent: navigator.userAgent,
    origin: location.origin,
    generated: rubies.length,
    features: [...new Set(rubies.map((ruby) => ruby.dataset.yomiRubyFeature))],
    samples: rubies.slice(0, 16).map((ruby) => [ruby.querySelector(".yomi-ruby-base").textContent, ruby.querySelector("rt").textContent]),
    hiddenAnnotations: article.querySelectorAll('[hidden] [data-yomi-ruby-generated], .concealed [data-yomi-ruby-generated], details:not([open]) p [data-yomi-ruby-generated]').length,
    unsafeAnnotations: article.querySelectorAll('form [data-yomi-ruby-generated], [contenteditable] [data-yomi-ruby-generated], pre [data-yomi-ruby-generated], code [data-yomi-ruby-generated]').length,
    terminatorPreserved: article.querySelector("#terminator").outerHTML === expected.querySelector("#terminator").outerHTML,
    sourcePreserved: sourceMarkup(article) === expected.innerHTML,
    completeRollback: article.innerHTML === expected.innerHTML,
    authorReading: article.querySelector("#author rt").textContent,
    originalAuthorNodeConnected: authorSpan.isConnected,
    firstAnnotationMs,
    longestTaskMs: Math.max(0, ...longTasks),
    longTaskCount: longTasks.length,
    mutationBatches,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
    ...extra,
  };
  const { time, userAgent, origin, samples, firstAnnotationMs: annotationTime, longestTaskMs, longTaskCount, mutationBatches: batches, heapBytes, ...checks } = report;
  document.querySelector("#report").textContent = JSON.stringify(checks, null, 2);
  document.querySelector("#readings").textContent = JSON.stringify(samples);
  document.querySelector("#timing").textContent = JSON.stringify({ time, userAgent, origin,
    firstAnnotationSinceActionMs: annotationTime, longestTaskMs, longTaskCount, mutationBatches: batches, heapBytes }, null, 2);
}
function mutate(action) {
  lastActionAt = performance.now(); firstAnnotationMs = null;
  action(article); action(expected); snapshot();
}
document.querySelector("#snapshot").onclick = () => snapshot();
document.querySelector("#reveal").onclick = () => mutate((root) => {
  root.querySelector("#hidden").hidden = false;
  root.querySelector("#styled").className = "visible";
  root.querySelector("#details").open = true;
});
document.querySelector("#conceal").onclick = () => mutate((root) => {
  root.querySelector("#hidden").hidden = true;
  root.querySelector("#styled").className = "concealed";
  root.querySelector("#details").open = false;
});
document.querySelector("#append").onclick = () => mutate((root) => {
  root.querySelector("#extra").innerHTML = Array.from({ length: 200 }, (_, index) => `<p>項目 ${index}：東京で日本語を勉強する。ゲームとテレビ。</p>`).join("");
});
document.querySelector("#remove").onclick = () => mutate((root) => root.querySelector("#extra").replaceChildren());
document.querySelector("#rollback").onclick = () => {
  const before = authorClicks;
  article.querySelector("#author rt span")?.click();
  snapshot({ authorListenerPreserved: authorClicks === before + 1 });
};
snapshot();
