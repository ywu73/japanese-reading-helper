import {
  convertExistingKanaRuby,
  isBlockedTextContainer,
  restoreConvertedKanaRuby,
  shouldSkipTextNode,
} from "./dom.js";
import { findKatakanaMatches } from "./katakana.js";
import { ViewportScheduler } from "./viewport-scheduler.js";

export class AnnotationCoordinator {
  constructor({
    document,
    MutationObserver = document?.defaultView?.MutationObserver,
    setTimer = document?.defaultView?.setTimeout?.bind(document.defaultView) ?? globalThis.setTimeout,
    clearTimer = document?.defaultView?.clearTimeout?.bind(document.defaultView) ?? globalThis.clearTimeout,
    requestIdleCallback = document?.defaultView?.requestIdleCallback?.bind(document.defaultView),
    cancelIdleCallback = document?.defaultView?.cancelIdleCallback?.bind(document.defaultView),
    flushDelayMs = 500,
    scanBatchSize = 100,
    scanBudgetMs = 8,
    now = () => performance.now(),
  }) {
    if (!document) {
      throw new TypeError("An AnnotationCoordinator requires a document.");
    }
    this.document = document;
    this.MutationObserver = MutationObserver;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.requestIdleCallback = requestIdleCallback;
    this.cancelIdleCallback = cancelIdleCallback;
    this.flushDelayMs = flushDelayMs;
    this.scanBatchSize = scanBatchSize;
    this.scanBudgetMs = scanBudgetMs;
    this.now = now;
    this.kanjiRuntime = null;
    this.katakanaRuntime = null;
    this.active = false;
    this.hidden = document.visibilityState === "hidden";
    this.records = new Set();
    this.nodeRecords = new WeakMap();
    this.pendingRoots = new Set();
    this.scanJobs = [];
    this.scanStyleCache = null;
    this.flushTimer = null;
    this.scanHandle = null;
    this.mutationObserver = null;
    this.viewport = null;
    this.onVisibilityChange = () => this.#handleVisibilityChange();
  }

  enableKanji(runtime) {
    assertRuntime(runtime, "Kanji");
    this.kanjiRuntime = runtime;
    this.#ensureActive();
    this.#reprocessAll();
    this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
  }

  disableKanji() {
    const runtime = this.kanjiRuntime;
    this.kanjiRuntime = null;
    restoreConvertedKanaRuby(this.document);
    for (const record of this.records) {
      runtime?.forget(record);
    }
    if (!this.katakanaRuntime) {
      this.#stop();
      return;
    }
    this.#reprocessAll();
  }

  enableKatakana(runtime) {
    assertRuntime(runtime, "Katakana");
    this.katakanaRuntime = runtime;
    this.#ensureActive();
    this.#reprocessAll();
    this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
  }

  disableKatakana() {
    const runtime = this.katakanaRuntime;
    this.katakanaRuntime = null;
    for (const record of this.records) {
      runtime?.forget(record);
    }
    if (!this.kanjiRuntime) {
      this.#stop();
      return;
    }
    this.#reprocessAll();
  }

  refresh(record) {
    if (!this.active || this.hidden || !this.records.has(record)) {
      return;
    }
    this.#processRecord(record);
  }

  continuePending() {
    this.#scheduleNodeDrain();
  }

  stop() {
    this.kanjiRuntime = null;
    this.katakanaRuntime = null;
    this.#stop();
  }

