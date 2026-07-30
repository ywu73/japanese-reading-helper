const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const BATCH_SEPARATOR = "🧩";
const HAS_KANJI = /\p{Script=Han}/u;
const SAFE_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’-]+$/u;
const SAFE_BATCH_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’ -]+$/u;

export function createGoogleKanjiRomajiClient({
  gmRequest,
  maxPhrasesPerRequest = 50,
  maxEncodedUrlLength = 1800,
  minimumIntervalMs = 250,
  requestTimeoutMs = 8000,
  maxWordCharacters = 200,
  sleep = wait,
}) {
  if (typeof gmRequest !== "function") {
    throw new TypeError("A GM_xmlhttpRequest adapter is required for Google kanji romaji.");
  }
  if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
    throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
  }
  if (!Number.isInteger(maxEncodedUrlLength) || maxEncodedUrlLength < 1) {
    throw new TypeError("maxEncodedUrlLength must be a positive integer.");
  }

  let operationQueue = Promise.resolve();
  const romanizeWords = (words, { signal } = {}) => {
    const operation = operationQueue.then(async () => {
      throwIfAborted(signal);
      const uniqueWords = [...new Set(words.filter((word) => isEligibleWord(
        word,
        maxWordCharacters,
      )))];
      const readings = new Map();
      if (uniqueWords.length > 0) {
        let requestIndex = 0;
        const fetchUrl = async (requestedUrl) => {
          if (requestIndex > 0 && minimumIntervalMs > 0) {
            await sleep(minimumIntervalMs, { signal });
          }
          requestIndex += 1;
          const response = await request(gmRequest, {
            method: "GET",
            url: requestedUrl.href,
            timeout: requestTimeoutMs,
            anonymous: true,
            redirect: "error",
          }, { signal });
          validateResponseUrl(response.finalUrl ?? response.responseURL, requestedUrl);
          return response.responseText;
        };
        const batches = buildBatches(uniqueWords, {
          maxPhrasesPerRequest,
          maxEncodedUrlLength,
        });
        for (const batch of batches) {
          let batchReadings = null;
          if (batch.useFastPath) {
            const url = buildBatchUrl(batch.words);
            try {
              batchReadings = parseGoogleKanjiRomajiBatch(
                await fetchUrl(url),
                batch.words,
              );
            } catch (error) {
              if (error?.name === "AbortError") {
                throw error;
              }
              // The emoji protocol is an empirical fast path. Any transport or
              // final-URL failure deliberately falls through to exact words.
            }
          }
          // An empty Map can be a structurally valid batch whose individual
          // segments were all unsafe; only null selects the fallback path.
          if (batchReadings) {
            for (const [word, romaji] of batchReadings) {
              readings.set(word, romaji);
            }
          } else {
            for (const word of batch.words) {
              const responseText = await fetchUrl(buildSingleWordUrl(word));
              const romaji = parseGoogleKanjiRomaji(responseText, word);
              if (romaji) {
                readings.set(word, romaji);
              }
            }
          }
        }
      }
      return readings;
    });
    operationQueue = operation.catch(() => {});
    return operation;
  };

  return { romanizeWords };
}

function buildBatchUrl(words) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ja");
  url.searchParams.set("tl", "ja");
  url.searchParams.append("dt", "t");
  url.searchParams.append("dt", "rm");
  url.searchParams.set("q", words.join(BATCH_SEPARATOR));
  return url;
}

function buildSingleWordUrl(word) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ja");
  url.searchParams.set("tl", "en");
  url.searchParams.append("dt", "t");
  url.searchParams.append("dt", "rm");
  url.searchParams.set("q", word);
  return url;
}

function buildBatches(words, { maxPhrasesPerRequest, maxEncodedUrlLength }) {
  const batches = [];
  let batch = [];
  const flushBatch = () => {
    if (batch.length > 0) {
      batches.push({ words: batch, useFastPath: true });
      batch = [];
    }
  };
  for (const word of words) {
    if (buildBatchUrl([word]).href.length > maxEncodedUrlLength) {
      flushBatch();
      batches.push({ words: [word], useFastPath: false });
      continue;
    }
    const candidate = [...batch, word];
    if (
      batch.length > 0
      && (
        candidate.length > maxPhrasesPerRequest
        || buildBatchUrl(candidate).href.length > maxEncodedUrlLength
      )
    ) {
      flushBatch();
    }
    batch.push(word);
  }
  flushBatch();
  return batches;
}

