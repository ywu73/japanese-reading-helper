import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleKanjiRomajiClient } from "../../src/google-kanji-romaji.js";

test("sends one deduplicated complete kanji word and returns only its distinct source romaji", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["食べる", "食べる"]);
  await waitFor(() => requests.length === 1);
  const request = requests[0];
  const url = new URL(request.url);
  assert.equal(request.method, "GET");
  assert.equal(request.anonymous, true);
  assert.equal(request.redirect, "error");
  assert.equal(url.origin, "https://translate.googleapis.com");
  assert.equal(url.pathname, "/translate_a/single");
  assert.deepEqual(url.searchParams.getAll("dt"), ["t", "rm"]);
  assert.equal(url.searchParams.get("client"), "gtx");
  assert.equal(url.searchParams.get("sl"), "ja");
  assert.equal(url.searchParams.get("tl"), "en");
  assert.equal(url.searchParams.get("q"), "食べる");

  respond(request, googleResponse({
    source: "食べる",
    translation: "eat",
    romaji: "Taberu",
  }));

  assert.deepEqual(await romanizing, new Map([["食べる", "Taberu"]]));
});

test("serializes words so a response always belongs to one exact input", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["学校", "今日"]);
  await waitFor(() => requests.length === 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "学校");
  respond(requests[0], googleResponse({ source: "学校", translation: "school", romaji: "Gakkō" }));
  await waitFor(() => requests.length === 2);
  assert.equal(new URL(requests[1].url).searchParams.get("q"), "今日");
  respond(requests[1], googleResponse({ source: "今日", translation: "today", romaji: "Kyō" }));

  assert.deepEqual(await romanizing, new Map([
    ["学校", "Gakkō"],
    ["今日", "Kyō"],
  ]));
});

test("rejects ambiguous, mistracked, or non-Japanese-looking romaji without using translation text", async (t) => {
  const cases = [
    {
      name: "missing romaji",
      response: JSON.stringify([[['mountain', '山', null, null, 2]], null, "ja"]),
    },
    {
      name: "duplicate romaji candidates",
      response: JSON.stringify([[['mountain', '山'], [null, null, null, "Yama"], [null, null, null, "San"]], null, "ja"]),
    },
    {
      name: "source mismatch",
      response: googleResponse({ source: "火山", translation: "volcano", romaji: "Kazan" }),
    },
    {
      name: "wrong source language",
      response: googleResponse({ source: "山", translation: "mountain", romaji: "Yama", language: "zh-CN" }),
    },
    {
      name: "mixed pinyin and split kana",
      response: googleResponse({ source: "龘べる", translation: "be drunk", romaji: "dá Be Ru" }),
    },
    {
      name: "ordinary translation cannot substitute for romaji",
      response: JSON.stringify([[['today', '今日', null, null, 2]], null, "ja"]),
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const { request, romanizing } = initializedRomanization(testCase.name === "mixed pinyin and split kana" ? "龘べる" : "山");
      await waitFor(() => request.current != null);
      respond(request.current, testCase.response);
      assert.deepEqual(await romanizing, new Map());
    });
  }
});

test("aborts the active request and rejects late output", async () => {
  const requests = [];
  let aborts = 0;
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() { aborts += 1; } };
    },
    minimumIntervalMs: 0,
  });
  const controller = new AbortController();
  const romanizing = client.romanizeWords(["日本語"], { signal: controller.signal });
  await waitFor(() => requests.length === 1);
  controller.abort();

  await assert.rejects(romanizing, { name: "AbortError" });
  assert.equal(aborts, 1);
  respond(requests[0], googleResponse({ source: "日本語", translation: "Japanese", romaji: "Nihongo" }));
});

function initializedRomanization(word) {
  const request = { current: null };
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      request.current = options;
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });
  return { request, romanizing: client.romanizeWords([word]) };
}

function googleResponse({ source, translation, romaji, language = "ja" }) {
  return JSON.stringify([
    [[translation, source, null, null, 2], [null, null, null, romaji]],
    null,
    language,
  ]);
}

function respond(request, responseText) {
  request.onload({
    status: 200,
    finalUrl: request.url,
    responseText,
  });
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
