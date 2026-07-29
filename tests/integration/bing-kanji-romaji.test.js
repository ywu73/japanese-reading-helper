import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createBingKanjiRomajiClient } from "../../src/bing-kanji-romaji.js";

const DOMParser = new JSDOM("").window.DOMParser;
const TRANSLATOR_FIXTURE = await readFile(
  new URL("../fixtures/bing-translator.html", import.meta.url),
  "utf8",
);

test("initializes anonymously and requests one exact kanji word with ja-to-ja semantics", async () => {
  const requests = [];
  const client = createBingKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["食べる", "食べる"]);
  await initialize(requests);
  const post = requests[1];
  const url = new URL(post.url);
  assert.equal(post.method, "POST");
  assert.equal(post.anonymous, true);
  assert.equal(post.redirect, "error");
  assert.equal(url.origin, "https://cn.bing.com");
  assert.equal(url.pathname, "/ttranslatev3");
  assert.deepEqual([...new URLSearchParams(post.data).entries()], [
    ["fromLang", "ja"],
    ["to", "ja"],
    ["text", "食べる"],
    ["token", "redacted-page-token"],
    ["key", "123456789"],
    ["tryFetchingGenderDebiasedTranslations", "true"],
  ]);
  respond(post, validRomaji("食べる", "taberu", { language: "ja" }));

  assert.deepEqual(await romanizing, new Map([["食べる", "taberu"]]));
});

test("accepts a precise Japanese reading even when detectedLanguage reports zh-Hans", async () => {
  const { requests, romanizing } = await initializedRomanization("学校");
  respond(requests[1], validRomaji("学校", "gakkou", { language: "zh-Hans" }));

  assert.deepEqual(await romanizing, new Map([["学校", "gakkou"]]));
});

test("rejects rewritten source, malformed metadata, and unsafe romaji without exposing another field", async (t) => {
  const cases = [
    {
      name: "rewritten ja-to-ja source",
      response: validRomaji("たつべる", "tatsuberu", { language: "ja" }),
    },
    {
      name: "wrong script",
      response: validRomaji("龘べる", "tatsuberu", { script: "Cyrl" }),
    },
    {
      name: "extra metadata field",
      response: validRomaji("龘べる", "tatsuberu", { extra: true }),
    },
    {
      name: "missing transliteration metadata",
      response: JSON.stringify([{ translations: [{ text: "龘べる", to: "ja" }] }]),
    },
    {
      name: "mixed pinyin and split kana",
      response: validRomaji("龘べる", "dá Be Ru"),
    },
    {
      name: "wrong target",
      response: validRomaji("龘べる", "tatsuberu", { to: "en" }),
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const { requests, romanizing } = await initializedRomanization("龘べる");
      respond(requests[1], testCase.response);
      assert.deepEqual(await romanizing, new Map());
    });
  }
});

test("refreshes temporary configuration once after 401 and retries only the affected word", async () => {
  const requests = [];
  const client = createBingKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const romanizing = client.romanizeWords(["今日"]);
  await initialize(requests, { helper: [111, "first-token", 3_600_000] });
  respond(requests[1], "expired", { status: 401 });
  await waitFor(() => requests.length === 3);
  requests[2].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [222, "second-token", 3_600_000] }),
  });
  await waitFor(() => requests.length === 4);
  assert.equal(new URLSearchParams(requests[3].data).get("text"), "今日");
  assert.equal(new URLSearchParams(requests[3].data).get("token"), "second-token");
  respond(requests[3], validRomaji("今日", "Kyou", { language: "zh-Hans" }));

  assert.deepEqual(await romanizing, new Map([["今日", "Kyou"]]));
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "POST", "GET", "POST"]);
});

test("fails closed on 429 without another request or cross-provider fallback", async () => {
  const { requests, romanizing } = await initializedRomanization("東京");
  respond(requests[1], "rate limited", { status: 429 });

  await assert.rejects(romanizing, /HTTP 429/u);
  assert.equal(requests.length, 2);
});

test("aborts initialization and rejects a late result", async () => {
  const requests = [];
  let aborts = 0;
  const client = createBingKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() { aborts += 1; } };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const controller = new AbortController();
  const romanizing = client.romanizeWords(["日本語"], { signal: controller.signal });
  await waitFor(() => requests.length === 1);
  controller.abort();

  await assert.rejects(romanizing, { name: "AbortError" });
  assert.equal(aborts, 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
});

async function initializedRomanization(word) {
  const requests = [];
  const client = createBingKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const romanizing = client.romanizeWords([word]);
  await initialize(requests);
  return { requests, romanizing };
}

async function initialize(requests, options) {
  await waitFor(() => requests.length === 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].url, "https://www.bing.com/translator");
  assert.equal(requests[0].anonymous, true);
  requests[0].onload({
    status: 200,
    finalUrl: "https://cn.bing.com/translator",
    responseText: translatorHtml(options),
  });
  await waitFor(() => requests.length === 2);
}

function validRomaji(
  text,
  inputTransliteration,
  { to = "ja", language = "ja", script = "Latn", extra = false } = {},
) {
  const metadata = { inputTransliteration, script };
  if (extra) {
    metadata.extra = true;
  }
  return JSON.stringify([
    {
      translations: [{ text, to }],
      detectedLanguage: { language },
      usedLLM: true,
    },
    metadata,
  ]);
}

function respond(request, responseText, { status = 200 } = {}) {
  request.onload({
    status,
    finalUrl: request.url,
    responseText,
  });
}

function translatorHtml({
  ig = "A1B2C3D4E5F6",
  igShape = "object",
  iid = "translator.5023",
  helper = [123456789, "redacted-page-token", 3_600_000],
  before = "",
  after = "",
} = {}) {
  const igAssignment = igShape === "object"
    ? `var _G = { Region: "CN", Lang: "zh-CN", IG: "${ig}", EventID: "redacted-event" };`
    : `window._G.IG = "${ig}";`;
  return TRANSLATOR_FIXTURE
    .replace("{{BEFORE}}", before)
    .replace("{{IID}}", iid)
    .replace("{{IG_ASSIGNMENT}}", igAssignment)
    .replace("{{HELPER}}", JSON.stringify(helper))
    .replace("{{AFTER}}", after);
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
