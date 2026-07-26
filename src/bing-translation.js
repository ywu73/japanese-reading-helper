import { findKatakanaMatches } from "./katakana.js";

const INITIAL_URL = "https://www.bing.com/translator";
const ALLOWED_HOSTS = new Set(["www.bing.com", "cn.bing.com"]);
const LATIN_LETTER = /\p{Script=Latin}/u;

export function createBingTranslationClient({
  gmRequest,
  DOMParser = globalThis.DOMParser,
  now = Date.now,
  sleep = wait,
  minimumIntervalMs = 1000,
  requestTimeoutMs = 8000,
  refreshSkewMs = 60_000,
  maxPhraseCharacters = 200,
}) {
  if (typeof gmRequest !== "function") {
    throw new TypeError("A GM_xmlhttpRequest adapter is required for Bing translation.");
  }
  if (typeof DOMParser !== "function") {
    throw new TypeError("A DOMParser is required for Bing translator initialization.");
  }

  let config = null;
  let configPromise = null;
  let operationQueue = Promise.resolve();
  let requestSequence = 0;
  let lastTranslationStartedAt = null;

  const translatePhrases = (phrases, { signal } = {}) => {
    const operation = operationQueue.then(async () => {
      throwIfAborted(signal);
      const uniquePhrases = [...new Set(phrases.filter((phrase) => isEligiblePhrase(
        phrase,
        maxPhraseCharacters,
      )))];
      const translations = new Map();
      for (const phrase of uniquePhrases) {
        const translated = await translatePhrase(phrase, signal);
        translations.set(phrase, translated);
      }
      return translations;
    });
    operationQueue = operation.catch(() => {});
    return operation;
  };

  async function getConfig(signal) {
    if (config && now() < config.expiresAt - config.refreshSkew) {
      return config;
    }
    if (!configPromise) {
      configPromise = loadConfig(signal).then((loaded) => {
        config = loaded;
        return loaded;
      }).finally(() => {
        configPromise = null;
      });
    }
    return configPromise;
  }

  async function loadConfig(signal) {
    const response = await request(gmRequest, {
      method: "GET",
      url: INITIAL_URL,
      timeout: requestTimeoutMs,
      anonymous: true,
      redirect: "follow",
    }, { signal, label: "Bing translator initialization" });
    const finalUrl = validateTranslatorUrl(response.finalUrl ?? response.responseURL);
    const parsed = parseConfig(response.responseText, DOMParser);
    const refreshSkew = Math.min(refreshSkewMs, Math.floor(parsed.expiryIntervalMs / 10));
    return {
      ...parsed,
      origin: finalUrl.origin,
      pageUrl: finalUrl.href,
      expiresAt: now() + parsed.expiryIntervalMs,
      refreshSkew,
    };
  }

  async function waitForTrafficSlot(signal) {
    if (lastTranslationStartedAt == null || minimumIntervalMs <= 0) {
      return;
    }
    const remaining = minimumIntervalMs - (now() - lastTranslationStartedAt);
    if (remaining > 0) {
      await sleep(remaining, { signal });
    }
  }

  async function translatePhrase(phrase, signal) {
    let activeConfig = await getConfig(signal);
    await waitForTrafficSlot(signal);
    try {
      return await requestPhrase(activeConfig, phrase, signal);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401 || signal?.aborted) {
        throw error;
      }
      config = null;
      activeConfig = await getConfig(signal);
      await waitForTrafficSlot(signal);
      try {
        return await requestPhrase(activeConfig, phrase, signal);
      } catch (retryError) {
        if (retryError instanceof HttpError && retryError.status === 401) {
          config = null;
        }
        throw retryError;
      }
    }
  }

  async function requestPhrase(activeConfig, phrase, signal) {
    throwIfAborted(signal);
    lastTranslationStartedAt = now();
    const url = new URL("/ttranslatev3", activeConfig.origin);
    url.searchParams.set("isVertical", "1");
    url.searchParams.set("IG", activeConfig.ig);
    url.searchParams.set("IID", activeConfig.iid);
    url.searchParams.set("SFX", String(++requestSequence));
    url.searchParams.set("ref", "TThis");
    url.searchParams.set("edgepdftranslator", "1");
    const data = new URLSearchParams({
      fromLang: "ja",
      to: "en",
      text: phrase,
      token: activeConfig.token,
      key: String(activeConfig.key),
      tryFetchingGenderDebiasedTranslations: "true",
    });
    const response = await request(gmRequest, {
      method: "POST",
      url: url.href,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: activeConfig.pageUrl,
      },
      data: data.toString(),
      timeout: requestTimeoutMs,
      anonymous: true,
      redirect: "error",
    }, { signal, label: "Bing translation" });
    validateTranslationResponseUrl(response.finalUrl ?? response.responseURL, url);
    return parseTranslation(response.responseText, phrase);
  }

  return { translatePhrases };
}

function validateTranslatorUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Bing translator initialization returned no valid final URL.");
  }
  if (
    url.protocol !== "https:"
    || !ALLOWED_HOSTS.has(url.hostname)
    || (url.pathname !== "/translator" && url.pathname !== "/translator/")
    || url.username
    || url.password
    || url.port
  ) {
    throw new Error("Bing translator initialization redirected outside the approved hosts or path.");
  }
  url.hash = "";
  url.search = "";
  return url;
}

function parseConfig(html, DOMParser) {
  if (typeof html !== "string" || html.length === 0 || html.length > 2_000_000) {
    throw new Error("Bing translator initialization returned invalid HTML.");
  }
  const document = new DOMParser().parseFromString(html, "text/html");
  const richContainers = document.querySelectorAll("#rich_tta[data-iid]");
  if (richContainers.length !== 1) {
    throw new Error("Bing translator initialization returned an ambiguous translation container.");
  }
  const iid = richContainers[0].getAttribute("data-iid")?.trim() ?? "";
  if (!/^translator\.\d{1,12}$/u.test(iid)) {
    throw new Error("Bing translator initialization returned an invalid IID.");
  }

  const scriptText = [...document.scripts].map((script) => script.textContent ?? "").join("\n");
  const igValues = collectMatches(
    scriptText,
    /window\._G\.IG\s*=\s*["']([A-Za-z0-9_-]{8,128})["']/gu,
  );
  const helperValues = collectMatches(
    scriptText,
    /params_AbusePreventionHelper\s*=\s*(\[[^;\r\n]{1,4096}\])/gu,
  );
  if (igValues.length !== 1 || helperValues.length !== 1) {
    throw new Error("Bing translator initialization returned missing or ambiguous configuration.");
  }

  let helper;
  try {
    helper = JSON.parse(helperValues[0]);
  } catch {
    throw new Error("Bing translator initialization returned malformed abuse-prevention configuration.");
  }
  if (!Array.isArray(helper) || helper.length !== 3) {
    throw new Error("Bing translator initialization returned invalid abuse-prevention configuration.");
  }
  const [key, token, expiryIntervalMs] = helper;
  if (
    !Number.isSafeInteger(key)
    || key <= 0
    || typeof token !== "string"
    || token.length === 0
    || token.length > 2048
    || !Number.isSafeInteger(expiryIntervalMs)
    || expiryIntervalMs <= 0
    || expiryIntervalMs > 86_400_000
  ) {
    throw new Error("Bing translator initialization returned invalid temporary credentials.");
  }
  return { ig: igValues[0], iid, key, token, expiryIntervalMs };
}

function validateTranslationResponseUrl(value, requestedUrl) {
  let finalUrl;
  try {
    finalUrl = new URL(value);
  } catch {
    throw new Error("Bing translation returned no valid final URL.");
  }
  if (finalUrl.href !== requestedUrl.href) {
    throw new Error("Bing translation redirected away from the approved request URL.");
  }
}

function collectMatches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function parseTranslation(responseText, phrase) {
  if (typeof responseText !== "string" || responseText.includes("ShowCaptcha")) {
    throw new Error("Bing translation returned CAPTCHA or invalid content.");
  }
  const payload = JSON.parse(responseText);
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error("Bing translation returned an unexpected response structure.");
  }
  const result = payload[0];
  if (!Array.isArray(result?.translations) || result.translations.length !== 1) {
    throw new Error("Bing translation returned an ambiguous response.");
  }
  const candidate = result.translations[0];
  const translated = typeof candidate?.text === "string" ? candidate.text.trim() : "";
  if (
    !translated
    || translated === phrase
    || !LATIN_LETTER.test(translated)
    || (candidate.to != null && candidate.to !== "en")
    || (result.detectedLanguage?.language != null && result.detectedLanguage.language !== "ja")
  ) {
    throw new Error("Bing translation returned no reliable Japanese-to-English translation.");
  }
  return translated;
}

function isEligiblePhrase(phrase, maxPhraseCharacters) {
  if (typeof phrase !== "string" || phrase.length === 0 || phrase.length > maxPhraseCharacters) {
    return false;
  }
  const matches = findKatakanaMatches(phrase);
  return matches.length === 1 && matches[0].start === 0 && matches[0].end === phrase.length;
}

function request(gmRequest, options, { signal, label }) {
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
        if (
          !Number.isInteger(response?.status)
          || response.status < 200
          || response.status >= 300
        ) {
          const status = Number.isInteger(response?.status) ? response.status : "unknown";
          finish(reject, new HttpError(`${label} returned HTTP ${status}.`, response?.status));
          return;
        }
        finish(resolve, response ?? {});
      },
      onerror(response) {
        finish(reject, new Error(response?.statusText || `${label} request failed.`));
      },
      ontimeout() {
        finish(reject, new Error(`${label} request timed out.`));
      },
      onabort() {
        finish(reject, abortError());
      },
    });
  });
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw abortError();
  }
}

function abortError() {
  return new DOMException("The Bing translation was aborted.", "AbortError");
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
