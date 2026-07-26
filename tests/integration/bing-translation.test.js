import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createBingTranslationClient } from "../../src/bing-translation.js";

const DOMParser = new JSDOM("").window.DOMParser;
const TRANSLATOR_FIXTURE = await readFile(
  new URL("../fixtures/bing-translator.html", import.meta.url),
  "utf8",
);

test("initializes anonymously from the allowed Bing page and sends one exact phrase to ttranslatev3", async () => {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
    now: () => 1_000,
  });

  const translating = client.translatePhrases(["コンピューター", "コンピューター"]);
  await waitFor(() => requests.length === 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].url, "https://www.bing.com/translator");
  assert.equal(requests[0].anonymous, true);
  assert.equal(requests[0].redirect, "follow");
  assert.equal("headers" in requests[0], false);
  assert.equal("data" in requests[0], false);

  requests[0].onload({
    status: 200,
    finalUrl: "https://cn.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 2);

  const post = requests[1];
  const url = new URL(post.url);
  assert.equal(post.method, "POST");
  assert.equal(post.anonymous, true);
  assert.equal(post.redirect, "error");
  assert.equal(url.origin, "https://cn.bing.com");
  assert.equal(url.pathname, "/ttranslatev3");
  assert.deepEqual([...url.searchParams.entries()], [
    ["isVertical", "1"],
    ["IG", "A1B2C3D4E5F6"],
    ["IID", "translator.5023"],
    ["SFX", "1"],
    ["ref", "TThis"],
    ["edgepdftranslator", "1"],
  ]);
  assert.deepEqual(post.headers, {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Referer: "https://cn.bing.com/translator",
  });
  assert.deepEqual([...new URLSearchParams(post.data).entries()], [
    ["fromLang", "ja"],
    ["to", "en"],
    ["text", "コンピューター"],
    ["token", "redacted-page-token"],
    ["key", "123456789"],
    ["tryFetchingGenderDebiasedTranslations", "true"],
  ]);

  respond(post, {
    status: 200,
    responseText: JSON.stringify([{
      translations: [{ text: "Computer", to: "en" }],
      detectedLanguage: { language: "ja" },
    }]),
  });

  assert.deepEqual(await translating, new Map([["コンピューター", "Computer"]]));
});

test("rejects redirects, ambiguous fields, and an IID outside the rich translation container", async (t) => {
  const cases = [
    {
      name: "unapproved host",
      finalUrl: "https://evil.example/translator",
      html: translatorHtml(),
    },
    {
      name: "unapproved path",
      finalUrl: "https://www.bing.com/search",
      html: translatorHtml(),
    },
    {
      name: "missing final URL",
      finalUrl: undefined,
      html: translatorHtml(),
    },
    {
      name: "wrong rich-container IID despite another plausible IID",
      finalUrl: "https://www.bing.com/translator",
      html: translatorHtml({
        iid: "not-a-translator-iid",
        before: '<div id="tta_outGDCont" data-iid="translator.5026"></div>',
      }),
    },
    {
      name: "duplicate IG",
      finalUrl: "https://www.bing.com/translator",
      html: translatorHtml({ after: '<script>window._G.IG = "DUPLICATE123";</script>' }),
    },
    {
      name: "duplicate helper",
      finalUrl: "https://www.bing.com/translator",
      html: translatorHtml({
        after: '<script>params_AbusePreventionHelper = [1,"duplicate",3600000];</script>',
      }),
    },
    {
      name: "oversized token",
      finalUrl: "https://www.bing.com/translator",
      html: translatorHtml({ helper: [123, "x".repeat(2049), 3_600_000] }),
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const requests = [];
      const client = createBingTranslationClient({
        gmRequest(options) {
          requests.push(options);
          return { abort() {} };
        },
        DOMParser,
        minimumIntervalMs: 0,
      });
      const translating = client.translatePhrases(["ゲーム"]);
      await waitFor(() => requests.length === 1);
      requests[0].onload({
        status: 200,
        finalUrl: testCase.finalUrl,
        responseText: testCase.html,
      });

      await assert.rejects(translating, /Bing translator initialization/u);
      assert.equal(requests.length, 1);
    });
  }
});

