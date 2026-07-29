const INITIAL_URL = "https://www.bing.com/translator";
const ALLOWED_HOSTS = new Set(["www.bing.com", "cn.bing.com"]);
const HAS_KANJI = /\p{Script=Han}/u;
const SAFE_ROMAJI = /^[A-Za-zĀĪŪĒŌāīūēō'’-]+$/u;
const MAX_GLOBAL_OBJECT_CHARACTERS = 16_384;
const MAX_ROMAJI_CHARACTERS = 1_000;

export function createBingKanjiRomajiClient({
  gmRequest,
  DOMParser = globalThis.DOMParser,
  now = Date.now,
  sleep = wait,
  minimumIntervalMs = 1000,
  requestTimeoutMs = 8000,
  refreshSkewMs = 60_000,
  maxWordCharacters = 200,
}) {
  if (typeof gmRequest !== "function") {
    throw new TypeError("A GM_xmlhttpRequest adapter is required for Bing kanji romaji.");
  }
  if (typeof DOMParser !== "function") {
    throw new TypeError("A DOMParser is required for Bing translator initialization.");
  }

  let config = null;
  let configPromise = null;
  let operationQueue = Promise.resolve();
  let requestSequence = 0;
  let lastRequestStartedAt = null;

  const romanizeWords = (words, { signal } = {}) => {
    const operation = operationQueue.then(async () => {
      throwIfAborted(signal);
      const uniqueWords = [...new Set(words.filter((word) => isEligibleWord(
        word,
        maxWordCharacters,
      )))];
      const readings = new Map();
      for (const word of uniqueWords) {
        const romaji = await romanizeWord(word, signal);
        if (romaji) {
          readings.set(word, romaji);
        }
      }
      return readings;
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
    if (lastRequestStartedAt == null || minimumIntervalMs <= 0) {
      return;
    }
    const remaining = minimumIntervalMs - (now() - lastRequestStartedAt);
    if (remaining > 0) {
      await sleep(remaining, { signal });
    }
  }

  async function romanizeWord(word, signal) {
    let activeConfig = await getConfig(signal);
    await waitForTrafficSlot(signal);
    try {
      return await requestWord(activeConfig, word, signal);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401 || signal?.aborted) {
        throw error;
      }
      config = null;
      activeConfig = await getConfig(signal);
      await waitForTrafficSlot(signal);
      try {
        return await requestWord(activeConfig, word, signal);
      } catch (retryError) {
        if (retryError instanceof HttpError && retryError.status === 401) {
          config = null;
        }
        throw retryError;
      }
    }
  }

  async function requestWord(activeConfig, word, signal) {
    throwIfAborted(signal);
    lastRequestStartedAt = now();
    const url = new URL("/ttranslatev3", activeConfig.origin);
    url.searchParams.set("isVertical", "1");
    url.searchParams.set("IG", activeConfig.ig);
    url.searchParams.set("IID", activeConfig.iid);
    url.searchParams.set("SFX", String(++requestSequence));
    url.searchParams.set("ref", "TThis");
    url.searchParams.set("edgepdftranslator", "1");
    const data = new URLSearchParams({
      fromLang: "ja",
      to: "ja",
      text: word,
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
    }, { signal, label: "Bing kanji romaji" });
    validateResponseUrl(response.finalUrl ?? response.responseURL, url);
    return parseRomajiResponse(response.responseText, word);
  }

  return { romanizeWords };
}

function parseRomajiResponse(responseText, word) {
  if (typeof responseText !== "string" || responseText.includes("ShowCaptcha")) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    return null;
  }
  if (!Array.isArray(payload) || payload.length !== 2) {
    return null;
  }
  const result = payload[0];
  const metadata = payload[1];
  if (!Array.isArray(result?.translations) || result.translations.length !== 1) {
    return null;
  }
  const translation = result.translations[0];
  const echoed = typeof translation?.text === "string" ? translation.text.trim() : "";
  if (echoed !== word || translation?.to !== "ja") {
    return null;
  }
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const keys = Object.keys(metadata).sort();
  if (keys.length !== 2 || keys[0] !== "inputTransliteration" || keys[1] !== "script") {
    return null;
  }
  const romaji = metadata.inputTransliteration;
  if (
    metadata.script !== "Latn"
    || typeof romaji !== "string"
    || romaji.length === 0
    || romaji.length > MAX_ROMAJI_CHARACTERS
    || romaji !== romaji.trim()
    || !SAFE_ROMAJI.test(romaji)
  ) {
    return null;
  }
  return romaji;
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
  const directIgValues = collectMatches(
    scriptText,
    /window\._G\.IG\s*=\s*["']([A-Za-z0-9_-]{8,128})["']/gu,
  );
  const objectIgValues = collectObjectInitializerIgValues(scriptText);
  const igValues = [...directIgValues, ...objectIgValues];
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

function validateResponseUrl(value, requestedUrl) {
  let finalUrl;
  try {
    finalUrl = new URL(value);
  } catch {
    throw new Error("Bing kanji romaji returned no valid final URL.");
  }
  if (finalUrl.href !== requestedUrl.href) {
    throw new Error("Bing kanji romaji redirected away from the approved request URL.");
  }
}

function collectMatches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function collectObjectInitializerIgValues(scriptText) {
  const objectBodies = collectMatches(
    scriptText,
    new RegExp(
      String.raw`(?:^|[;\r\n])\s*(?:var\s+)?(?:window\.)?_G\s*=\s*\{([^;\r\n]{1,${MAX_GLOBAL_OBJECT_CHARACTERS}})\}\s*;`,
      "gu",
    ),
  );
  return objectBodies.flatMap((body) => collectMatches(
    body,
    /(?:^|,)\s*IG\s*:\s*["']([A-Za-z0-9_-]{8,128})["'](?=\s*(?:,|$))/gu,
  ));
}

function isEligibleWord(word, maxWordCharacters) {
  return typeof word === "string"
    && word.length > 0
    && word.length <= maxWordCharacters
    && word === word.trim()
    && !/[\r\n\u0000-\u001f\u007f]/u.test(word)
    && HAS_KANJI.test(word);
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
        if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
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
  return new DOMException("Bing kanji romaji was aborted.", "AbortError");
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
