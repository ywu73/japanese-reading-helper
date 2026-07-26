import assert from "node:assert/strict";
import test from "node:test";

import { createKatakanaTranslationClient } from "../../src/katakana-translation.js";

test("sends only the requested katakana phrases to the fixed endpoint and maps explicit response originals", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム", "コンピューター", "ゲーム"]);
  assert.equal(requests.length, 1);

  const request = requests[0];
  const url = new URL(request.url);
  assert.equal(url.origin, "https://translate.googleapis.com");
  assert.equal(url.pathname, "/translate_a/single");
  assert.deepEqual([...url.searchParams.keys()], ["client", "dt", "sl", "tl", "q"]);
  assert.equal(url.searchParams.get("client"), "gtx");
  assert.equal(url.searchParams.get("dt"), "t");
  assert.equal(url.searchParams.get("sl"), "ja");
  assert.equal(url.searchParams.get("tl"), "en");
  assert.equal(url.searchParams.get("q"), "ゲーム\nコンピューター");
  assert.equal("data" in request, false);
  assert.equal("headers" in request, false);
  assert.equal(request.timeout, 8000);

  request.onload({
    status: 200,
    responseText: JSON.stringify([[ ["computer", "コンピューター"], ["game", "ゲーム"] ]]),
  });

  assert.deepEqual(await translation, new Map([
    ["コンピューター", "computer"],
    ["ゲーム", "game"],
  ]));
});

test("splits phrase batches and never creates a second request while the first is in flight", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxPhrasesPerRequest: 2,
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム", "テレビ", "ラジオ"]);
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "ゲーム\nテレビ");

  requests[0].onload({
    status: 200,
    responseText: JSON.stringify([[ ["game", "ゲーム"], ["television", "テレビ"] ]]),
  });
  await waitFor(() => requests.length === 2);
  assert.equal(new URL(requests[1].url).searchParams.get("q"), "ラジオ");

  requests[1].onload({
    status: 200,
    responseText: JSON.stringify([[ ["radio", "ラジオ"] ]]),
  });
  assert.deepEqual(await translation, new Map([
    ["ゲーム", "game"],
    ["テレビ", "television"],
    ["ラジオ", "radio"],
  ]));
});

test("splits batches before the encoded request URL exceeds its configured budget", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxPhrasesPerRequest: 50,
    maxEncodedUrlLength: 120,
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム", "テレビ"]);
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "ゲーム");
  assert.ok(requests[0].url.length <= 120);

  requests[0].onload({ status: 200, responseText: JSON.stringify([[ ["game", "ゲーム"] ]]) });
  await waitFor(() => requests.length === 2);
  assert.equal(new URL(requests[1].url).searchParams.get("q"), "テレビ");
  assert.ok(requests[1].url.length <= 120);

  requests[1].onload({ status: 200, responseText: JSON.stringify([[ ["television", "テレビ"] ]]) });
  assert.equal((await translation).size, 2);
});

test("waits for the configured minimum interval before creating the next batch request", async () => {
  const requests = [];
  const waits = [];
  const waitGate = deferred();
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxPhrasesPerRequest: 1,
    minimumIntervalMs: 250,
    sleep(milliseconds) {
      waits.push(milliseconds);
      return waitGate.promise;
    },
  });

  const translation = client.translatePhrases(["ゲーム", "テレビ"]);
  requests[0].onload({ status: 200, responseText: JSON.stringify([[ ["game", "ゲーム"] ]]) });
  await waitFor(() => waits.length === 1);

  assert.deepEqual(waits, [250]);
  assert.equal(requests.length, 1);

  waitGate.resolve();
  await waitFor(() => requests.length === 2);
  requests[1].onload({ status: 200, responseText: JSON.stringify([[ ["television", "テレビ"] ]]) });
  assert.equal((await translation).size, 2);
});

test("rejects empty, unchanged, non-Latin, unknown, and duplicate response mappings", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム", "テレビ", "ラジオ", "カメラ"]);
  requests[0].onload({
    status: 200,
    responseText: JSON.stringify([[
      ["ゲーム", "ゲーム"],
      ["game", "ゲーム"],
      ["", "テレビ"],
      ["收音机", "ラジオ"],
      ["camera", "別の語"],
      ["camera", "カメラ"],
      ["photo camera", "カメラ"],
    ]]),
  });

  assert.deepEqual(await translation, new Map());
});

test("aborts the in-flight GM request and never retries after cancellation", async () => {
  const requests = [];
  let abortCalls = 0;
  const controller = new AbortController();
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() { abortCalls += 1; } };
    },
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム"], { signal: controller.signal });
  controller.abort();

  await assert.rejects(translation, { name: "AbortError" });
  assert.equal(abortCalls, 1);
  assert.equal(requests.length, 1);

  requests[0].onload({
    status: 200,
    responseText: JSON.stringify([[ ["game", "ゲーム"] ]]),
  });
  await Promise.resolve();
  assert.equal(requests.length, 1);
});

test("fails once on the explicit request timeout without creating a retry", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    requestTimeoutMs: 4321,
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム"]);
  assert.equal(requests[0].timeout, 4321);
  requests[0].ontimeout();

  await assert.rejects(translation, /timed out/u);
  assert.equal(requests.length, 1);
});

test("fails once on malformed JSON without guessing or retrying", async () => {
  const requests = [];
  const client = createKatakanaTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const translation = client.translatePhrases(["ゲーム"]);
  requests[0].onload({ status: 200, responseText: "not-json" });

  await assert.rejects(translation, SyntaxError);
  assert.equal(requests.length, 1);
});

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
