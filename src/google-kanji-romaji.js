const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const HAS_KANJI = /\p{Script=Han}/u;
const SAFE_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’-]+$/u;

export function createGoogleKanjiRomajiClient({
  gmRequest,
  minimumIntervalMs = 250,
  requestTimeoutMs = 8000,
  maxWordCharacters = 200,
  sleep = wait,
}) {
  if (typeof gmRequest !== "function") {
    throw new TypeError("A GM_xmlhttpRequest adapter is required for Google kanji romaji.");
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
      for (let index = 0; index < uniqueWords.length; index += 1) {
        if (index > 0 && minimumIntervalMs > 0) {
          await sleep(minimumIntervalMs, { signal });
        }
        const word = uniqueWords[index];
        const url = buildUrl(word);
        const response = await request(gmRequest, {
          method: "GET",
          url: url.href,
          timeout: requestTimeoutMs,
          anonymous: true,
          redirect: "error",
        }, { signal });
        validateResponseUrl(response.finalUrl ?? response.responseURL, url);
        const romaji = parseGoogleKanjiRomaji(response.responseText, word);
        if (romaji) {
          readings.set(word, romaji);
        }
      }
      return readings;
    });
    operationQueue = operation.catch(() => {});
    return operation;
  };

  return { romanizeWords };
}

function buildUrl(word) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ja");
  url.searchParams.set("tl", "en");
  url.searchParams.append("dt", "t");
  url.searchParams.append("dt", "rm");
  url.searchParams.set("q", word);
  return url;
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

function isEligibleWord(word, maxWordCharacters) {
  return typeof word === "string"
    && word.length > 0
    && word.length <= maxWordCharacters
    && word === word.trim()
    && !/[\r\n\u0000-\u001f\u007f]/u.test(word)
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
