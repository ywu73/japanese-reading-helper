import assert from "node:assert/strict";
import test from "node:test";

import { installYomiRubyControls } from "../../src/controls.js";
import { createLocalizer } from "../../src/i18n.js";

test("an unconfigured origin exposes independent kanji and katakana commands without starting either module", async () => {
  const harness = createControlsHarness();
  await harness.install();

  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "Enable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
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
    "Disable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
  ]);
  assert.equal(harness.stored.has("yomi-ruby:katakana-origin:https://x.com"), false);
});

test("one katakana menu click persists and starts the online feature without a confirmation gate", async () => {
  const events = [];
  const harness = createControlsHarness({ events });
  await harness.install();

  await harness.menu.invoke("Enable Online Katakana English on this site");

  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), true);
  assert.deepEqual(events, ["persist:katakana:true", "enable:katakana"]);
  assert.ok(harness.menu.labels().includes("Disable Online Katakana English on this site"));
});

test("language switching persists globally and immediately re-registers all menus without touching features", async () => {
  const events = [];
  const harness = createControlsHarness({ events });
  await harness.install();

  await harness.menu.invoke("语言 / Language: 切换到简体中文");

  assert.equal(harness.stored.get("yomi-ruby:locale"), "zh");
  assert.deepEqual(events, ["persist:locale:zh"]);
  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.stops, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "开启本网站汉字罗马音",
    "汉字罗马音模式：Google（切换到Bing）",
    "开启本网站联网片假名英文",
    "片假名翻译服务：Google（切换到 Bing）",
    "语言 / Language: Switch to English",
  ]);
});

test("a first-run locale persistence failure keeps deterministic localized menus and shows one actionable error", async () => {
  const localePersistenceError = new Error("storage denied");
  const harness = createControlsHarness({ locale: "zh", localePersistenceError });
  await harness.install();

  assert.deepEqual(harness.menu.labels(), [
    "开启本网站汉字罗马音",
    "汉字罗马音模式：Bing（切换到本地字典）",
    "开启本网站联网片假名英文",
    "片假名翻译服务：Google（切换到 Bing）",
    "语言 / Language: Switch to English",
  ]);
  assert.deepEqual(harness.statuses, [{
    message: "无法保存语言设置：storage denied",
    options: { duration: 9000, error: true },
  }]);
});

test("provider initialization errors are localized without starting either feature", async () => {
  const readError = new Error("storage unavailable");
  const harness = createControlsHarness({
    locale: "zh",
    translationProvider: "bing",
    translationProviderReadError: readError,
  });
  await harness.install();

  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.statuses, [{
    message: "无法读取片假名翻译服务设置，本页使用语言对应的默认服务：storage unavailable",
    options: { duration: 9000, error: true },
  }]);
  assert.ok(harness.menu.labels().includes("片假名翻译服务：Bing（切换到 Google）"));
});

test("rapid language switches converge on the final requested locale without changing feature state", async () => {
  const firstWrite = deferred();
  const secondWrite = deferred();
  let localeWrites = 0;
  const harness = createControlsHarness({
    setValue: async (key, value) => {
      if (key === "yomi-ruby:locale") {
        localeWrites += 1;
        await (localeWrites === 1 ? firstWrite.promise : secondWrite.promise);
      }
      harness.stored.set(key, value);
    },
  });
  await harness.install();

  const switchingToZh = harness.menu.invoke("语言 / Language: 切换到简体中文");
  const switchingBackToEn = harness.menu.invoke("语言 / Language: 切换到简体中文");

  firstWrite.resolve();
  await Promise.resolve();
  secondWrite.resolve();
  await Promise.all([switchingToZh, switchingBackToEn]);

  assert.equal(harness.stored.get("yomi-ruby:locale"), "en");
  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.stops, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "Enable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
  ]);
});

test("a failed manual language write restores the persisted locale and reports one localized error", async () => {
  const harness = createControlsHarness({
    setValue: async () => { throw new Error("storage denied"); },
  });
  await harness.install();

  await harness.menu.invoke("语言 / Language: 切换到简体中文");

  assert.deepEqual(harness.menu.labels(), [
    "Enable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
  ]);
  assert.deepEqual(harness.statuses, [{
    message: "Could not save the language setting: storage denied",
    options: { duration: 9000, error: true },
  }]);
});