  #ensureActive() {
    if (this.active) {
      return;
    }
    this.active = true;
    this.viewport = new ViewportScheduler({
      document: this.document,
      onReady: () => this.#scheduleNodeDrain(),
    });
    this.hidden = this.document.visibilityState === "hidden";
    this.document.addEventListener("visibilitychange", this.onVisibilityChange);
    if (this.MutationObserver) {
      this.mutationObserver = new this.MutationObserver((mutations) => this.#onMutations(mutations));
      this.mutationObserver.observe(this.document.body ?? this.document.documentElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    if (this.hidden) {
      this.kanjiRuntime?.pause();
      this.katakanaRuntime?.pause();
    }
  }

  #stop() {
    if (!this.active) {
      restoreConvertedKanaRuby(this.document);
      return;
    }
    this.active = false;
    this.document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.viewport?.stop();
    this.viewport = null;
    this.#cancelScheduledWork();
    this.pendingRoots.clear();
    this.scanJobs.length = 0;
    for (const record of this.records) {
      this.#restoreRecord(record);
    }
    this.records.clear();
    this.nodeRecords = new WeakMap();
    restoreConvertedKanaRuby(this.document);
  }

  #handleVisibilityChange() {
    if (!this.active) {
      return;
    }
    this.hidden = this.document.visibilityState === "hidden";
    if (this.hidden) {
      this.kanjiRuntime?.pause();
      this.katakanaRuntime?.pause();
      this.#cancelScheduledWork();
      return;
    }
    this.kanjiRuntime?.resume();
    this.katakanaRuntime?.resume();
    this.#discardDetachedRecords();
    this.#reprocessAll();
    this.#queueRoot(this.document.body ?? this.document.documentElement, { immediate: true });
  }

