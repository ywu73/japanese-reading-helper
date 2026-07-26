const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const LATIN_LETTER = /\p{Script=Latin}/u;

export function createGoogleTranslationClient({
  gmRequest,
  maxPhrasesPerRequest = 50,
  maxEncodedUrlLength = 1800,
  minimumIntervalMs = 250,
  requestTimeoutMs = 8000,
  sleep = wait,
}) {
  if (typeof gmRequest !== "function") {
    throw new TypeError("A GM_xmlhttpRequest adapter is required for katakana translation.");
  }

  return {
    async translatePhrases(phrases, { signal } = {}) {
      const uniquePhrases = [...new Set(phrases.filter((phrase) => typeof phrase === "string" && phrase))];
      if (uniquePhrases.length === 0) {
        return new Map();
      }
      const translations = new Map();
      const batches = buildBatches(uniquePhrases, {
        maxPhrasesPerRequest,
        maxEncodedUrlLength,
      });
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        if (batchIndex > 0 && minimumIntervalMs > 0) {
          await sleep(minimumIntervalMs, { signal });
        }
        const batch = batches[batchIndex];
        const responseText = await requestTranslation(gmRequest, buildUrl(batch), {
          signal,
          timeout: requestTimeoutMs,
        });
        for (const [original, translated] of parseTranslations(responseText, batch)) {
          translations.set(original, translated);
        }
      }
      return translations;
    },
  };
}

export const createKatakanaTranslationClient = createGoogleTranslationClient;

function buildBatches(phrases, { maxPhrasesPerRequest, maxEncodedUrlLength }) {
  if (!Number.isInteger(maxPhrasesPerRequest) || maxPhrasesPerRequest < 1) {
    throw new TypeError("maxPhrasesPerRequest must be a positive integer.");
  }
  if (!Number.isInteger(maxEncodedUrlLength) || maxEncodedUrlLength < 1) {
    throw new TypeError("maxEncodedUrlLength must be a positive integer.");
  }

  const batches = [];
  let batch = [];
  for (const phrase of phrases) {
    const candidate = [...batch, phrase];
    if (
      batch.length > 0
      && (candidate.length > maxPhrasesPerRequest || buildUrl(candidate).length > maxEncodedUrlLength)
    ) {
      batches.push(batch);
      batch = [];
    }
    if (buildUrl([phrase]).length > maxEncodedUrlLength) {
      continue;
    }
    batch.push(phrase);
  }
  if (batch.length > 0) {
    batches.push(batch);
  }
  return batches;
}

function buildUrl(phrases) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("dt", "t");
  url.searchParams.set("sl", "ja");
  url.searchParams.set("tl", "en");
  url.searchParams.set("q", phrases.join("\n"));
  return url.href;
}

function requestTranslation(gmRequest, url, { signal, timeout }) {
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
      method: "GET",
      url,
      timeout,
      anonymous: true,
      onload(response) {
        if (response?.status && (response.status < 200 || response.status >= 300)) {
          finish(reject, new Error(`Google Translate returned HTTP ${response.status}.`));
          return;
        }
        finish(resolve, response?.responseText ?? "");
      },
      onerror(response) {
        finish(reject, new Error(response?.statusText || "Google Translate request failed."));
      },
      ontimeout() {
        finish(reject, new Error("Google Translate request timed out."));
      },
      onabort() {
        finish(reject, abortError());
      },
    });
  });
}

function parseTranslations(responseText, requestedPhrases) {
  const payload = JSON.parse(responseText);
  if (!Array.isArray(payload?.[0])) {
    return new Map();
  }

  const requested = new Set(requestedPhrases);
  const translations = new Map();
  const ambiguous = new Set();
  const seen = new Set();
  for (const item of payload[0]) {
    const translated = typeof item?.[0] === "string" ? item[0].trim() : "";
    const original = typeof item?.[1] === "string" ? item[1].trim() : "";
    if (!requested.has(original)) {
      continue;
    }
    if (seen.has(original)) {
      translations.delete(original);
      ambiguous.add(original);
      continue;
    }
    seen.add(original);
    if (
      !ambiguous.has(original)
      && translated
      && translated !== original
      && LATIN_LETTER.test(translated)
    ) {
      translations.set(original, translated);
    }
  }
  return translations;
}

function abortError() {
  return new DOMException("The katakana translation was aborted.", "AbortError");
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
