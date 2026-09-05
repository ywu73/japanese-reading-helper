export class KanjiRuntime {
  constructor({ mode, analyzerFactories, onPlanChanged = () => {} }) {
    if (!analyzerFactories || typeof analyzerFactories[mode] !== "function") {
      throw new TypeError(`No kanji analyzer adapter is available for mode: ${mode}`);
    }
    this.mode = mode;
    this.analyzerFactories = analyzerFactories;
    this.onPlanChanged = onPlanChanged;
    this.active = false;
    this.paused = false;
    this.analyzer = null;
    this.generation = 0;
    this.abortController = null;
    this.cache = new Map();
    this.queue = [];
    this.processing = false;
    this.flushScheduled = false;
  }

  async enable() {
    if (this.active) {
      return;
    }
    const generation = ++this.generation;
    const abortController = new AbortController();
    this.abortController = abortController;
    this.#clearCycle();
    const analyzer = await this.analyzerFactories[this.mode]({ signal: abortController.signal });
    if (generation !== this.generation || abortController.signal.aborted) {
      return;
    }
    if (typeof analyzer !== "function") {
      throw new TypeError("The kanji analyzer adapter must be a function.");
    }
    this.analyzer = analyzer;
    this.active = true;
  }

  disable() {
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.active = false;
    this.analyzer = null;
    this.#clearCycle();
  }

  async setMode(mode) {
    if (typeof this.analyzerFactories[mode] !== "function") {
      throw new TypeError(`No kanji analyzer adapter is available for mode: ${mode}`);
    }
    if (mode === this.mode) {
      return;
    }
    const wasActive = this.active;
    this.disable();
    this.mode = mode;
    if (wasActive) {
      await this.enable();
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.#drain();
  }

  plan(record) {
    const text = record?.text;
    if (!this.active || typeof text !== "string" || text.length === 0) {
      return emptyPlan("inactive");
    }
    if (!/\p{Script=Han}/u.test(text)) {
      return emptyPlan("success");
    }
    let entry = this.cache.get(text);
    if (!entry) {
      entry = { status: "pending", ranges: [], waiters: new Set() };
      this.cache.set(text, entry);
      this.queue.push(text);
    }
    if (entry.status === "pending") {
      entry.waiters.add(record);
    }
    this.#drain();
    return { status: entry.status, ranges: entry.ranges };
  }

  forget(record) {
    for (const entry of this.cache.values()) {
      entry.waiters?.delete(record);
    }
  }

  stop() {
    this.disable();
  }

  #drain() {
    if (!this.active || this.paused || this.processing || this.queue.length === 0) {
      return;
    }
    if (typeof this.analyzer.analyzeBatch === "function") {
      this.#scheduleBatch();
      return;
    }
    const text = this.queue.shift();
    const entry = this.cache.get(text);
    if (!entry || entry.status !== "pending") {
      this.#drain();
      return;
    }
    const generation = this.generation;
    const analyzer = this.analyzer;
    const signal = this.abortController?.signal;
    let result;
    try {
      result = analyzer(text, { signal });
    } catch {
      this.#finish(text, entry, generation, []);
      return;
    }
    if (!result || typeof result.then !== "function") {
      this.#finish(text, entry, generation, annotationRanges(text, result));
      return;
    }
    this.processing = true;
    void Promise.resolve(result).then(
      (segments) => this.#finish(text, entry, generation, annotationRanges(text, segments)),
      () => this.#finish(text, entry, generation, []),
    );
  }

  #finish(text, entry, generation, ranges) {
    if (
      generation !== this.generation
      || !this.active
      || this.cache.get(text) !== entry
      || this.abortController?.signal.aborted
    ) {
      return;
    }
    this.#publish(entry, ranges);
    this.processing = false;
    this.#drain();
  }

  #scheduleBatch() {
    if (this.flushScheduled) {
      return;
    }
    this.flushScheduled = true;
    const generation = this.generation;
    queueMicrotask(() => {
      if (generation !== this.generation) {
        return;
      }
      this.flushScheduled = false;
      if (!this.active || this.paused || this.processing || this.queue.length === 0) {
        return;
      }
      // Bound source processing per operation; the provider still applies its
      // own word count and encoded payload limits after cross-node deduplication.
      const texts = this.queue.splice(0, 32);
      const entries = texts.map((text) => this.cache.get(text));
      const analyzer = this.analyzer;
      const signal = this.abortController.signal;
      this.processing = true;
      let result;
      try {
        result = analyzer.analyzeBatch(texts, { signal });
      } catch {
        this.#finishBatch(texts, entries, generation, []);
        return;
      }
      void Promise.resolve(result).then(
        (results) => this.#finishBatch(texts, entries, generation, results),
        () => this.#finishBatch(texts, entries, generation, []),
      );
    });
  }

  #finishBatch(texts, entries, generation, results) {
    if (generation !== this.generation || !this.active || this.abortController?.signal.aborted) {
      return;
    }
    for (let index = 0; index < texts.length; index += 1) {
      const text = texts[index];
      const entry = entries[index];
      if (this.cache.get(text) === entry) {
        this.#publish(entry, annotationRanges(text, results?.[index]));
      }
    }
    this.processing = false;
    this.#drain();
  }

  #publish(entry, ranges) {
    entry.status = ranges.length > 0 ? "success" : "failure";
    entry.ranges = ranges;
    const waiters = [...entry.waiters];
    entry.waiters.clear();
    for (const record of waiters) {
      this.onPlanChanged(record);
    }
  }

  #clearCycle() {
    this.cache.clear();
    this.queue.length = 0;
    this.processing = false;
    this.flushScheduled = false;
  }
}

function annotationRanges(text, segments) {
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
    if (
      segment.type === "annotation"
      && typeof segment.romaji === "string"
      && segment.romaji.length > 0
    ) {
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

function emptyPlan(status) {
  return { status, ranges: [] };
}