test("serializes unique eligible phrases and never sends surrounding Japanese text", async () => {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });

  const translating = client.translatePhrases([
    "ゲーム",
    "文章ゲーム周辺",
    "ひらがな",
    "ゲーム",
    "テレビ",
  ]);
  await waitFor(() => requests.length === 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 2);

  assert.equal(new URLSearchParams(requests[1].data).get("text"), "ゲーム");
  assert.equal(requests.length, 2);
  respond(requests[1], {
    status: 200,
    responseText: validTranslation("Game"),
  });
  await waitFor(() => requests.length === 3);
  assert.equal(new URLSearchParams(requests[2].data).get("text"), "テレビ");
  respond(requests[2], {
    status: 200,
    responseText: validTranslation("Television"),
  });

  assert.deepEqual(await translating, new Map([
    ["ゲーム", "Game"],
    ["テレビ", "Television"],
  ]));
});

test("concurrent translation calls share one initialization and serialize their POST requests", async () => {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });

  const first = client.translatePhrases(["ゲーム"]);
  const second = client.translatePhrases(["テレビ"]);
  await waitFor(() => requests.length === 1);
  assert.equal(requests[0].method, "GET");
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 2);
  assert.equal(requests[1].method, "POST");
  respond(requests[1], { status: 200, responseText: validTranslation("Game") });
  await waitFor(() => requests.length === 3);
  assert.equal(requests[2].method, "POST");
  respond(requests[2], { status: 200, responseText: validTranslation("Television") });

  assert.deepEqual(await first, new Map([["ゲーム", "Game"]]));
  assert.deepEqual(await second, new Map([["テレビ", "Television"]]));
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "POST", "POST"]);
});

test("refreshes configuration once and retries only the affected phrase after HTTP 401", async () => {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });

  const translating = client.translatePhrases(["ゲーム"]);
  await waitFor(() => requests.length === 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [111, "first-token", 3_600_000] }),
  });
  await waitFor(() => requests.length === 2);
  respond(requests[1], { status: 401, responseText: "expired" });
  await waitFor(() => requests.length === 3);

  assert.equal(requests[2].method, "GET");
  requests[2].onload({
    status: 200,
    finalUrl: "https://cn.bing.com/translator",
    responseText: translatorHtml({ helper: [222, "second-token", 3_600_000] }),
  });
  await waitFor(() => requests.length === 4);
  assert.equal(new URL(requests[3].url).origin, "https://cn.bing.com");
  assert.equal(new URLSearchParams(requests[3].data).get("token"), "second-token");
  respond(requests[3], { status: 200, responseText: validTranslation("Game") });

  assert.deepEqual(await translating, new Map([["ゲーム", "Game"]]));
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "POST", "GET", "POST"]);
});

test("a second HTTP 401 fails without another refresh or retry", async () => {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const translating = client.translatePhrases(["ゲーム"]);
  await waitFor(() => requests.length === 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 2);
  respond(requests[1], { status: 401 });
  await waitFor(() => requests.length === 3);
  requests[2].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [987, "refreshed-token", 3_600_000] }),
  });
  await waitFor(() => requests.length === 4);
  respond(requests[3], { status: 401 });

  await assert.rejects(translating, /HTTP 401/u);
  assert.equal(requests.length, 4);

  const later = client.translatePhrases(["テレビ"]);
  await waitFor(() => requests.length === 5);
  assert.equal(requests[4].method, "GET", "known-bad refreshed credentials are discarded");
  requests[4].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [654, "later-token", 3_600_000] }),
  });
  await waitFor(() => requests.length === 6);
  respond(requests[5], { status: 200, responseText: validTranslation("Television") });
  assert.deepEqual(await later, new Map([["テレビ", "Television"]]));
});

test("uses the page-declared expiry with refresh skew and conservatively delays serialized phrase traffic", async () => {
  const requests = [];
  const waits = [];
  let clock = 1_000;
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    now: () => clock,
    minimumIntervalMs: 250,
    refreshSkewMs: 60_000,
    async sleep(milliseconds) {
      waits.push(milliseconds);
      clock += milliseconds;
    },
  });

  const first = client.translatePhrases(["ゲーム", "テレビ"]);
  await waitFor(() => requests.length === 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [123, "short-lived", 1_000] }),
  });
  await waitFor(() => requests.length === 2);
  respond(requests[1], { status: 200, responseText: validTranslation("Game") });
  await waitFor(() => requests.length === 3);
  assert.deepEqual(waits, [250]);
  respond(requests[2], { status: 200, responseText: validTranslation("Television") });
  await first;

  clock = 1_900;
  const second = client.translatePhrases(["ラジオ"]);
  await waitFor(() => requests.length === 4);
  assert.equal(requests[3].method, "GET", "expiry minus 10% skew refreshes configuration");
  requests[3].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml({ helper: [456, "fresh", 3_600_000] }),
  });
  await waitFor(() => requests.length === 5);
  respond(requests[4], { status: 200, responseText: validTranslation("Radio") });
  assert.deepEqual(await second, new Map([["ラジオ", "Radio"]]));
});