test("a failed katakana enable write stays fail closed and restores its enable command", async () => {
  const harness = createControlsHarness({
    setValue: async () => { throw new Error("storage denied"); },
  });
  await harness.install();

  await harness.menu.invoke("Enable Online Katakana English on this site");

  assert.equal(harness.starts.katakana, 0);
  assert.equal(harness.stops.katakana, 0);
  assert.ok(harness.menu.labels().includes("Enable Online Katakana English on this site"));
  assert.equal(
    harness.statuses.at(-1).message,
    "Could not save the Online Katakana English setting: storage denied. The feature remains disabled.",
  );
  assert.equal(harness.statuses.at(-1).options.error, true);
});

test("a feature setting read failure keeps that feature off and still exposes all controls", async () => {
  const harness = createControlsHarness({
    getValue: async (key, fallback) => {
      if (key.includes("katakana")) {
        throw new Error("storage unavailable");
      }
      return fallback;
    },
  });

  await harness.install();

  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "Enable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
  ]);
  assert.deepEqual(harness.statuses, [{
    message: "Could not read the Online Katakana English setting. The feature remains disabled: storage unavailable",
    options: { duration: 9000, error: true },
  }]);
});

test("disabling one stored feature leaves the other active and changes only its own exact-origin setting", async () => {
  const harness = createControlsHarness({
    stored: new Map([
      ["yomi-ruby:auto-origin:https://x.com", true],
      ["yomi-ruby:katakana-origin:https://x.com", true],
    ]),
  });
  await harness.install();

  await harness.menu.invoke("Disable Online Katakana English on this site");

  assert.deepEqual(harness.starts, { kanji: 1, katakana: 1 });
  assert.deepEqual(harness.stops, { kanji: 0, katakana: 1 });
  assert.equal(harness.stored.get("yomi-ruby:auto-origin:https://x.com"), true);
  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), false);
  assert.deepEqual(harness.menu.labels(), [
    "Disable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Google (switch to Bing)",
    "语言 / Language: 切换到简体中文",
  ]);
});

test("rapid katakana enable then disable leaves persistence and runtime in the final off state", async () => {
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

  const enabling = harness.menu.invoke("Enable Online Katakana English on this site");
  const disabling = harness.menu.invoke("Enable Online Katakana English on this site");
  enableGate.resolve();
  await Promise.resolve();
  disableGate.resolve();
  await Promise.all([enabling, disabling]);

  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), false);
  assert.equal(harness.starts.katakana, 0);
  assert.equal(harness.stops.katakana, 1);
  assert.ok(harness.menu.labels().includes("Enable Online Katakana English on this site"));
});

test("rapid katakana enable, disable, and enable converges on the final on state", async () => {
  const gates = [deferred(), deferred(), deferred()];
  let writes = 0;
  const harness = createControlsHarness({
    setValue: async (key, value) => {
      const gate = gates[writes];
      writes += 1;
      await gate.promise;
      harness.stored.set(key, value);
    },
  });
  await harness.install();

  const firstEnable = harness.menu.invoke("Enable Online Katakana English on this site");
  const disable = harness.menu.invoke("Enable Online Katakana English on this site");
  const finalEnable = harness.menu.invoke("Enable Online Katakana English on this site");

  gates[0].resolve();
  await waitFor(() => writes === 2);
  gates[1].resolve();
  await waitFor(() => writes === 3);
  gates[2].resolve();
  await Promise.all([firstEnable, disable, finalEnable]);

  assert.equal(harness.stored.get("yomi-ruby:katakana-origin:https://x.com"), true);
  assert.equal(harness.starts.katakana, 1);
  assert.equal(harness.stops.katakana, 0);
  assert.ok(harness.menu.labels().includes("Disable Online Katakana English on this site"));
});

