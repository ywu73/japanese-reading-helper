const HAS_KANJI = /\p{Script=Han}/u;

export function createOnlineKanjiAnalyzer({
  romanizeWords,
  Segmenter = globalThis.Intl?.Segmenter,
}) {
  if (typeof romanizeWords !== "function") {
    throw new TypeError("An online kanji romanization function is required.");
  }
  if (typeof Segmenter !== "function") {
    throw new TypeError("Local Intl.Segmenter support is required for online kanji romaji.");
  }
  const segmenter = new Segmenter("ja", { granularity: "word" });
  const readingCache = new Map();
  const pendingReadings = new Map();
  const progressListeners = new Set();

  const analyze = async (text, options) => (await analyzeBatch([text], options))[0];
  analyze.analyzeBatch = analyzeBatch;
  return analyze;

  async function analyzeBatch(texts, { signal, onProgress } = {}) {
    // Segment each node independently: joining source text could change word
    // boundaries. Only the resulting exact words are shared across nodes.
    const prepared = texts.map(prepareText);
    const candidates = [...new Set(prepared.flatMap(({ candidates }) => candidates))];
    const notify = (changed) => {
      if (!signal?.aborted && onProgress && candidates.some((word) => changed.has(word))) {
        onProgress(prepared.map(({ text, entries }) => renderSegments(text, entries, readingCache)));
      }
    };
    let readings = new Map();
    if (candidates.length > 0) {
      progressListeners.add(notify);
      try {
        readings = await resolveReadings(candidates, signal);
      } catch (error) {
        if (error?.name === "AbortError") {
          throw error;
        }
      } finally {
        progressListeners.delete(notify);
      }
    }
    return prepared.map(({ text, entries }) => renderSegments(text, entries, readings));
  }

  function prepareText(text) {
    if (typeof text !== "string" || text.length === 0) {
      return { text: "", entries: [], candidates: [] };
    }
    if (!HAS_KANJI.test(text)) {
      return { text, entries: [], candidates: [] };
    }
    const entries = [...segmenter.segment(text)];
    if (!segmentsExactlyCoverText(text, entries)) {
      return { text, entries: [], candidates: [] };
    }
    const candidates = [...new Set(entries
      .filter(({ segment, isWordLike }) => isWordLike === true && HAS_KANJI.test(segment))
      .map(({ segment }) => segment))];
    return { text, entries, candidates };
  }

  function renderSegments(text, entries, readings) {
    if (!entries.length) {
      return text ? [{ type: "text", text }] : [];
    }
    const result = [];
    for (const { segment, isWordLike } of entries) {
      const romaji = isWordLike === true && HAS_KANJI.test(segment)
        ? readings.get(segment)
        : null;
      if (typeof romaji === "string" && romaji.length > 0) {
        result.push({ type: "annotation", surface: segment, romaji });
      } else {
        appendText(result, segment);
      }
    }
    return result;
  }

  async function resolveReadings(candidates, signal) {
    const missing = candidates.filter((word) => (
      !readingCache.has(word) && !pendingReadings.has(word)
    ));
    if (missing.length > 0) {
      const requested = new Set(missing);
      const operation = Promise.resolve().then(() => romanizeWords(missing, {
        signal,
        onBatch: ({ words, readings }) => {
          if (signal?.aborted || !Array.isArray(words) || !(readings instanceof Map)) return;
          const changed = new Set();
          for (const word of words) {
            if (!requested.has(word) || readingCache.has(word)) continue;
            const reading = readings.get(word);
            readingCache.set(word, typeof reading === "string" && reading.length > 0 ? reading : null);
            changed.add(word);
          }
          for (const listener of [...progressListeners]) listener(changed);
        },
      }));
      for (const word of missing) {
        let pending;
        pending = operation.then(
          (result) => result instanceof Map && typeof result.get(word) === "string"
            ? result.get(word)
            : null,
          (error) => {
            if (error?.name === "AbortError") {
              throw error;
            }
            return null;
          },
        ).then((reading) => {
          if (signal?.aborted) throw new DOMException("Kanji analysis aborted.", "AbortError");
          // Validated earlier batches survive a later transport failure.
          if (!readingCache.has(word)) readingCache.set(word, reading);
          return readingCache.get(word);
        }).finally(() => {
          if (pendingReadings.get(word) === pending) {
            pendingReadings.delete(word);
          }
        });
        pendingReadings.set(word, pending);
      }
    }

    const readings = new Map();
    await Promise.all(candidates.map(async (word) => {
      const reading = readingCache.has(word)
        ? readingCache.get(word)
        : await pendingReadings.get(word);
      if (typeof reading === "string" && reading.length > 0) {
        readings.set(word, reading);
      }
    }));
    return readings;
  }
}

function segmentsExactlyCoverText(text, entries) {
  let cursor = 0;
  for (const entry of entries) {
    if (
      typeof entry?.segment !== "string"
      || !Number.isInteger(entry.index)
      || entry.index !== cursor
      || text.slice(cursor, cursor + entry.segment.length) !== entry.segment
    ) {
      return false;
    }
    cursor += entry.segment.length;
  }
  return cursor === text.length;
}

function appendText(segments, text) {
  if (!text) {
    return;
  }
  const last = segments.at(-1);
  if (last?.type === "text") {
    last.text += text;
  } else {
    segments.push({ type: "text", text });
  }
}
