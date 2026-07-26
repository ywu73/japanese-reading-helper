import assert from "node:assert/strict";
import test from "node:test";

import { installAnnotationControls } from "../../src/controls.js";

test("an unconfigured origin exposes one enable command without starting annotation", async () => {
  const menu = createMenuHarness();
  let enableCount = 0;

  await installAnnotationControls({
    origin: "https://example.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async () => {},
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {},
    showStatus: () => {},
  });

  assert.equal(enableCount, 0);
  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
});

test("a legacy JRR origin preference is not inherited after the identity cutover", async () => {
  const menu = createMenuHarness();
  const stored = new Map([["jrr:auto-origin:https://x.com", true]]);
  let enableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (key, fallback) => stored.get(key) ?? fallback,
    setValue: async (key, value) => stored.set(key, value),
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {},
    showStatus: () => {},
  });

  assert.equal(enableCount, 0);
  assert.equal(stored.has("yomi-ruby:auto-origin:https://x.com"), false);
  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
});

test("enabling automatic annotation persists the origin and starts the current page immediately", async () => {
  const menu = createMenuHarness();
  const stored = new Map();
  let enableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (key, fallback) => stored.get(key) ?? fallback,
    setValue: async (key, value) => stored.set(key, value),
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {},
    showStatus: () => {},
  });

  await menu.invoke("开启本网站自动标注");

  assert.equal(stored.get("yomi-ruby:auto-origin:https://x.com"), true);
  assert.equal(enableCount, 1);
  assert.deepEqual(menu.labels(), ["关闭本网站自动标注"]);
});

test("the menu switches to disable before page initialization finishes", async () => {
  const menu = createMenuHarness();
  const enableGate = deferred();
  let enableStarted = false;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async () => {},
    enable: async () => {
      enableStarted = true;
      await enableGate.promise;
    },
    disable: () => {},
    showStatus: () => {},
  });

  const activation = menu.invoke("开启本网站自动标注");
  await waitFor(() => enableStarted);

  assert.equal(enableStarted, true);
  assert.deepEqual(menu.labels(), ["关闭本网站自动标注"]);

  enableGate.resolve();
  await activation;
});

test("the menu reflects the requested state while persistence is still pending", async () => {
  const menu = createMenuHarness();
  const persistenceGate = deferred();
  let enableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async () => persistenceGate.promise,
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {},
    showStatus: () => {},
  });

  const activation = menu.invoke("开启本网站自动标注");

  assert.deepEqual(menu.labels(), ["关闭本网站自动标注"]);
  assert.equal(enableCount, 0, "annotation waits for successful persistence");

  persistenceGate.resolve();
  await activation;
  assert.equal(enableCount, 1);
});

test("disabling during initialization tears down immediately while persistence is pending", async () => {
  const menu = createMenuHarness();
  const enableGate = deferred();
  const disablePersistenceGate = deferred();
  let disableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async (_key, value) => value ? undefined : disablePersistenceGate.promise,
    enable: async () => enableGate.promise,
    disable: () => {
      disableCount += 1;
    },
    showStatus: () => {},
  });

  const activation = menu.invoke("开启本网站自动标注");
  await Promise.resolve();
  await Promise.resolve();
  const deactivation = menu.invoke("关闭本网站自动标注");

  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
  assert.equal(disableCount, 1);

  disablePersistenceGate.resolve();
  await deactivation;
  enableGate.resolve();
  await activation;
  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
});

test("a failed enable-setting write stays fail closed and restores the enable command", async () => {
  const menu = createMenuHarness();
  const statuses = [];
  let enableCount = 0;
  let disableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async () => {
      throw new Error("storage denied");
    },
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {
      disableCount += 1;
    },
    showStatus: (message, options) => statuses.push({ message, options }),
  });

  await menu.invoke("开启本网站自动标注");

  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
  assert.equal(enableCount, 0);
  assert.equal(disableCount, 1);
  assert.match(statuses.at(-1).message, /无法保存网站自动标注设置/u);
  assert.equal(statuses.at(-1).options.error, true);
});

test("rapid enable then disable leaves persistence and the single menu in the final state", async () => {
  const menu = createMenuHarness();
  const enablePersistenceGate = deferred();
  const disablePersistenceGate = deferred();
  let persisted = false;
  let enableCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (_key, fallback) => fallback,
    setValue: async (_key, value) => {
      await (value ? enablePersistenceGate.promise : disablePersistenceGate.promise);
      persisted = value;
    },
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {},
    showStatus: () => {},
  });

  const enabling = menu.invoke("开启本网站自动标注");
  const disabling = menu.invoke("关闭本网站自动标注");
  disablePersistenceGate.resolve();
  await Promise.resolve();
  enablePersistenceGate.resolve();
  await Promise.all([enabling, disabling]);

  assert.equal(persisted, false);
  assert.equal(enableCount, 0);
  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
});

test("disabling automatic annotation persists the origin and rolls back the current page immediately", async () => {
  const menu = createMenuHarness();
  const stored = new Map([["yomi-ruby:auto-origin:https://x.com", true]]);
  let enableCount = 0;
  let disableCount = 0;
  let statusCount = 0;

  await installAnnotationControls({
    origin: "https://x.com",
    registerMenuCommand: menu.register,
    unregisterMenuCommand: menu.unregister,
    getValue: async (key, fallback) => stored.get(key) ?? fallback,
    setValue: async (key, value) => stored.set(key, value),
    enable: async () => {
      enableCount += 1;
    },
    disable: () => {
      disableCount += 1;
    },
    showStatus: () => {
      statusCount += 1;
    },
  });

  assert.equal(enableCount, 1, "stored automatic mode starts during bootstrap");
  await menu.invoke("关闭本网站自动标注");

  assert.equal(stored.get("yomi-ruby:auto-origin:https://x.com"), false);
  assert.equal(disableCount, 1);
  assert.equal(statusCount, 0, "successful disable leaves no project status UI behind");
  assert.deepEqual(menu.labels(), ["开启本网站自动标注"]);
});

function createMenuHarness() {
  let nextId = 1;
  const commands = new Map();

  return {
    register(label, callback) {
      const id = nextId++;
      commands.set(id, { label, callback });
      return id;
    },
    unregister(id) {
      commands.delete(id);
    },
    labels() {
      return [...commands.values()].map(({ label }) => label);
    },
    async invoke(label) {
      const command = [...commands.values()].find((entry) => entry.label === label);
      assert.ok(command, `Menu command not found: ${label}`);
      await command.callback();
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}