  #onMutations(mutations) {
    if (!this.active) {
      return;
    }
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const record = this.nodeRecords.get(mutation.target);
        if (record && this.#recordIsCurrent(record)) {
          continue;
        }
        if (record) {
          this.#discardRecord(record);
        }
        this.pendingRoots.add(mutation.target);
        continue;
      }
      if ([...mutation.removedNodes].some((node) => node.isConnected)) {
        // A moved cursor can still be inside its root but now lie after unvisited
        // siblings. Resume affected scans from the root in the new DOM order.
        for (const job of this.scanJobs) {
          if (job.root.contains(mutation.target)) {
            job.walker.currentNode = job.root;
            job.next = job.root;
          }
        }
      }
      for (const node of mutation.removedNodes) {
        this.#discardDetachedOwnership(node);
      }
      for (const node of mutation.addedNodes) {
        if (this.nodeRecords.has(node) && !this.viewport?.has(this.nodeRecords.get(node))) {
          continue;
        }
        if (
          node.nodeType === 1
          && node.closest?.("[data-yomi-ruby-generated], [data-yomi-ruby-converted-rt]")
        ) {
          continue;
        }
        this.pendingRoots.add(node);
      }
    }
    this.#scheduleFlush();
  }

  #queueRoot(root, { immediate = false } = {}) {
    if (!this.active || !root) {
      return;
    }
    this.pendingRoots.add(root);
    if (immediate && !this.hidden) {
      this.#flushRoots();
    } else {
      this.#scheduleFlush();
    }
  }

  #scheduleFlush() {
    if (!this.active || this.hidden || this.flushTimer != null || this.pendingRoots.size === 0) {
      return;
    }
    this.flushTimer = this.setTimer(() => {
      this.flushTimer = null;
      this.#flushRoots();
    }, this.flushDelayMs);
  }

  #flushRoots() {
    if (!this.active || this.hidden) {
      return;
    }
    const roots = this.pendingRoots;
    this.pendingRoots = new Set();
    for (const root of roots) {
      if (!root.isConnected) {
        continue;
      }
      let covered = false;
      for (let parent = root.parentNode; parent; parent = parent.parentNode) {
        if (roots.has(parent)) {
          covered = true;
          break;
        }
      }
      if (!covered) {
        this.#collectTextNodes(root);
      }
    }
    this.#scheduleNodeDrain();
  }

  #collectTextNodes(root) {
    if (!root?.isConnected || hasBlockedTextAncestor(root)) {
      return;
    }
    if (![1, 3, 9, 11].includes(root.nodeType)) {
      return;
    }
    const walker = this.document.createTreeWalker(
      root,
      this.document.defaultView.NodeFilter.SHOW_ELEMENT | this.document.defaultView.NodeFilter.SHOW_TEXT,
    );
    this.scanJobs.push({ root, walker, next: root });
  }

  #processTextNode(node) {
    const owned = this.nodeRecords.get(node);
    if (owned) {
      // A deferred source may have moved to a different parent while waiting.
      if (this.viewport?.has(owned)) {
        this.viewport.forget(owned);
        if (!this.viewport.defer(owned)) {
          this.#activateDeferred(owned);
        }
      }
      return;
    }
    const text = node.textContent;
    const candidate = (this.kanjiRuntime && /\p{Script=Han}/u.test(text))
      || (this.katakanaRuntime && findKatakanaMatches(text).length > 0);
    if (
      !node?.isConnected
      || !candidate
      || shouldSkipTextNode(node, this.scanStyleCache)
    ) {
      return;
    }
    const record = {
      text,
      originalText: text,
      currentNodes: [node],
      planKey: "[]",
      valid: true,
    };
    this.records.add(record);
    this.nodeRecords.set(node, record);
    if (!this.viewport?.defer(record)) {
      this.#processRecord(record);
    }
  }

  #scheduleNodeDrain() {
    if (!this.active || this.hidden || this.scanHandle != null || !this.#hasRunnableWork()) {
      return;
    }
    if (this.requestIdleCallback) {
      this.scanHandle = this.requestIdleCallback((deadline) => this.#drainNodes(deadline), {
        timeout: this.flushDelayMs,
      });
      return;
    }
    this.scanHandle = this.setTimer(() => this.#drainNodes({
      didTimeout: true,
      timeRemaining: () => 0,
    }), 0);
  }

  #drainNodes(deadline) {
    this.scanHandle = null;
    if (!this.active || this.hidden) {
      return;
    }
    let processed = 0;
    let backgroundProcessed = 0;
    let checkedJob = null;
    const startedAt = this.now();
    this.scanStyleCache = new WeakMap();
    while (
      this.#hasRunnableWork(backgroundProcessed > 0)
      && processed < this.scanBatchSize
      && backgroundProcessed < 32
      && (processed === 0 || this.now() - startedAt < this.scanBudgetMs)
      && (deadline.didTimeout || deadline.timeRemaining() > 1)
    ) {
      const ready = this.viewport?.takeReady();
      if (ready) {
        this.#activateDeferred(ready);
        processed += 1;
        continue;
      }
      if (this.scanJobs.length === 0) {
        const record = this.viewport?.takeBackground();
        if (record) {
          this.#activateDeferred(record);
          backgroundProcessed += 1;
        }
        processed += 1;
        continue;
      }
      const job = this.scanJobs[0];
      if (job !== checkedJob) {
        checkedJob = job;
        // A scan root may have moved under a code/form container during
        // the preceding yield. Recheck once per job per slice, not per node.
        if (hasBlockedTextAncestor(job.root)) {
          this.scanJobs.shift();
          processed += 1;
          continue;
        }
      }
      const node = job.next;
      if (!node || !job.root.isConnected) {
        this.scanJobs.shift();
        processed += 1;
        continue;
      }
      if (!job.root.contains(node)) {
        // A removed cursor must not strand its still-connected later siblings.
        // Restart this root; existing ownership suppresses duplicate analysis.
        job.walker.currentNode = job.root;
        job.next = job.root;
        processed += 1;
        continue;
      }
      // Advance before rendering can replace the current text node. If a page
      // removes the saved cursor between slices, restart its connected root.
      job.walker.currentNode = node;
      job.next = isPrunedTextContainer(node)
        ? nextOutsideSubtree(job.walker, job.root)
        : job.walker.nextNode();
      if (node.nodeType === 3) {
        this.#processTextNode(node);
      } else if (this.kanjiRuntime && node.nodeName === "RUBY") {
        if (convertExistingKanaRuby(node, { descendants: false })) {
          this.scanStyleCache = new WeakMap();
        }
      }
      processed += 1;
    }
    this.scanStyleCache = null;
    this.#scheduleNodeDrain();
  }

  #hasRunnableWork(continuingBackgroundBatch = false) {
    return this.scanJobs.length > 0 || this.viewport?.hasReady || (
      this.viewport?.hasDeferred && (continuingBackgroundBatch || (
        !this.kanjiRuntime?.hasPendingWork?.() && !this.katakanaRuntime?.hasPendingWork?.()
      ))
    );
  }

  #activateDeferred(record) {
    if (!this.#recordIsCurrent(record) || shouldSkipTextNode(record.currentNodes[0])) {
      this.#discardRecord(record);
      return;
    }
    this.#processRecord(record);
  }

  #processRecord(record) {
    if (!this.#recordIsCurrent(record)) {
      this.#discardRecord(record);
      return;
    }
    const katakanaPlan = this.katakanaRuntime?.plan(record) ?? {
      ranges: [], reservations: [],
    };
    const kanjiPlan = this.kanjiRuntime?.plan(record) ?? { ranges: [] };
    const annotations = [];
    for (const range of kanjiPlan.ranges) {
      if (!katakanaPlan.reservations.some((reserved) => overlaps(range, reserved))) {
        annotations.push({ ...range, feature: "kanji" });
      }
    }
    for (const range of katakanaPlan.ranges) {
      annotations.push({ ...range, feature: "katakana" });
    }
    annotations.sort((left, right) => left.start - right.start || left.end - right.end);
    this.#renderRecord(record, annotations);
  }

  #reprocessAll() {
    if (this.hidden) {
      return;
    }
    for (const record of [...this.records]) {
      if (!this.viewport?.has(record)) {
        this.#processRecord(record);
      }
    }
    this.#scheduleNodeDrain();
  }

  #renderRecord(record, annotations) {
    const planKey = JSON.stringify(annotations.map((range) => [
      range.start, range.end, range.feature, range.annotation, range.reading, range.romaji,
    ]));
    if (record.planKey === planKey) {
      return;
    }
    const parent = record.currentNodes[0]?.parentNode;
    if (!parent || record.currentNodes.some((node) => node.parentNode !== parent)) {
      this.#discardRecord(record);
      return;
    }
    const fragment = this.document.createDocumentFragment();
    let cursor = 0;
    for (const range of annotations) {
      if (range.start < cursor) {
        continue;
      }
      if (range.start > cursor) {
        fragment.append(this.document.createTextNode(record.originalText.slice(cursor, range.start)));
      }
      fragment.append(this.#createRuby(range));
      cursor = range.end;
    }
    if (cursor < record.originalText.length) {
      fragment.append(this.document.createTextNode(record.originalText.slice(cursor)));
    }
    if (!fragment.childNodes.length) {
      fragment.append(this.document.createTextNode(record.originalText));
    }
    const nextNodes = [...fragment.childNodes];
    this.scanStyleCache = new WeakMap();
    parent.insertBefore(fragment, record.currentNodes[0]);
    for (const node of record.currentNodes) {
      node.remove();
    }
    record.currentNodes = nextNodes;
    record.planKey = planKey;
    for (const node of nextNodes) {
      this.nodeRecords.set(node, record);
    }
  }

  #createRuby(range) {
    const ruby = this.document.createElement("ruby");
    ruby.className = range.feature === "kanji"
      ? "yomi-ruby-ruby"
      : "yomi-ruby-ruby yomi-ruby-katakana-ruby";
    ruby.setAttribute("data-yomi-ruby-generated", "");
    ruby.setAttribute("data-yomi-ruby-feature", range.feature);
    const base = this.document.createElement("span");
    base.className = "yomi-ruby-base";
    base.textContent = range.text;
    const rt = this.document.createElement("rt");
    rt.className = range.feature === "kanji"
      ? "yomi-ruby-rt"
      : "yomi-ruby-rt yomi-ruby-katakana-rt";
    if (range.feature === "kanji") {
      if (typeof range.reading === "string" && range.reading.length > 0) {
        ruby.setAttribute("data-yomi-ruby-kana", range.reading);
        ruby.tabIndex = 0;
      }
      rt.textContent = range.romaji;
    } else {
      rt.textContent = range.annotation;
    }
    ruby.append(base, rt);
    return ruby;
  }

  #restoreRecord(record) {
    if (!this.#recordIsCurrent(record)) {
      return;
    }
    if (record.planKey === "[]") {
      return;
    }
    const parent = record.currentNodes[0].parentNode;
    const text = this.document.createTextNode(record.originalText);
    parent.insertBefore(text, record.currentNodes[0]);
    for (const node of record.currentNodes) {
      node.remove();
    }
  }

  #discardRecord(record) {
    if (!this.records.has(record)) {
      return;
    }
    this.kanjiRuntime?.forget(record);
    this.katakanaRuntime?.forget(record);
    this.viewport?.forget(record);
    const parent = record.currentNodes[0]?.parentNode;
    if (
      parent
      && record.planKey !== "[]"
      && record.currentNodes.every((node) => node.parentNode === parent)
      && record.currentNodes.map(sourceText).join("") === record.originalText
    ) {
      const text = this.document.createTextNode(record.originalText);
      parent.insertBefore(text, record.currentNodes[0]);
      for (const node of record.currentNodes) {
        node.remove();
      }
    }
    for (const node of record.currentNodes) {
      this.nodeRecords.delete(node);
    }
    record.valid = false;
    this.records.delete(record);
  }

  #discardDetachedOwnership(root) {
    const found = new Set();
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      const record = this.nodeRecords.get(node);
      if (record) {
        found.add(record);
      }
      stack.push(...node.childNodes);
    }
    for (const record of found) {
      if (record.currentNodes.some((node) => !node.isConnected)) {
        this.#discardRecord(record);
      }
    }
  }

  #discardDetachedRecords() {
    for (const record of [...this.records]) {
      if (!this.#recordIsCurrent(record)) {
        this.#discardRecord(record);
      }
    }
  }

  #recordIsCurrent(record) {
    if (!record.valid || record.currentNodes.length === 0) {
      return false;
    }
    const parent = record.currentNodes[0].parentNode;
    return Boolean(
      parent
      && record.currentNodes.every((node) => node.isConnected && node.parentNode === parent)
      && record.currentNodes.map(sourceText).join("") === record.originalText,
    );
  }

  #cancelScheduledWork() {
    if (this.flushTimer != null) {
      this.clearTimer(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.scanHandle != null) {
      if (this.requestIdleCallback && this.cancelIdleCallback) {
        this.cancelIdleCallback(this.scanHandle);
      } else {
        this.clearTimer(this.scanHandle);
      }
      this.scanHandle = null;
    }
  }
}

