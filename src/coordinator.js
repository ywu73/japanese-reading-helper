import {
  convertExistingKanaRuby,
  restoreConvertedKanaRuby,
  shouldSkipTextNode,
} from "./dom.js";

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
    this.kanjiRuntime = null;
    this.katakanaRuntime = null;
    this.active = false;
    this.hidden = document.visibilityState === "hidden";
    this.records = new Set();
    this.nodeRecords = new WeakMap();
    this.pendingRoots = new Set();
    this.pendingNodes = [];
    this.pendingNodeSet = new Set();
    this.flushTimer = null;
    this.scanHandle = null;
    this.mutationObserver = null;
    this.onVisibilityChange = () => this.#handleVisibilityChange();
  }

  enableKanji(runtime) {
    assertRuntime(runtime, "Kanji");
    this.kanjiRuntime = runtime;
    this.#ensureActive();
    convertExistingKanaRuby(this.document);
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
    this.#cancelScheduledWork();
    this.pendingRoots.clear();
    this.pendingNodes.length = 0;
    this.pendingNodeSet.clear();
    for (const record of this.records) {
      this.#restoreRecord(record);
    }
    this.records.clear();
    restoreConvertedKanaRuby(this.document);
    this.document.normalize?.();
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
      for (const node of mutation.removedNodes) {
        this.#discardDetachedOwnership(node);
      }
      for (const node of mutation.addedNodes) {
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
    if (!this.active || this.hidden || this.flushTimer != null) {
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
    const roots = [...this.pendingRoots];
    this.pendingRoots.clear();
    for (const root of roots) {
      this.#collectTextNodes(root);
    }
    this.#scheduleNodeDrain();
  }

  #collectTextNodes(root) {
    if (!root?.isConnected) {
      return;
    }
    if (root.nodeType === 3) {
      this.#enqueueTextNode(root);
      return;
    }
    if (![1, 9, 11].includes(root.nodeType)) {
      return;
    }
    if (this.kanjiRuntime) {
      convertExistingKanaRuby(root);
    }
    const walker = this.document.createTreeWalker(
      root,
      this.document.defaultView.NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => shouldSkipTextNode(node) || this.nodeRecords.has(node)
        ? this.document.defaultView.NodeFilter.FILTER_REJECT
        : this.document.defaultView.NodeFilter.FILTER_ACCEPT },
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      this.#enqueueTextNode(node);
    }
  }

  #enqueueTextNode(node) {
    if (
      !node?.isConnected
      || this.nodeRecords.has(node)
      || this.pendingNodeSet.has(node)
      || shouldSkipTextNode(node)
    ) {
      return;
    }
    this.pendingNodeSet.add(node);
    this.pendingNodes.push(node);
  }

  #scheduleNodeDrain() {
    if (!this.active || this.hidden || this.scanHandle != null || this.pendingNodes.length === 0) {
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
    while (
      this.pendingNodes.length > 0
      && processed < this.scanBatchSize
      && (deadline.didTimeout || deadline.timeRemaining() > 1)
    ) {
      const node = this.pendingNodes.shift();
      this.pendingNodeSet.delete(node);
      if (node.isConnected && !this.nodeRecords.has(node) && !shouldSkipTextNode(node)) {
        const record = {
          text: node.textContent,
          originalText: node.textContent,
          currentNodes: [node],
          planKey: null,
          valid: true,
        };
        this.records.add(record);
        this.nodeRecords.set(node, record);
        this.#processRecord(record);
      }
      processed += 1;
    }
    this.#scheduleNodeDrain();
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
      this.#processRecord(record);
    }
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
    const parent = record.currentNodes[0]?.parentNode;
    if (
      parent
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