test("fails closed without retry on 429, CAPTCHA, or an unreliable translation", async (t) => {
  const cases = [
    { name: "HTTP 429", response: { status: 429, responseText: "rate limited" } },
    { name: "CAPTCHA", response: { status: 200, responseText: "ShowCaptcha" } },
    { name: "unchanged", response: { status: 200, responseText: validTranslation("ゲーム") } },
    { name: "non-Latin", response: { status: 200, responseText: validTranslation("电脑") } },
    { name: "wrong target", response: { status: 200, responseText: validTranslation("Juego", { to: "es" }) } },
    { name: "contradictory language", response: { status: 200, responseText: validTranslation("Game", { language: "zh" }) } },
    { name: "duplicate translations", response: { status: 200, responseText: JSON.stringify([{ translations: [{ text: "Game", to: "en" }, { text: "Play", to: "en" }], detectedLanguage: { language: "ja" } }]) } },
    { name: "HTML", response: { status: 200, responseText: "<html>blocked</html>" } },
    { name: "status zero", response: { status: 0, responseText: validTranslation("Game") } },
    { name: "missing status", response: { responseText: validTranslation("Game") } },
    { name: "cross-host redirect", response: { status: 200, finalUrl: "https://cn.bing.com/ttranslatev3", responseText: validTranslation("Game") } },
    { name: "same-host path redirect", response: { status: 200, finalUrl: "https://www.bing.com/translator", responseText: validTranslation("Game") } },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const { requests, translating } = await initializedTranslation();
      respond(requests[1], testCase.response);
      await assert.rejects(translating);
      assert.equal(requests.length, 2);
    });
  }
});

test("fails once on timeout or network error without creating another request", async (t) => {
  for (const failure of ["timeout", "network"]) {
    await t.test(failure, async () => {
      const { requests, translating } = await initializedTranslation();
      if (failure === "timeout") {
        requests[1].ontimeout();
      } else {
        requests[1].onerror({ statusText: "offline" });
      }
      await assert.rejects(translating, failure === "timeout" ? /timed out/u : /offline/u);
      assert.equal(requests.length, 2);
    });
  }
});

test("aborts the active GM request, rejects late results, and allows a later initialization retry", async () => {
  const requests = [];
  let aborts = 0;
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() { aborts += 1; } };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const controller = new AbortController();
  const first = client.translatePhrases(["ゲーム"], { signal: controller.signal });
  await waitFor(() => requests.length === 1);
  controller.abort();

  await assert.rejects(first, { name: "AbortError" });
  assert.equal(aborts, 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });

  const second = client.translatePhrases(["テレビ"]);
  await waitFor(() => requests.length === 2);
  assert.equal(requests[1].method, "GET");
  requests[1].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 3);
  respond(requests[2], { status: 200, responseText: validTranslation("Television") });
  assert.deepEqual(await second, new Map([["テレビ", "Television"]]));
});

async function initializedTranslation() {
  const requests = [];
  const client = createBingTranslationClient({
    gmRequest(options) {
      requests.push(options);
      return { abort() {} };
    },
    DOMParser,
    minimumIntervalMs: 0,
  });
  const translating = client.translatePhrases(["ゲーム"]);
  await waitFor(() => requests.length === 1);
  requests[0].onload({
    status: 200,
    finalUrl: "https://www.bing.com/translator",
    responseText: translatorHtml(),
  });
  await waitFor(() => requests.length === 2);
  return { requests, translating };
}

function validTranslation(text, { to = "en", language = "ja" } = {}) {
  return JSON.stringify([{
    translations: [{ text, to }],
    detectedLanguage: { language },
  }]);
}

function respond(request, response) {
  request.onload({
    ...response,
    finalUrl: response.finalUrl ?? request.url,
  });
}

function translatorHtml({
  ig = "A1B2C3D4E5F6",
  iid = "translator.5023",
  helper = [123456789, "redacted-page-token", 3_600_000],
  before = "",
  after = "",
} = {}) {
  return TRANSLATOR_FIXTURE
    .replace("{{BEFORE}}", before)
    .replace("{{IID}}", iid)
    .replace("{{IG}}", ig)
    .replace("{{HELPER}}", JSON.stringify(helper))
    .replace("{{AFTER}}", after);
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
