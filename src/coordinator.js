import {
  convertExistingKanaRuby,
  restoreConvertedKanaRuby,
  shouldSkipTextNode,
} from "./dom.js";
import { findKatakanaMatches } from "./katakana.js";

export class AnnotationCoordinator {
  constructor({
    document,
    IntersectionObserver = document.defaultView?.IntersectionObserver,
    MutationObserver = document.defaultView?.MutationObserver,
    requestIdleCallback = document.defaultView?.requestIdleCallback?.bind(document.defaultView),
    cancelIdleCallback = document.defaultView?.cancelIdleCallback?.bind(document.defaultView),
  }) {
    if (!document) {
      throw new TypeError("An AnnotationCoordinator requires a document.");
    }
    this.document = document;
    this.IntersectionObserver = IntersectionObserver;
    this.MutationObserver = MutationObserver;
    this.requestIdleCallback = requestIdleCallback;
    this.cancelIdleCallback = cancelIdleCallback;
    this.kanjiAnalyzer = null;
    this.katakanaTranslator = null;
    this.active = false;
    this.records = new Set();
    this.nodeRecords = new WeakMap();
    this.pendingNodes = new Set();
    this.waitingByElement = new Map();
    this.translationCache = new Map();
    this.translationQueue = new Set();
    this.translationActiveGeneration = null;
    this.katakanaGeneration = 0;
    this.katakanaAbortController = null;
    this.translationFlushScheduled = false;
    this.idleHandle = null;
    this.mutationObserver = null;
    this.intersectionObserver = null;
  }

  enableKanji(analyzeText) {
    if (typeof analyzeText !== "function") {
      throw new TypeError("enableKanji requires an analyzer function.");
    }
    this.kanjiAnalyzer = analyzeText;
    this.#ensureActive();
    convertExistingKanaRuby(this.document);
    for (const record of this.records) {
      this.#processRecord(record);
    }
  }

  disableKanji() {
    this.kanjiAnalyzer = null;
    restoreConvertedKanaRuby(this.document);
    if (!this.katakanaTranslator) {
      this.#stop();
      return;
    }
    for (const record of this.records) {
      this.#processRecord(record);
    }
  }

  enableKatakana(translatePhrases) {
    if (typeof translatePhrases !== "function") {
      throw new TypeError("enableKatakana requires a translation function.");
    }
    this.katakanaGeneration += 1;
    this.katakanaAbortController?.abort();
    this.katakanaAbortController = new AbortController();
    this.katakanaTranslator = translatePhrases;
    this.translationCache.clear();
    this.translationQueue.clear();
    this.#ensureActive();
    for (const record of this.records) {
      this.#processRecord(record);
    }
  }

  disableKatakana() {
    this.katakanaGeneration += 1;
    this.katakanaAbortController?.abort();
    this.katakanaAbortController = null;
    this.katakanaTranslator = null;
    this.translationCache.clear();
    this.translationQueue.clear();
    this.translationFlushScheduled = false;
    if (!this.kanjiAnalyzer) {
      this.#stop();
      return;
    }
    for (const record of this.records) {
      this.#processRecord(record);
    }
  }

  stop() {
    this.kanjiAnalyzer = null;
    this.katakanaTranslator = null;
    this.katakanaGeneration += 1;
    this.katakanaAbortController?.abort();
    this.katakanaAbortController = null;
    this.#stop();
  }

  #ensureActive() {
    if (this.active) {
      return;
    }
    this.active = true;
    if (this.IntersectionObserver) {
      this.intersectionObserver = new this.IntersectionObserver(
        (entries) => this.#onIntersections(entries),
        { root: null, rootMargin: "800px 0px", threshold: 0 },
      );
    }
    if (this.MutationObserver) {
      this.mutationObserver = new this.MutationObserver((records) => this.#onMutations(records));
      this.mutationObserver.observe(this.document.body ?? this.document.documentElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    this.#scan(this.document.body ?? this.document.documentElement);
  }

  #stop() {
    if (!this.active) {
      restoreConvertedKanaRuby(this.document);
      return;
    }
    this.active = false;
    this.mutationObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.mutationObserver = null;
    this.intersectionObserver = null;
    if (this.idleHandle != null && this.cancelIdleCallback) {
      this.cancelIdleCallback(this.idleHandle);
    }
    this.idleHandle = null;
    this.pendingNodes.clear();
    this.waitingByElement.clear();
    this.translationQueue.clear();
    for (const record of this.records) {
      this.#restoreRecord(record);
    }
    this.records.clear();
    this.translationCache.clear();
    restoreConvertedKanaRuby(this.document);
    this.document.normalize?.();
  }

  #scan(root) {
    if (!this.active || !root?.isConnected) {
      return;
    }
    if (root.nodeType === 3) {
      this.#waitForViewport(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) {
      return;
    }
    if (this.kanjiAnalyzer) {
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
      this.#waitForViewport(node);
    }
  }

