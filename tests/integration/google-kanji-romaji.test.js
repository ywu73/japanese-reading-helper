import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleKanjiRomajiClient } from "../../src/google-kanji-romaji.js";

test("maps a validated emoji-delimited batch from the tl=ja romaji field", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["神奈川県", "大阪市", "東京都"]);
  await waitFor(() => requests.length === 1);
  const request = requests[0];
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("tl"), "ja");
  assert.equal(url.searchParams.get("q"), "神奈川県🧩大阪市🧩東京都");

  respond(request, googleBatchResponse({
    source: "神奈川県🧩大阪市🧩東京都",
    romaji: "Kanagawa ken 🧩 Ōsaka ichi 🧩 Tōkyōto",
  }));

  assert.deepEqual(await romanizing, new Map([
    ["神奈川県", "Kanagawa ken"],
    ["大阪市", "Ōsaka ichi"],
    ["東京都", "Tōkyōto"],
  ]));
});

test("falls back when batch structure cannot prove exact positional mapping", async (t) => {
  const source = "学校🧩今日";
  const cases = [
    {
      name: "source echo mismatch",
      response: googleBatchResponse({ source: "学校🧩明日", romaji: "Gakkō 🧩 kyō" }),
    },
    {
      name: "missing source echo",
      response: JSON.stringify([[[source, null, null], [null, null, "Gakkō 🧩 kyō"]], null, "ja"]),
    },
    {
      name: "duplicate source echo entries",
      response: JSON.stringify([[[source, source], [source, source], [null, null, "Gakkō 🧩 kyō"]], null, "ja"]),
    },
    {
      name: "duplicate item[2] romaji fields",
      response: JSON.stringify([[[source, source], [null, null, "Gakkō"], [null, null, "Kyō"]], null, "ja"]),
    },
    {
      name: "segment count mismatch",
      response: googleBatchResponse({ source, romaji: "Gakkō" }),
    },
    {
      name: "residual separator creates an extra segment",
      response: googleBatchResponse({ source, romaji: "Gakkō 🧩 kyō 🧩 ashita" }),
    },
    {
      name: "wrong source language",
      response: googleBatchResponse({ source, romaji: "Gakkō 🧩 kyō", language: "zh-CN" }),
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
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
      respond(requests[0], testCase.response);

      await waitFor(() => requests.length === 2);
      assertSingleWordRequest(requests[1], "学校");
      respond(requests[1], googleResponse({ source: "学校", translation: "school", romaji: "Gakkō" }));
      await waitFor(() => requests.length === 3);
      assertSingleWordRequest(requests[2], "今日");
      respond(requests[2], googleResponse({ source: "今日", translation: "today", romaji: "Kyō" }));

      assert.deepEqual(await romanizing, new Map([
        ["学校", "Gakkō"],
        ["今日", "Kyō"],
      ]));
    });
  }
});

test("keeps aligned safe batch segments while skipping only an unsafe tilde segment", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["山", "日", "森"]);
  await waitFor(() => requests.length === 1);
  respond(requests[0], googleBatchResponse({
    source: "山🧩日🧩森",
    romaji: "Yama 🧩 Ni~Tsu 🧩 mori",
  }));

  assert.deepEqual(await romanizing, new Map([
    ["山", "Yama"],
    ["森", "mori"],
  ]));
  assert.equal(requests.length, 1);
});

test("bounds emoji batches by the configured phrase count", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxPhrasesPerRequest: 2,
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["山", "川", "海"]);
  await waitFor(() => requests.length === 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "山🧩川");
  respond(requests[0], googleBatchResponse({ source: "山🧩川", romaji: "Yama 🧩 kawa" }));
  await waitFor(() => requests.length === 2);
  assert.equal(new URL(requests[1].url).searchParams.get("q"), "海");
  respond(requests[1], googleBatchResponse({ source: "海", romaji: "Umi" }));

  assert.deepEqual(await romanizing, new Map([
    ["山", "Yama"],
    ["川", "kawa"],
    ["海", "Umi"],
  ]));
});

test("waits for the configured interval before starting the next emoji batch", async () => {
  const requests = [];
  const sleeps = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxPhrasesPerRequest: 1,
    sleep(milliseconds) {
      sleeps.push(milliseconds);
      return Promise.resolve();
    },
  });

  const romanizing = client.romanizeWords(["山", "川"]);
  await waitFor(() => requests.length === 1);
  respond(requests[0], googleBatchResponse({ source: "山", romaji: "Yama" }));
  await waitFor(() => requests.length === 2);
  assert.deepEqual(sleeps, [250]);
  respond(requests[1], googleBatchResponse({ source: "川", romaji: "Kawa" }));

  assert.deepEqual(await romanizing, new Map([
    ["山", "Yama"],
    ["川", "Kawa"],
  ]));
});