function hasBlockedTextAncestor(node) {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (isPrunedTextContainer(parent)) {
      return true;
    }
  }
  return false;
}

function isPrunedTextContainer(node) {
  // Nested author ruby has independently convertible readings. Traverse RUBY
  // elements while retaining the existing text-node exclusion inside them.
  return isBlockedTextContainer(node) && node.nodeName !== "RUBY";
}

function nextOutsideSubtree(walker, root) {
  while (walker.currentNode !== root) {
    const sibling = walker.nextSibling();
    if (sibling) {
      return sibling;
    }
    if (!walker.parentNode()) {
      return null;
    }
  }
  return null;
}

function assertRuntime(runtime, label) {
  if (
    !runtime
    || typeof runtime.plan !== "function"
    || typeof runtime.forget !== "function"
    || typeof runtime.pause !== "function"
    || typeof runtime.resume !== "function"
  ) {
    throw new TypeError(`${label} annotation requires a runtime interface.`);
  }
}

function overlaps(left, right) {
  return left.start < right.end && right.start < left.end;
}

function sourceText(node) {
  if (node.nodeType === 3) {
    return node.textContent;
  }
  if (node.nodeType === 1 && node.hasAttribute("data-yomi-ruby-generated")) {
    return node.querySelector(":scope > .yomi-ruby-base")?.textContent ?? "";
  }
  return node.textContent ?? "";
}
