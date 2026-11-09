import { buildStaticTokenizerAsync } from "./static-tokenizer.js";

const BASE_URL = "https://unpkg.com/kuromoji@0.1.2/dict/";
const CACHE_PREFIX = "yomi-ruby:dictionary-cache:kuromoji@0.1.2:";
const DICTIONARY_NAMES = new Set([
  "base.dat.gz", "check.dat.gz", "cc.dat.gz", "tid.dat.gz", "tid_pos.dat.gz", "tid_map.dat.gz",
  "unk.dat.gz", "unk_pos.dat.gz", "unk_map.dat.gz", "unk_char.dat.gz", "unk_compat.dat.gz", "unk_invoke.dat.gz",
]);

export async function loadLazyVerifiedKuromoji({
  manifest, gmRequest, getValue, setValue, subtle = globalThis.crypto?.subtle, signal, onProgress = () => {},
}) {
  throwIfAborted(signal);
  if (!Array.isArray(manifest?.dictionary) || manifest.dictionary.length !== DICTIONARY_NAMES.size
    || new Set(manifest.dictionary.map((asset) => asset?.name)).size !== DICTIONARY_NAMES.size) {
    throw new Error("The complete approved kuromoji@0.1.2 dictionary manifest is required.");
  }
  for (const asset of manifest.dictionary) validateAsset(asset);
  const dictionaryFiles = new Map();
  onProgress({ completed: 0, total: manifest.dictionary.length });
  try {
    // Acquire sequentially so one failed/cancelled asset never starts later downloads.
    for (const asset of manifest.dictionary) {
      const bytes = await readAndVerifyDictionary({ asset, gmRequest, getValue, setValue, subtle, signal });
      dictionaryFiles.set(asset.name, bytes);
      onProgress({ completed: dictionaryFiles.size, total: manifest.dictionary.length });
    }
    throwIfAborted(signal);
    const tokenizer = await buildStaticTokenizerAsync(dictionaryFiles, { signal });
    throwIfAborted(signal);
    return tokenizer;
  } catch (error) {
    throwIfAborted(signal);
    throw error;
  } finally {
    dictionaryFiles.clear();
  }
}

export async function readAndVerifyDictionary({
  asset, gmRequest, getValue, setValue, subtle = globalThis.crypto?.subtle, signal,
}) {
  validateAsset(asset);
  if (!subtle || typeof subtle.digest !== "function") {
    throw new Error("Web Crypto SHA-256 is unavailable; refusing to load dictionary assets.");
  }
  if (typeof gmRequest !== "function" || typeof getValue !== "function" || typeof setValue !== "function") {
    throw new TypeError("Dictionary requests and cache storage adapters are required.");
  }
  throwIfAborted(signal);
  const key = CACHE_PREFIX + asset.name;
  const cached = await abortable(getValue(key, null), signal);
  throwIfAborted(signal);
  let canPersist = true;
  if (cached != null) {
    try {
      return await verifyBytes(asset, decodeCache(asset, cached), subtle, signal);
    } catch (error) {
      throwIfAborted(signal);
      if (!(error instanceof IntegrityError) && !(error instanceof CacheError)) throw error;
      canPersist = await writeCache(key, null, setValue, signal);
      throwIfAborted(signal);
    }
  }
  const bytes = await requestDictionary(asset.url, gmRequest, signal);
  await verifyBytes(asset, bytes, subtle, signal);
  if (canPersist) {
    await writeCache(key, { sha256: asset.sha256, base64: encodeBase64(bytes) }, setValue, signal);
  }
  throwIfAborted(signal);
  return bytes;
}

function validateAsset(asset) {
  if (!asset || !DICTIONARY_NAMES.has(asset.name)
    || asset.url !== BASE_URL + asset.name
    || !Number.isSafeInteger(asset.size) || asset.size <= 0
    || typeof asset.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(asset.sha256)) {
    throw new Error("An approved kuromoji@0.1.2 dictionary manifest entry is required.");
  }
}

async function verifyBytes(asset, bytes, subtle, signal) {
  throwIfAborted(signal);
  if (bytes.byteLength !== asset.size) {
    throw new IntegrityError(`Size mismatch for ${asset.name}.`);
  }
  const digest = [...new Uint8Array(await abortable(subtle.digest("SHA-256", bytes), signal))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  throwIfAborted(signal);
  if (digest !== asset.sha256) {
    throw new IntegrityError(`SHA-256 mismatch for ${asset.name}.`);
  }
  return bytes;
}

function requestDictionary(url, gmRequest, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let handle;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      callback(value);
    };
    const onAbort = () => {
      try { handle?.abort?.(); }
      finally { finish(reject, abortError()); }
    };
    if (signal?.aborted) { finish(reject, abortError()); return; }
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      handle = gmRequest({
        method: "GET", url, responseType: "arraybuffer", timeout: 120_000,
        anonymous: true, redirect: "error",
        onload(response) {
          if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
            finish(reject, new Error("Dictionary request returned an invalid HTTP status."));
          } else if ((response.finalUrl ?? response.responseURL) !== url) {
            finish(reject, new Error("Dictionary request returned a missing or changed final URL."));
          } else if (!(response.response instanceof ArrayBuffer)) {
            finish(reject, new Error("Dictionary request did not return an ArrayBuffer."));
          } else {
            finish(resolve, response.response);
          }
        },
        onerror: () => finish(reject, new Error("Dictionary request failed.")),
        ontimeout: () => finish(reject, new Error("Dictionary request timed out.")),
        onabort: () => finish(reject, abortError()),
      });
      if (signal?.aborted) onAbort();
    } catch (error) { finish(reject, error); }
  });
}

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(""));
}

function decodeCache(asset, cached) {
  if (typeof cached !== "object" || Array.isArray(cached)
    || Object.keys(cached).sort().join(",") !== "base64,sha256" || cached.sha256 !== asset.sha256
    || typeof cached.base64 !== "string"
    || cached.base64.length !== 4 * Math.ceil(asset.size / 3)
    || !/^[A-Za-z0-9+/]*={0,2}$/u.test(cached.base64)) {
    throw new CacheError(`Invalid dictionary cache for ${asset.name}.`);
  }
  try {
    const binary = atob(cached.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  } catch {
    throw new CacheError(`Invalid dictionary cache for ${asset.name}.`);
  }
}

class IntegrityError extends Error {}
class CacheError extends Error {}

async function writeCache(key, value, setValue, signal) {
  throwIfAborted(signal);
  try {
    await abortable(setValue(key, value), signal);
    return true;
  } catch {
    throwIfAborted(signal);
    // Verified immutable bytes remain usable in this page when storage is full.
    return false;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function abortError() {
  return new DOMException("Dictionary loading aborted.", "AbortError");
}

function abortable(operation, signal) {
  if (!signal) return Promise.resolve(operation);
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => {
      signal.removeEventListener("abort", onAbort);
      callback(value);
    };
    const onAbort = () => finish(reject, abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(operation).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
    if (signal.aborted) onAbort();
  });
}