test("bounds batches by URL length and sends an over-budget word only through fallback", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    maxEncodedUrlLength: 96,
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["山"]);
  await waitFor(() => requests.length === 1);
  assertSingleWordRequest(requests[0], "山");
  respond(requests[0], googleResponse({ source: "山", translation: "mountain", romaji: "Yama" }));

  assert.deepEqual(await romanizing, new Map([["山", "Yama"]]));
  assert.equal(requests.length, 1);
});

test("does not send a candidate containing the private batch separator", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const romanizing = client.romanizeWords(["山🧩川", "海"]);
  await waitFor(() => requests.length === 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "海");
  respond(requests[0], googleBatchResponse({ source: "海", romaji: "Umi" }));

  assert.deepEqual(await romanizing, new Map([["海", "Umi"]]));
  assert.equal(requests.length, 1);
});

test("falls back to the single-word path after a batch transport failure", async (t) => {
  const cases = [
    {
      name: "HTTP 429",
      fail(request) {
        request.onload({ status: 429, finalUrl: request.url, responseText: "" });
      },
    },
    {
      name: "timeout",
      fail(request) {
        request.ontimeout();
      },
    },
    {
      name: "redirected final URL",
      fail(request) {
        request.onload({
          status: 200,
          finalUrl: "https://example.com/translate_a/single",
          responseText: googleBatchResponse({ source: "日本語", romaji: "Nihongo" }),
        });
      },
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const requests = [];
      const client = createGoogleKanjiRomajiClient({
        gmRequest(options) {
          requests.push(options);
          return { abort() {} };
        },
        minimumIntervalMs: 0,
      });
      const romanizing = client.romanizeWords(["日本語"]);
      await waitFor(() => requests.length === 1);
      testCase.fail(requests[0]);
      await waitFor(() => requests.length === 2);
      assertSingleWordRequest(requests[1], "日本語");
      respond(requests[1], googleResponse({
        source: "日本語",
        translation: "Japanese",
        romaji: "Nihongo",
      }));
      assert.deepEqual(await romanizing, new Map([["日本語", "Nihongo"]]));
    });
  }
});

test("sends one deduplicated complete kanji word through the batch request", async () => {
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
  assert.equal(request.timeout, 8000);
  assert.equal(url.origin, "https://translate.googleapis.com");
  assert.equal(url.pathname, "/translate_a/single");
  assert.deepEqual(url.searchParams.getAll("dt"), ["t", "rm"]);
  assert.equal(url.searchParams.get("client"), "gtx");
  assert.equal(url.searchParams.get("sl"), "ja");
  assert.equal(url.searchParams.get("tl"), "ja");
  assert.equal(url.searchParams.get("q"), "食べる");

  respond(request, googleBatchResponse({
    source: "食べる",
    romaji: "Taberu",
  }));

  assert.deepEqual(await romanizing, new Map([["食べる", "Taberu"]]));
});

test("serializes client operations so a response always belongs to one exact batch", async () => {
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });

  const firstRomanizing = client.romanizeWords(["学校"]);
  const secondRomanizing = client.romanizeWords(["今日"]);
  await waitFor(() => requests.length === 1);
  assert.equal(new URL(requests[0].url).searchParams.get("q"), "学校");
  respond(requests[0], googleBatchResponse({ source: "学校", romaji: "Gakkō" }));
  await waitFor(() => requests.length === 2);
  assert.equal(new URL(requests[1].url).searchParams.get("q"), "今日");
  respond(requests[1], googleBatchResponse({ source: "今日", romaji: "Kyō" }));

  assert.deepEqual(await firstRomanizing, new Map([["学校", "Gakkō"]]));
  assert.deepEqual(await secondRomanizing, new Map([["今日", "Kyō"]]));
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
      const { requests, romanizing } = initializedRomanization(testCase.name === "mixed pinyin and split kana" ? "龘べる" : "山");
      await waitFor(() => requests.length === 1);
      respond(requests[0], googleBatchResponse({ source: "別", romaji: "Betsu" }));
      await waitFor(() => requests.length === 2);
      respond(requests[1], testCase.response);
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
  const requests = [];
  const client = createGoogleKanjiRomajiClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    minimumIntervalMs: 0,
  });
  return { requests, romanizing: client.romanizeWords([word]) };
}

function googleResponse({ source, translation, romaji, language = "ja" }) {
  return JSON.stringify([
    [[translation, source, null, null, 2], [null, null, null, romaji]],
    null,
    language,
  ]);
}

function googleBatchResponse({ source, romaji, language = "ja" }) {
  return JSON.stringify([
    [[source, source, null, null, 2], [null, null, romaji]],
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

function assertSingleWordRequest(request, word) {
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("tl"), "en");
  assert.equal(url.searchParams.get("q"), word);
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
