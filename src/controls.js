import {
  getFeatureEnabledForOrigin,
  setFeatureEnabledForOrigin,
} from "./settings.js";

const KATAKANA_CONSENT_MESSAGE = [
  "开启后，YomiRuby 会把检测到的片假名词组发送给 Google Translate，",
  "用于显示片假名英文标注。不会发送完整句子、页面标题或网页 URL。",
  "是否允许当前网站使用此联网功能？",
].join("\n");

export async function installYomiRubyControls({
  origin,
  registerMenuCommand,
  unregisterMenuCommand,
  getValue,
  setValue,
  confirmKatakana,
  kanji,
  katakana,
  showStatus,
}) {
  const persistence = createPersistenceQueue();
  const definitions = [
    {
      feature: "kanji",
      label: "汉字罗马音",
      session: kanji,
    },
    {
      feature: "katakana",
      label: "片假名英文",
      session: katakana,
      confirmEnable: () => confirmKatakana(KATAKANA_CONSENT_MESSAGE),
    },
  ];

  const controls = [];
  for (const definition of definitions) {
    const enabled = await getFeatureEnabledForOrigin(getValue, definition.feature, origin);
    controls.push(createFeatureControl({
      ...definition,
      enabled,
      origin,
      registerMenuCommand,
      unregisterMenuCommand,
      persist: (nextEnabled) => persistence.enqueue(() => setFeatureEnabledForOrigin(
        setValue,
        definition.feature,
        nextEnabled,
        origin,
      )),
      showStatus,
    }));
  }

  for (const control of controls) {
    control.register();
  }
  for (const control of controls) {
    control.startIfEnabled();
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function createPersistenceQueue() {
  let queue = Promise.resolve();
  return {
    enqueue(write) {
      const result = queue.then(write);
      queue = result.catch(() => {});
      return result;
    },
  };
}

function createFeatureControl({
  feature,
  label,
  session,
  enabled: initialEnabled,
  registerMenuCommand,
  unregisterMenuCommand,
  persist,
  confirmEnable,
  showStatus,
}) {
  if (!session || typeof session.enable !== "function" || typeof session.disable !== "function") {
    throw new TypeError(`The ${feature} feature requires enable and disable functions.`);
  }

  let enabled = initialEnabled;
  let menuId = null;
  let operation = 0;

  const register = () => {
    if (menuId != null) {
      unregisterMenuCommand(menuId);
    }
    menuId = registerMenuCommand(`${enabled ? "关闭" : "开启"}本网站${label}`, async () => {
      const requestedEnabled = !enabled;
      if (requestedEnabled && confirmEnable) {
        let confirmed = false;
        try {
          confirmed = Boolean(await confirmEnable());
        } catch (error) {
          showStatus(`无法确认${label}联网授权：${errorMessage(error)}`, {
            duration: 9000,
            error: true,
          });
          return;
        }
        if (!confirmed) {
          return;
        }
      }

      const requestOperation = ++operation;
      enabled = requestedEnabled;
      register();
      if (!requestedEnabled) {
        session.disable();
      }

      try {
        await persist(requestedEnabled);
      } catch (error) {
        if (requestOperation === operation) {
          enabled = false;
          register();
          session.disable();
          const suffix = requestedEnabled
            ? "功能保持关闭。"
            : "本页已关闭，但刷新后可能再次启用。";
          showStatus(`无法保存本网站${label}设置：${errorMessage(error)}。${suffix}`, {
            duration: 9000,
            error: true,
          });
        }
        return;
      }

      if (requestOperation === operation && enabled === requestedEnabled && requestedEnabled) {
        await session.enable();
      }
    });
  };

  return {
    register,
    startIfEnabled() {
      if (enabled) {
        void session.enable();
      }
    },
  };
}
