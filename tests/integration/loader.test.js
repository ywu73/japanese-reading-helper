import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { loadVerifiedKuromoji, readAndVerifyResource } from "../../src/vendor-loader.js";

const encoder = new TextEncoder();

test("reads and verifies a named preloaded resource through its local URL", async () => {
  const bytes = encoder.encode("preloaded dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  const requestedResources = [];
  const requestedUrls = [];
  const getResourceUrl = (name) => {
    requestedResources.push(name);
    return "blob:tampermonkey-resource/base";
  };
  const gmRequest = (details) => {
    requestedUrls.push(details.url);
    assert.equal(details.method, "GET");
    assert.equal(details.responseType, "arraybuffer");
    assert.equal(details.anonymous, true);
    assert.equal("data" in details, false);
    queueMicrotask(() => details.onload({ status: 200, response: slice(bytes) }));
  };

  const verified = await readAndVerifyResource(record, getResourceUrl, gmRequest);

  assert.deepEqual(new Uint8Array(verified), bytes);
  assert.deepEqual(requestedResources, ["yomi-ruby-dict-base"]);
  assert.deepEqual(requestedUrls, ["blob:tampermonkey-resource/base"]);
});

test("rejects a digest mismatch before returning asset bytes", async () => {
  const bytes = encoder.encode("tampered dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  record.sha256 = "0".repeat(64);
  const gmRequest = ({ onload }) => {
    queueMicrotask(() => onload({ status: 200, response: slice(bytes) }));
  };

  await assert.rejects(
    readAndVerifyResource(record, () => "blob:tampermonkey-resource/base", gmRequest),
    /SHA-256 mismatch for base\.dat\.gz/,
  );
});

test("fails closed when the verified dictionary set is incomplete", async () => {
  let requests = 0;
  const gmRequest = () => {
    requests += 1;
  };

  await assert.rejects(
    loadVerifiedKuromoji({ manifest: { dictionary: [] }, gmRequest }),
    /Verified dictionary asset not found: base\.dat\.gz/,
  );
  assert.equal(requests, 0);
});

test("fails closed on an asset network error without partial initialization", async () => {
  const bytes = encoder.encode("dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  let requests = 0;
  const gmRequest = ({ onerror }) => {
    requests += 1;
    queueMicrotask(() => onerror(new Error("offline")));
  };

  await assert.rejects(
    readAndVerifyResource(record, () => "blob:tampermonkey-resource/base", gmRequest),
    /Network error while requesting blob:tampermonkey-resource\/base/,
  );
  assert.equal(requests, 1);
});

test("aborting a preloaded resource read cancels the Tampermonkey request handle", async () => {
  const bytes = encoder.encode("dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  const controller = new AbortController();
  let abortCount = 0;
  const gmRequest = (details) => {
    queueMicrotask(() => details.onload({ status: 200, response: slice(bytes) }));
    return {
      abort() {
        abortCount += 1;
        details.onabort();
      },
    };
  };

  const loading = readAndVerifyResource(
    record,
    () => "blob:tampermonkey-resource/base",
    gmRequest,
    undefined,
    controller.signal,
  );
  controller.abort();

  await assert.rejects(loading, /aborted/u);
  assert.equal(abortCount, 1);
});

test("refuses an HTTPS URL returned in place of a preloaded local resource", async () => {
  const bytes = encoder.encode("dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  let requests = 0;

  await assert.rejects(
    readAndVerifyResource(
      record,
      () => "https://assets.example/base.dat.gz",
      () => {
        requests += 1;
      },
    ),
    /Refusing non-local preloaded resource URL for yomi-ruby-dict-base/,
  );
  assert.equal(requests, 0);
});

test("fails closed when a named preloaded resource is unavailable", async () => {
  const bytes = encoder.encode("dictionary bytes");
  const record = asset("base.dat.gz", "yomi-ruby-dict-base", bytes);
  let requests = 0;

  await assert.rejects(
    readAndVerifyResource(record, () => undefined, () => {
      requests += 1;
    }),
    /Preloaded resource unavailable: yomi-ruby-dict-base/,
  );
  assert.equal(requests, 0);
});

function asset(name, resourceName, bytes) {
  return {
    name,
    resourceName,
    size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function slice(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
