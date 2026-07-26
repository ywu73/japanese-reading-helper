import {
  annotateTextNode,
  convertExistingKanaRuby,
  restoreAll,
  shouldSkipTextNode,
} from "./dom.js";

export class PageAnnotator {
  constructor({
    document,
    analyzeText,
    IntersectionObserver = document.defaultView?.IntersectionObserver,
    MutationObserver = document.defaultView?.MutationObserver,
    requestIdleCallback = document.defaultView?.requestIdleCallback?.bind(document.defaultView),
    cancelIdleCallback = document.defaultView?.cancelIdleCallback?.bind(document.defaultView),
  }) {
    this.document = document;
    this.analyzeText = analyzeText;
    this.IntersectionObserver = IntersectionObserver;
    this.MutationObserver = MutationObserver;
    this.requestIdleCallback = requestIdleCallback;
    this.cancelIdleCallback = cancelIdleCallback;
    this.active = false;
    this.pending = new Set();
    this.waitingByElement = new Map();
    this.idleHandle = null;
    this.mutationObserver = null;
    this.intersectionObserver = null;
  }

  start() {
    if (this.active) {
      return;
    }
    this.active = true;
    convertExistingKanaRuby(this.document);

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
    this.scan(this.document.body ?? this.document.documentElement);
  }

  stop() {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.mutationObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    if (this.idleHandle != null && this.cancelIdleCallback) {
      this.cancelIdleCallback(this.idleHandle);
    }
    this.idleHandle = null;
    this.pending.clear();
    this.waitingByElement.clear();
    restoreAll(this.document);
  }

  scan(root) {
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
    convertExistingKanaRuby(root);
    const walker = this.document.createTreeWalker(
      root,
      this.document.defaultView.NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => shouldSkipTextNode(node)
        ? this.document.defaultView.NodeFilter.FILTER_REJECT
        : this.document.defaultView.NodeFilter.FILTER_ACCEPT },
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      this.#waitForViewport(node);
    }
  }

  #waitForViewport(node) {
    if (!this.active || shouldSkipTextNode(node)) {
      return;
    }
    if (!this.intersectionObserver) {
      this.#enqueue(node);
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
        this.#enqueue(node);
      }
    }
  }

  #onMutations(records) {
    if (!this.active) {
      return;
    }
    for (const record of records) {
      if (record.type === "characterData") {
        this.scan(record.target);
      } else {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.closest?.("[data-yomi-ruby-generated], [data-yomi-ruby-converted-rt]")) {
            continue;
          }
          this.scan(node);
        }
      }
    }
  }

  #enqueue(node) {
    if (!this.active || !node.isConnected || shouldSkipTextNode(node)) {
      return;
    }
    this.pending.add(node);
    if (this.idleHandle != null) {
      return;
    }
    if (this.requestIdleCallback) {
      this.idleHandle = this.requestIdleCallback((deadline) => this.#drain(deadline), { timeout: 500 });
    } else {
      this.#drain({ didTimeout: true, timeRemaining: () => 0 });
    }
  }

  #drain(deadline) {
    this.idleHandle = null;
    if (!this.active) {
      return;
    }
    while (this.pending.size && (deadline.didTimeout || deadline.timeRemaining() > 1)) {
      const node = this.pending.values().next().value;
      this.pending.delete(node);
      if (node.isConnected && !shouldSkipTextNode(node)) {
        annotateTextNode(node, this.analyzeText(node.textContent));
      }
    }
    if (this.pending.size) {
      if (this.requestIdleCallback) {
        this.idleHandle = this.requestIdleCallback((nextDeadline) => this.#drain(nextDeadline), { timeout: 500 });
      } else {
        this.#drain({ didTimeout: true, timeRemaining: () => 0 });
      }
    }
  }
}
