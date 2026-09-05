import { findKatakanaMatches } from "./katakana.js";

export class KatakanaRuntime {
  constructor({ provider, translatorFactories, onPlanChanged = () => {}, onIdle = () => {} }) {
    if (!translatorFactories || typeof translatorFactories[provider] !== "function") {
      throw new TypeError(`No katakana translation adapter is available for provider: ${provider}`);
    }
    this.provider = provider;
    this.translatorFactories = translatorFactories;
    this.onPlanChanged = onPlanChanged;
    this.onIdle = onIdle;
    this.active = false;
    this.paused = false;
    this.translator = null;
    this.generation = 0;
    this.abortController = null;
    this.cache = new Map();
    this.queue = [];
    this.flushScheduled = false;
    this.processing = false;
  }

  async enable() {
    if (this.active) {
      return;
    }
    const generation = ++this.generation;
    const abortController = new AbortController();
    this.abortController = abortController;
    this.#clearCycle();
    const translator = await this.translatorFactories[this.provider]();
    if (generation !== this.generation || abortController.signal.aborted) {
      return;
    }
    if (typeof translator !== "function") {
      throw new TypeError("The katakana translation adapter must be a function.");
    }
    this.translator = translator;
    this.active = true;
  }

  disable() {
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.active = false;
    this.translator = null;
    this.#clearCycle();
  }

  async setProvider(provider) {
    if (typeof this.translatorFactories[provider] !== "function") {
      throw new TypeError(`No katakana translation adapter is available for provider: ${provider}`);
    }
    if (provider === this.provider) {
      return;
    }
    const wasActive = this.active;
    this.disable();
    this.provider = provider;
    if (wasActive) {
      await this.enable();
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.#scheduleFlush();
  }

  plan(record) {
    const text = record?.text;
    if (!this.active || typeof text !== "string" || text.length === 0) {
      return { status: "inactive", ranges: [], reservations: [] };
    }
    const matches = findKatakanaMatches(text);
    let added = false;
    for (const match of matches) {
      let entry = this.cache.get(match.text);
      if (!entry) {
        entry = { status: "pending", translation: null, waiters: new Set() };
        this.cache.set(match.text, entry);
        this.queue.push(match.text);
        added = true;
      }
      if (entry.status === "pending") {
        entry.waiters.add(record);
      }
    }
    if (added) {
      this.#scheduleFlush();
    }
    const ranges = [];
    const reservations = [];
    for (const match of matches) {
      const entry = this.cache.get(match.text);
      if (entry?.status === "success") {
        ranges.push({ ...match, annotation: entry.translation });
        reservations.push(match);
      } else if (entry?.status === "pending") {
        reservations.push(match);
      }
    }
    const status = reservations.some((match) => this.cache.get(match.text)?.status === "pending")
      ? "pending"
      : ranges.length > 0
        ? "success"
        : matches.length > 0
          ? "failure"
          : "success";
    return { status, ranges, reservations };
  }

  forget(record) {
    for (const entry of this.cache.values()) {
      entry.waiters?.delete(record);
    }
  }

  hasPendingWork() {
    return this.processing || this.flushScheduled || this.queue.length > 0;
  }

  stop() {
    this.disable();
  }

  #scheduleFlush() {
    if (
      !this.active
      || this.paused
      || this.processing
      || this.flushScheduled
      || this.queue.length === 0
    ) {
      return;
    }
    this.flushScheduled = true;
    const generation = this.generation;
    queueMicrotask(() => {
      if (generation !== this.generation) {
        return;
      }
      this.flushScheduled = false;
      this.#flush();
    });
  }

  #flush() {
    if (!this.active || this.paused || this.processing || this.queue.length === 0) {
      return;
    }
    const phrases = this.queue.splice(0);
    const generation = this.generation;
    const translator = this.translator;
    const signal = this.abortController?.signal;
    const requested = new Set(phrases);
    this.processing = true;
    let result;
    try {
      result = translator(phrases, {
        signal,
        onBatch: ({ phrases: batch, translations }) => {
          if (generation === this.generation && this.active && !signal.aborted) {
            this.#settle(batch.filter((phrase) => requested.has(phrase)), translations);
          }
        },
      });
    } catch {
      this.#finish(phrases, generation, new Map());
      return;
    }
    void Promise.resolve(result).then(
      (translations) => this.#finish(phrases, generation, translations),
      () => this.#finish(phrases, generation, new Map()),
    );
  }

  #finish(phrases, generation, translations) {
    if (generation !== this.generation || !this.active || this.abortController?.signal.aborted) {
      return;
    }
    // Already published batches remain successful if a later request fails.
    this.#settle(phrases, translations);
    this.processing = false;
    this.#scheduleFlush();
    if (!this.hasPendingWork()) {
      this.onIdle();
    }
  }

  #settle(phrases, translations) {
    const affected = new Set();
    for (const phrase of phrases) {
      const entry = this.cache.get(phrase);
      if (!entry || entry.status !== "pending") {
        continue;
      }
      const translation = translations instanceof Map ? translations.get(phrase) : null;
      entry.status = typeof translation === "string" && translation.length > 0
        ? "success"
        : "failure";
      entry.translation = entry.status === "success" ? translation : null;
      for (const record of entry.waiters) {
        affected.add(record);
      }
      entry.waiters.clear();
    }
    for (const record of affected) {
      this.onPlanChanged(record);
    }
  }

  #clearCycle() {
    this.cache.clear();
    this.queue.length = 0;
    this.flushScheduled = false;
    this.processing = false;
  }
}