  #waitForViewport(node) {
    if (!this.active || this.nodeRecords.has(node) || shouldSkipTextNode(node)) {
      return;
    }
    if (!this.intersectionObserver) {
      this.#enqueueNode(node);
      return;
    }
    const element = node.parentElement;
    let nodes = this.waitingByElement.get(element);
    if (!nodes) {
      nodes = new Set();
      this.waitingByElement.set(element, nodes);
      this.intersectionObserver.observe(element);
    }
    nodes.add(node);
  }

  #onIntersections(entries) {
    if (!this.active) {
      return;
    }
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }
      this.intersectionObserver.unobserve(entry.target);
      const nodes = this.waitingByElement.get(entry.target) ?? [];
      this.waitingByElement.delete(entry.target);
      for (const node of nodes) {
        this.#enqueueNode(node);
      }
    }
  }

  #onMutations(records) {
    if (!this.active) {
      return;
    }
    for (const mutation of records) {
      if (mutation.type === "characterData") {
        const record = this.nodeRecords.get(mutation.target);
        if (record) {
          record.valid = false;
          continue;
        }
        this.#scan(mutation.target);
        continue;
      }
      for (const node of mutation.removedNodes) {
        this.#discardDetachedOwnership(node);
      }
      this.#discardDetachedViewportWork();
      for (const node of mutation.addedNodes) {
        if (this.nodeRecords.has(node)) {
          continue;
        }
        if (node.nodeType === 1 && node.closest?.("[data-yomi-ruby-generated], [data-yomi-ruby-converted-rt]")) {
          continue;
        }
        this.#scan(node);
      }
    }
  }

  #discardDetachedOwnership(root) {
    const records = new Set();
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      const record = this.nodeRecords.get(node);
      if (record) {
        records.add(record);
      }
      stack.push(...node.childNodes);
    }
    for (const record of records) {
      if (record.currentNodes.some((node) => !node.isConnected)) {
        this.#discardRecord(record);
      }
    }
  }

  #discardDetachedViewportWork() {
    for (const node of this.pendingNodes) {
      if (!node.isConnected) {
        this.pendingNodes.delete(node);
      }
    }
    for (const [element] of this.waitingByElement) {
      if (!element.isConnected) {
        this.intersectionObserver?.unobserve(element);
        this.waitingByElement.delete(element);
      }
    }
  }

  #enqueueNode(node) {
    if (!this.active || !node.isConnected || this.nodeRecords.has(node) || shouldSkipTextNode(node)) {
      return;
    }
    this.pendingNodes.add(node);
    if (this.idleHandle != null) {
      return;
    }
    if (this.requestIdleCallback) {
      this.idleHandle = this.requestIdleCallback((deadline) => this.#drainNodes(deadline), { timeout: 500 });
    } else {
      this.#drainNodes({ didTimeout: true, timeRemaining: () => 0 });
    }
  }

  #drainNodes(deadline) {
    this.idleHandle = null;
    if (!this.active) {
      return;
    }
    while (this.pendingNodes.size && (deadline.didTimeout || deadline.timeRemaining() > 1)) {
      const node = this.pendingNodes.values().next().value;
      this.pendingNodes.delete(node);
      if (node.isConnected && !this.nodeRecords.has(node) && !shouldSkipTextNode(node)) {
        const record = {
          originalText: node.textContent,
          currentNodes: [node],
          planKey: null,
          valid: true,
        };
        this.records.add(record);
        this.nodeRecords.set(node, record);
        this.#processRecord(record);
      }
    }
    if (this.pendingNodes.size && this.requestIdleCallback) {
      this.idleHandle = this.requestIdleCallback((next) => this.#drainNodes(next), { timeout: 500 });
    }
  }

  #processRecord(record) {
    if (!this.#recordIsCurrent(record)) {
      record.valid = false;
      return;
    }
    const katakanaMatches = this.katakanaTranslator
      ? findKatakanaMatches(record.originalText)
      : [];
    if (this.katakanaTranslator) {
      this.#queueKatakana(record, katakanaMatches);
    }

    const blockedRanges = katakanaMatches.filter((match) => {
      const status = this.translationCache.get(match.text)?.status;
      return status === "pending" || status === "success";
    });
    const annotations = [];
    if (this.kanjiAnalyzer) {
      for (const range of annotationRanges(record.originalText, this.kanjiAnalyzer)) {
        if (!blockedRanges.some((blocked) => overlaps(range, blocked))) {
          annotations.push({ ...range, feature: "kanji" });
        }
      }
    }
    for (const match of katakanaMatches) {
      const cached = this.translationCache.get(match.text);
      if (cached?.status === "success") {
        annotations.push({
          ...match,
          feature: "katakana",
          annotation: cached.translation,
        });
      }
    }
    annotations.sort((left, right) => left.start - right.start || left.end - right.end);
    this.#renderRecord(record, annotations);
  }

  #queueKatakana(record, matches) {
    let queued = false;
    for (const match of matches) {
      let cached = this.translationCache.get(match.text);
      if (!cached) {
        cached = { status: "pending", waiters: new Set() };
        this.translationCache.set(match.text, cached);
        this.translationQueue.add(match.text);
        queued = true;
      }
      if (cached.status === "pending") {
        cached.waiters.add(record);
      }
    }
    if (queued) {
      this.#scheduleTranslationFlush();
    }
  }

  #scheduleTranslationFlush() {
    if (
      this.translationFlushScheduled
      || this.translationActiveGeneration === this.katakanaGeneration
    ) {
      return;
    }
    this.translationFlushScheduled = true;
    queueMicrotask(() => {
      this.translationFlushScheduled = false;
      void this.#flushTranslations();
    });
  }

  async #flushTranslations() {
    if (
      this.translationActiveGeneration === this.katakanaGeneration
      || !this.katakanaTranslator
      || this.translationQueue.size === 0
    ) {
      return;
    }
    const phrases = [...this.translationQueue];
    this.translationQueue.clear();
    const generation = this.katakanaGeneration;
    const translator = this.katakanaTranslator;
    const signal = this.katakanaAbortController?.signal;
    this.translationActiveGeneration = generation;
    let translations = new Map();
    try {
      translations = await translator(phrases, { signal });
    } catch {
      translations = new Map();
    } finally {
      if (this.translationActiveGeneration === generation) {
        this.translationActiveGeneration = null;
      }
    }
    if (generation !== this.katakanaGeneration || translator !== this.katakanaTranslator || signal?.aborted) {
      if (this.translationQueue.size) {
        this.#scheduleTranslationFlush();
      }
      return;
    }

    const affected = new Set();
    for (const phrase of phrases) {
      const cached = this.translationCache.get(phrase);
      if (!cached || cached.status !== "pending") {
        continue;
      }
      for (const record of cached.waiters) {
        affected.add(record);
      }
      const translation = translations instanceof Map ? translations.get(phrase) : undefined;
      this.translationCache.set(phrase, translation
        ? { status: "success", translation }
        : { status: "failure" });
    }
    for (const record of affected) {
      this.#processRecord(record);
    }
    if (this.translationQueue.size) {
      this.#scheduleTranslationFlush();
    }
  }

  #renderRecord(record, annotations) {
    const planKey = JSON.stringify(annotations.map(({ start, end, feature, annotation, reading, romaji }) => (
      [start, end, feature, annotation, reading, romaji]
    )));
    if (record.planKey === planKey) {
      return;
    }
    const parent = record.currentNodes[0]?.parentNode;
    if (!parent || record.currentNodes.some((node) => node.parentNode !== parent)) {
      record.valid = false;
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
    base.textContent = recordText(range);
    const rt = this.document.createElement("rt");
    rt.className = range.feature === "kanji"
      ? "yomi-ruby-rt"
      : "yomi-ruby-rt yomi-ruby-katakana-rt";
    if (range.feature === "kanji") {
      ruby.setAttribute("data-yomi-ruby-kana", range.reading);
      ruby.tabIndex = 0;
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
    for (const cached of this.translationCache.values()) {
      cached.waiters?.delete(record);
    }
    record.valid = false;
    this.records.delete(record);
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
}

function annotationRanges(text, analyzeText) {
  let segments;
  try {
    segments = analyzeText(text);
  } catch {
    return [];
  }
  if (!Array.isArray(segments)) {
    return [];
  }
  const ranges = [];
  let cursor = 0;
  for (const segment of segments) {
    const surface = segment?.type === "annotation" ? segment.surface : segment?.text;
    if (typeof surface !== "string" || text.slice(cursor, cursor + surface.length) !== surface) {
      return [];
    }
    if (segment.type === "annotation") {
      ranges.push({
        start: cursor,
        end: cursor + surface.length,
        text: surface,
        reading: segment.reading,
        romaji: segment.romaji,
      });
    }
    cursor += surface.length;
  }
  return cursor === text.length ? ranges : [];
}

function overlaps(left, right) {
  return left.start < right.end && right.start < left.end;
}

function recordText(range) {
  return range.text;
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