function parseGoogleKanjiRomajiBatch(responseText, words) {
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    return null;
  }
  if (!Array.isArray(payload) || !Array.isArray(payload[0]) || payload[2] !== "ja") {
    return null;
  }
  const sourceCandidates = [];
  const romajiCandidates = [];
  for (const item of payload[0]) {
    if (!Array.isArray(item)) {
      return null;
    }
    if (typeof item[1] === "string") {
      sourceCandidates.push(item[1]);
    }
    if (typeof item[2] === "string") {
      romajiCandidates.push(item[2]);
    }
  }
  const joinedSource = words.join(BATCH_SEPARATOR);
  if (
    sourceCandidates.length !== 1
    || sourceCandidates[0] !== joinedSource
    || romajiCandidates.length !== 1
  ) {
    return null;
  }
  const segments = romajiCandidates[0].split(BATCH_SEPARATOR).map((segment) => segment.trim());
  // Positional mapping is safe only while the separator count stays exact.
  if (segments.length !== words.length) {
    return null;
  }
  const readings = new Map();
  for (let index = 0; index < words.length; index += 1) {
    const romaji = segments[index];
    if (isSafeBatchRomaji(romaji)) {
      readings.set(words[index], romaji);
    }
  }
  return readings;
}

function parseGoogleKanjiRomaji(responseText, word) {
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    return null;
  }
  if (!Array.isArray(payload) || !Array.isArray(payload[0]) || payload[2] !== "ja") {
    return null;
  }
  const sourceFragments = [];
  const romajiCandidates = [];
  for (const item of payload[0]) {
    if (!Array.isArray(item)) {
      return null;
    }
    if (typeof item[0] === "string" && typeof item[1] === "string") {
      sourceFragments.push(item[1]);
    }
    if (typeof item[3] === "string") {
      romajiCandidates.push(item[3]);
    }
  }
  if (sourceFragments.join("") !== word || romajiCandidates.length !== 1) {
    return null;
  }
  const romaji = romajiCandidates[0];
  return isSafeRomaji(romaji) ? romaji : null;
}

function isSafeRomaji(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 1000
    && value === value.trim()
    && SAFE_ROMAJI.test(value);
}

function isSafeBatchRomaji(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 1000
    && value === value.trim()
    && !value.includes(BATCH_SEPARATOR)
    && SAFE_BATCH_ROMAJI.test(value);
}

function isEligibleWord(word, maxWordCharacters) {
  return typeof word === "string"
    && word.length > 0
    && word.length <= maxWordCharacters
    && word === word.trim()
    && !/[\r\n\u0000-\u001f\u007f]/u.test(word)
    && !word.includes(BATCH_SEPARATOR)
    && HAS_KANJI.test(word);
}

function validateResponseUrl(value, requestedUrl) {
  let finalUrl;
  try {
    finalUrl = new URL(value);
  } catch {
    throw new Error("Google kanji romaji returned no valid final URL.");
  }
  if (finalUrl.href !== requestedUrl.href) {
    throw new Error("Google kanji romaji redirected away from the approved request URL.");
  }
}

function request(gmRequest, options, { signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    let settled = false;
    let handle;
    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      callback(value);
    };
    const onAbort = () => {
      handle?.abort?.();
      finish(reject, abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    handle = gmRequest({
      ...options,
      onload(response) {
        if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
          const status = Number.isInteger(response?.status) ? response.status : "unknown";
          finish(reject, new Error(`Google kanji romaji returned HTTP ${status}.`));
          return;
        }
        finish(resolve, response ?? {});
      },
      onerror(response) {
        finish(reject, new Error(response?.statusText || "Google kanji romaji request failed."));
      },
      ontimeout() {
        finish(reject, new Error("Google kanji romaji request timed out."));
      },
      onabort() {
        finish(reject, abortError());
      },
    });
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw abortError();
  }
}

function abortError() {
  return new DOMException("Google kanji romaji was aborted.", "AbortError");
}

function wait(milliseconds, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(finish, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    function finish() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