test("feature and language operations interleave through one queue and converge on the final requests", async () => {
  const gates = [deferred(), deferred(), deferred()];
  const writes = [];
  const harness = createControlsHarness({
    setValue: async (key, value) => {
      const index = writes.length;
      writes.push([key, value]);
      await gates[index].promise;
      harness.stored.set(key, value);
    },
  });
  await harness.install();

  const enabling = harness.menu.invoke("Enable Online Katakana English on this site");
  const switching = harness.menu.invoke("语言 / Language: 切换到简体中文");
  const disabling = harness.menu.invoke("Enable Online Katakana English on this site");

  gates[0].resolve();
  await waitFor(() => writes.length === 2);
  gates[1].resolve();
  await waitFor(() => writes.length === 3);
  gates[2].resolve();
  await Promise.all([enabling, switching, disabling]);

  assert.deepEqual(writes, [
    ["yomi-ruby:katakana-origin:https://x.com", true],
    ["yomi-ruby:locale", "zh"],
    ["yomi-ruby:katakana-origin:https://x.com", false],
  ]);
  assert.equal(harness.starts.katakana, 0);
  assert.equal(harness.stops.katakana, 1);
  assert.deepEqual(harness.menu.labels(), [
    "开启本网站汉字罗马音",
    "汉字罗马音模式：Google（切换到Bing）",
    "开启本网站联网片假名英文",
    "片假名翻译服务：Google（切换到 Bing）",
    "语言 / Language: Switch to English",
  ]);
});

test("provider switching persists before replacing the translator and stays inert while katakana is off", async () => {
  const events = [];
  const harness = createControlsHarness({ events });
  await harness.install();

  await harness.menu.invoke("Katakana Translator: Google (switch to Bing)");

  assert.equal(harness.stored.get("yomi-ruby:translation-provider"), "bing");
  assert.deepEqual(events, ["persist:provider:bing", "translator:bing"]);
  assert.deepEqual(harness.starts, { kanji: 0, katakana: 0 });
  assert.deepEqual(harness.menu.labels(), [
    "Enable Kanji Romaji on this site",
    "Kanji Romaji: Google (switch to Local Dictionary)",
    "Enable Online Katakana English on this site",
    "Katakana Translator: Bing (switch to Google)",
    "语言 / Language: 切换到简体中文",
  ]);
});

test("kanji mode switching follows the current locale cycle and persists before replacement", async () => {
  const events = [];
  const harness = createControlsHarness({ events });
  await harness.install();

  await harness.menu.invoke("Kanji Romaji: Google (switch to Local Dictionary)");
  assert.equal(harness.stored.get("yomi-ruby:kanji-romaji-mode"), "local");
  assert.deepEqual(harness.kanjiModeSwitches, ["local"]);
  assert.deepEqual(events, ["persist:kanji-mode:local", "kanji-mode:local"]);

  await harness.menu.invoke("语言 / Language: 切换到简体中文");
  assert.ok(harness.menu.labels().includes("汉字罗马音模式：本地字典（切换到Google）"));
});

test("remote global mode changes replace only their matching active path without write loops", async () => {
  const harness = createControlsHarness();
  await harness.install();

  await harness.emitRemote("yomi-ruby:kanji-romaji-mode", "bing");
  await harness.emitRemote("yomi-ruby:translation-provider", "bing");

  assert.deepEqual(harness.kanjiModeSwitches, ["bing"]);
  assert.deepEqual(harness.providerSwitches, ["bing"]);
  assert.equal(harness.stored.has("yomi-ruby:kanji-romaji-mode"), false);
  assert.equal(harness.stored.has("yomi-ruby:translation-provider"), false);
  assert.ok(harness.menu.labels().includes("Kanji Romaji: Bing (switch to Google)"));
  assert.ok(harness.menu.labels().includes("Katakana Translator: Bing (switch to Google)"));
});

test("a failed provider write restores the persisted provider and never replaces the translator", async () => {
  const harness = createControlsHarness({
    setValue: async (key) => {
      if (key === "yomi-ruby:translation-provider") {
        throw new Error("storage denied");
      }
    },
  });
  await harness.install();

  await harness.menu.invoke("Katakana Translator: Google (switch to Bing)");

  assert.deepEqual(harness.providerSwitches, []);
  assert.ok(harness.menu.labels().includes("Katakana Translator: Google (switch to Bing)"));
  assert.equal(
    harness.statuses.at(-1).message,
    "Could not save the translation provider: storage denied. The previous provider remains active.",
  );
});

