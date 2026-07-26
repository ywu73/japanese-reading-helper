import { buildStaticTokenizer } from "./static-tokenizer.js";

export async function loadVerifiedKuromoji({
  manifest,
  getResourceUrl,
  gmRequest,
  subtle = globalThis.crypto?.subtle,
  signal,
}) {
  if (!Array.isArray(manifest?.dictionary)) {
    throw new TypeError("A valid vendor manifest is required.");
  }
  if (typeof gmRequest !== "function") {
    throw new TypeError("GM_xmlhttpRequest is required for verified asset loading.");
  }
  if (!subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable; refusing to load dictionary assets.");
  }
  throwIfAborted(signal);

  const dictionaryEntries = await Promise.all(
    manifest.dictionary.map(async (asset) => [
      asset.name,
      await readAndVerifyResource(asset, getResourceUrl, gmRequest, subtle, signal),
    ]),
  );
  const dictionaryFiles = new Map(dictionaryEntries);

  try {
    throwIfAborted(signal);
    const tokenizer = buildStaticTokenizer(dictionaryFiles);
    throwIfAborted(signal);
    return tokenizer;
  } finally {
    dictionaryFiles.clear();
  }
}

export async function readAndVerifyResource(
  asset,
  getResourceUrl,
  gmRequest,
  subtle = globalThis.crypto?.subtle,
  signal,
) {
  throwIfAborted(signal);
  validateAssetRecord(asset);
  if (!asset.resourceName || typeof asset.resourceName !== "string") {
    throw new Error(`Missing preloaded resource name for ${asset.name}`);
  }
  if (typeof getResourceUrl !== "function") {
    throw new TypeError("GM_getResourceURL is required for preloaded dictionary access.");
  }
  const resourceUrl = getResourceUrl(asset.resourceName);
  validateLocalResourceUrl(resourceUrl, asset.resourceName);
  const bytes = await gmArrayBufferRequest(resourceUrl, gmRequest, signal);
  return verifyAssetBytes(asset, bytes, subtle, signal);
}

async function verifyAssetBytes(asset, bytes, subtle, signal) {
  throwIfAborted(signal);
  if (bytes.byteLength !== asset.size) {
    throw new Error(`Size mismatch for ${asset.name}: expected ${asset.size}, received ${bytes.byteLength}`);
  }
  const digest = toHex(await subtle.digest("SHA-256", bytes));
  throwIfAborted(signal);
  if (digest !== asset.sha256) {
    throw new Error(`SHA-256 mismatch for ${asset.name}: expected ${asset.sha256}, received ${digest}`);
  }
  return bytes;
}

function validateLocalResourceUrl(resourceUrl, resourceName) {
  if (typeof resourceUrl !== "string" || resourceUrl.length === 0) {
    throw new Error(`Preloaded resource unavailable: ${resourceName}`);
  }
  let protocol;
  try {
    protocol = new URL(resourceUrl).protocol;
  } catch {
    throw new Error(`Invalid preloaded resource URL for ${resourceName}`);
  }
  if (!["blob:", "data:", "chrome-extension:", "moz-extension:"].includes(protocol)) {
    throw new Error(`Refusing non-local preloaded resource URL for ${resourceName}`);
  }
}

function validateAssetRecord(asset) {
  if (!asset.name || !Number.isSafeInteger(asset.size) || asset.size < 0 || !/^[0-9a-f]{64}$/u.test(asset.sha256)) {
    throw new Error(`Invalid manifest entry for ${asset?.name ?? "unnamed asset"}`);
  }
}

function gmArrayBufferRequest(url, gmRequest, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let requestHandle;
    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener("abort", onSignalAbort);
      callback(value);
    };
    const rejectAbort = () => finish(reject, new Error(`Asset request aborted for ${url}`));
    const onSignalAbort = () => {
      try {
        requestHandle?.abort?.();
      } finally {
        rejectAbort();
      }
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }
    signal?.addEventListener("abort", onSignalAbort, { once: true });

    try {
      requestHandle = gmRequest({
        method: "GET",
        url,
        responseType: "arraybuffer",
        timeout: 120_000,
        anonymous: true,
        onload(response) {
          const localSuccess = response.status === 0 || (response.status >= 200 && response.status < 300);
          if (!localSuccess || !(response.response instanceof ArrayBuffer)) {
            finish(reject, new Error(`Asset request failed for ${url}: HTTP ${response.status}`));
            return;
          }
          finish(resolve, response.response);
        },
        onerror: () => finish(reject, new Error(`Network error while requesting ${url}`)),
        ontimeout: () => finish(reject, new Error(`Timed out while requesting ${url}`)),
        onabort: rejectAbort,
      });
      if (signal?.aborted) {
        onSignalAbort();
      }
    } catch (error) {
      finish(reject, error);
    }
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new Error("Asset loading aborted.");
  }
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
