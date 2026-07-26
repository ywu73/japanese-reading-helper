import assert from "node:assert/strict";
import test from "node:test";

import { installYomiRubyControls } from "../../src/controls.js";

test("an unconfigured origin exposes independent kanji and katakana commands without starting either module", async () => {
  const harness = createControlsHarness();
  await harness.install();

  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "开启本网站汉字罗马音",
    "开启本网站片假名英文",
  ]);
});

test("the 0.1.4 origin setting enables only kanji and legacy JRR state remains ignored", async () => {
  const harness = createControlsHarness({
    stored: new Map([
      ["yomi-ruby:auto-origin:https://x.com", true],
      ["jrr:auto-origin:https://x.com", true],
    ]),
  });
  await harness.install();

  assert.deepEqual(harness.starts, { kanji: 1, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "关闭本网站汉字罗马音",
    "开启本网站片假名英文",
  ]);
  assert.equal(harness.stored.has("yomi-ruby:katakana-origin:https://x.com"), false);
});

test("cancelling first-use katakana consent neither persists nor starts the network feature", async () => {
  const confirmations = [];
  const harness = createControlsHarness({
    confirmKatakana(message) {
      confirmations.push(message);
      return false;
    },
  });
  await harness.install();

  await harness.menu.invoke("开启本网站片假名英文");

  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /片假名词组.*Google Translate/su);
  assert.match(confirmations[0], /不会发送完整句子、页面标题或网页 URL/u);
  assert.equal(harness.stored.has("yomi-ruby:katakana-origin:https://x.com"), false);
  assert.equal(harness.starts.katakana, 0);
  assert.ok(harness.menu.labels().includes("开启本网站片假名英文"));
});

test("confirmed katakana consent is persisted before the current page starts translating", async () => {
  const events = [];
  const harness = createControlsHarness({ events });
  await harness.install();

  await harness.menu.invoke("开启本网站片假名英文");

  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), true);
  assert.deepEqual(events, ["confirm", "persist:katakana:true", "enable:katakana"]);
  assert.ok(harness.menu.labels().includes("关闭本网站片假名英文"));
});

test("a failed katakana enable write stays fail closed and restores its enable command", async () => {
  const harness = createControlsHarness({
    setValue: async () => { throw new Error("storage denied"); },
  });
  await harness.install();

  await harness.menu.invoke("开启本网站片假名英文");

  assert.equal(harness.starts.katakana, 0);
  assert.equal(harness.stops.katakana, 1);
  assert.ok(harness.menu.labels().includes("开启本网站片假名英文"));
  assert.match(harness.statuses.at(-1).message, /功能保持关闭/u);
  assert.equal(harness.statuses.at(-1).options.error, true);
});

test("disabling one stored feature leaves the other active and changes only its own exact-origin setting", async () => {
  const harness = createControlsHarness({
    stored: new Map([
      ["yomi-ruby:auto-origin:https://x.com", true],
      ["yomi-ruby:katakana-origin:https://x.com", true],
    ]),
  });
  await harness.install();

  await harness.menu.invoke("关闭本网站片假名英文");

  assert.deepEqual(harness.starts, { kanji: 1, katakana: 1 });
  assert.deepEqual(harness.stops, { kanji: 0, katakana: 1 });
  assert.equal(harness.stored.get("yomi-ruby:auto-origin:https://x.com"), true);
  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), false);
  assert.deepEqual(harness.menu.labels(), [
    "关闭本网站汉字罗马音",
    "开启本网站片假名英文",
  ]);
});

test("rapid confirmed katakana enable then disable leaves persistence and runtime in the final off state", async () => {
  const enableGate = deferred();
  const disableGate = deferred();
  const harness = createControlsHarness({
    setValue: async (key, value) => {
      if (key.includes("katakana")) {
        await (value ? enableGate.promise : disableGate.promise);
      }
      harness.stored.set(key, value);
    },
  });
  await harness.install();

  const enabling = harness.menu.invoke("开启本网站片假名英文");
  await waitFor(() => harness.menu.labels().includes("关闭本网站片假名英文"));
  const disabling = harness.menu.invoke("关闭本网站片假名英文");
  enableGate.resolve();
  await Promise.resolve();
  disableGate.resolve();
  await Promise.all([enabling, disabling]);

  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), false);
  assert.equal(harness.starts.katakana, 0);
  assert.equal(harness.stops.katakana, 1);
  assert.ok(harness.menu.labels().includes("开启本网站片假名英文"));
});

function createControlsHarness({
  stored = new Map(),
  confirmKatakana,
  setValue,
  events = [],
} = {}) {
  const menu = createMenuHarness();
  const starts = { kanji: 0, katakana: 0 };
  const stops = { kanji: 0, katakana: 0 };
  const statuses = [];
  const harness = {
    menu,
    stored,
    starts,
    stops,
    statuses,
    async install() {
      await installYomiRubyControls({
        origin: "https://x.com",
        registerMenuCommand: menu.register,
        unregisterMenuCommand: menu.unregister,
        getValue: async (key, fallback) => stored.get(key) ?? fallback,
        setValue: setValue ?? (async (key, value) => {
          stored.set(key, value);
          events.push(`persist:${key.includes("katakana") ? "katakana" : "kanji"}:${value}`);
        }),
        confirmKatakana: confirmKatakana ?? (() => {
          events.push("confirm");
          return true;
        }),
        kanji: featureSession("kanji", starts, stops, events),
        katakana: featureSession("katakana", starts, stops, events),
        showStatus: (message, options) => statuses.push({ message, options }),
      });
    },
  };
  return harness;
}

function featureSession(feature, starts, stops, events) {
  return {
    async enable() {
      starts[feature] += 1;
      events.push(`enable:${feature}`);
    },
    disable() {
      stops[feature] += 1;
      events.push(`disable:${feature}`);
    },
  };
}

function createMenuHarness() {
  let nextId = 1;
  const commands = new Map();
  return {
    register(label, callback) {
      const id = nextId++;
      commands.set(id, { label, callback });
      return id;
    },
    unregister(id) { commands.delete(id); },
    labels() { return [...commands.values()].map(({ label }) => label); },
    async invoke(label) {
      const command = [...commands.values()].find((entry) => entry.label === label);
      assert.ok(command, `Menu command not found: ${label}`);
      await command.callback();
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