test("rapid provider switches converge on the final persisted provider without stale replacement", async () => {
  const gates = [deferred(), deferred(), deferred()];
  const writes = [];
  const harness = createControlsHarness({
    setValue: async (key, value) => {
      const index = writes.length;
      writes.push([key, value]);
      await gates[index].promise;
      harness.stored.set(key, value);
    },
  });
  await harness.install();

  const toBing = harness.menu.invoke("Katakana Translator: Google (switch to Bing)");
  const toGoogle = harness.menu.invoke("Katakana Translator: Google (switch to Bing)");
  const finalBing = harness.menu.invoke("Katakana Translator: Google (switch to Bing)");
  assert.ok(
    harness.menu.labels().includes("Katakana Translator: Google (switch to Bing)"),
    "the menu continues to show the persisted provider while writes are pending",
  );

  gates[0].resolve();
  await waitFor(() => writes.length === 2);
  gates[1].resolve();
  await waitFor(() => writes.length === 3);
  gates[2].resolve();
  await Promise.all([toBing, toGoogle, finalBing]);

  assert.deepEqual(writes, [
    ["yomi-ruby:translation-provider", "bing"],
    ["yomi-ruby:translation-provider", "google"],
    ["yomi-ruby:translation-provider", "bing"],
  ]);
  assert.equal(harness.stored.get("yomi-ruby:translation-provider"), "bing");
  assert.deepEqual(harness.providerSwitches, ["bing"]);
});

function createControlsHarness({
  stored = new Map(),
  getValue,
  setValue,
  events = [],
  locale = "en",
  localePersistenceError = null,
  translationProvider = "google",
  translationProviderReadError = null,
  translationProviderPersistenceError = null,
  kanjiRomajiMode = locale === "zh" ? "bing" : "google",
  kanjiRomajiModeReadError = null,
  kanjiRomajiModePersistenceError = null,
} = {}) {
  const menu = createMenuHarness();
  const starts = { kanji: 0, katakana: 0 };
  const stops = { kanji: 0, katakana: 0 };
  const statuses = [];
  const providerSwitches = [];
  const kanjiModeSwitches = [];
  const valueListeners = new Map();
  let nextListenerId = 1;
  const harness = {
    menu,
    stored,
    starts,
    stops,
    statuses,
    providerSwitches,
    kanjiModeSwitches,
    async emitRemote(key, value) {
      const callbacks = [...valueListeners.values()].filter((listener) => listener.key === key);
      await Promise.all(callbacks.map(({ callback }) => callback(key, undefined, value, true)));
    },
    async install() {
      await installYomiRubyControls({
        origin: "https://x.com",
        registerMenuCommand: menu.register,
        unregisterMenuCommand: menu.unregister,
        getValue: getValue ?? (async (key, fallback) => stored.get(key) ?? fallback),
        setValue: setValue ?? (async (key, value) => {
          stored.set(key, value);
          const setting = key === "yomi-ruby:locale"
            ? "locale"
            : key === "yomi-ruby:translation-provider" ? "provider"
            : key === "yomi-ruby:kanji-romaji-mode" ? "kanji-mode"
            : key.includes("katakana") ? "katakana" : "kanji";
          events.push(`persist:${setting}:${value}`);
        }),
        addValueChangeListener(key, callback) {
          const id = nextListenerId++;
          valueListeners.set(id, { key, callback });
          return id;
        },
        removeValueChangeListener(id) {
          valueListeners.delete(id);
        },
        localizer: createLocalizer(locale),
        localePersistenceError,
        kanjiRomajiMode,
        kanjiRomajiModeReadError,
        kanjiRomajiModePersistenceError,
        translationProvider,
        translationProviderReadError,
        translationProviderPersistenceError,
        kanji: {
          ...featureSession("kanji", starts, stops, events),
          async setMode(mode) {
            kanjiModeSwitches.push(mode);
            events.push(`kanji-mode:${mode}`);
          },
        },
        katakana: {
          ...featureSession("katakana", starts, stops, events),
          async setProvider(provider) {
            providerSwitches.push(provider);
            events.push(`translator:${provider}`);
          },
        },
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
