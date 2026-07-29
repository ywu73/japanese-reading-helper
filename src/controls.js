import {
  getFeatureEnabledForOrigin,
  isSupportedKanjiRomajiMode,
  isSupportedTranslationProvider,
  setFeatureEnabledForOrigin,
  setStoredKanjiRomajiMode,
  setStoredLocale,
  setStoredTranslationProvider,
  KANJI_ROMAJI_MODE_SETTING_KEY,
  TRANSLATION_PROVIDER_SETTING_KEY,
} from "./settings.js";

export async function installYomiRubyControls({
  origin,
  registerMenuCommand,
  unregisterMenuCommand,
  getValue,
  setValue,
  addValueChangeListener = null,
  removeValueChangeListener = null,
  localizer,
  localePersistenceError = null,
  kanjiRomajiMode,
  kanjiRomajiModeReadError = null,
  kanjiRomajiModePersistenceError = null,
  translationProvider,
  translationProviderReadError = null,
  translationProviderPersistenceError = null,
  kanji,
  katakana,
  showStatus,
}) {
  const persistence = {
    kanjiFeature: createPersistenceQueue(),
    katakanaFeature: createPersistenceQueue(),
    kanjiMode: createPersistenceQueue(),
    provider: createPersistenceQueue(),
    locale: createPersistenceQueue(),
  };
  const definitions = [
    {
      feature: "kanji",
      menuKey: "Kanji",
      session: kanji,
    },
    {
      feature: "katakana",
      menuKey: "Katakana",
      session: katakana,
    },
  ];

  let refreshMenus = () => {};
  const controls = [];
  const featureReadErrors = [];
  for (const definition of definitions) {
    let enabled = false;
    try {
      enabled = await getFeatureEnabledForOrigin(getValue, definition.feature, origin);
    } catch (error) {
      featureReadErrors.push({ feature: definition.feature, error });
    }
    controls.push(createFeatureControl({
      ...definition,
      enabled,
      origin,
      registerMenuCommand,
      unregisterMenuCommand,
      persist: (nextEnabled) => persistence[`${definition.feature}Feature`].enqueue(() => setFeatureEnabledForOrigin(
        setValue,
        definition.feature,
        nextEnabled,
        origin,
      )),
      showStatus,
      localizer,
      refreshMenus: () => refreshMenus(),
    }));
  }

  let languageMenuId = null;
  let kanjiModeMenuId = null;
  let kanjiModeOperation = 0;
  let currentKanjiMode = kanjiRomajiMode;
  let persistedKanjiMode = kanjiRomajiMode;
  let desiredKanjiMode = kanjiRomajiMode;
  const registerKanjiMode = () => {
    if (kanjiModeMenuId != null) {
      unregisterMenuCommand(kanjiModeMenuId);
    }
    const nextMode = nextKanjiMode(currentKanjiMode, localizer.getLocale());
    kanjiModeMenuId = registerMenuCommand(
      localizer.t("menu.kanjiRomajiMode", { mode: currentKanjiMode, nextMode }),
      async () => {
        const requestedMode = nextKanjiMode(desiredKanjiMode, localizer.getLocale());
        desiredKanjiMode = requestedMode;
        const requestOperation = ++kanjiModeOperation;
        try {
          await persistence.kanjiMode.enqueue(() => setStoredKanjiRomajiMode(setValue, requestedMode));
        } catch (error) {
          if (requestOperation === kanjiModeOperation) {
            desiredKanjiMode = persistedKanjiMode;
            showStatus(localizer.t("error.kanjiRomajiModePersistence", {
              error: errorMessage(error),
            }), {
              duration: 9000,
              error: true,
            });
          }
          return;
        }
        persistedKanjiMode = requestedMode;
        if (requestOperation === kanjiModeOperation) {
          currentKanjiMode = requestedMode;
          desiredKanjiMode = requestedMode;
          refreshMenus();
          await kanji.setMode(requestedMode);
        }
      },
    );
  };
  let providerMenuId = null;
  let providerOperation = 0;
  let currentProvider = translationProvider;
  let persistedProvider = translationProvider;
  let desiredProvider = translationProvider;
  const registerProvider = () => {
    if (providerMenuId != null) {
      unregisterMenuCommand(providerMenuId);
    }
    const nextProvider = currentProvider === "bing" ? "google" : "bing";
    providerMenuId = registerMenuCommand(
      localizer.t("menu.translationProvider", { provider: currentProvider, nextProvider }),
      async () => {
        const requestedProvider = desiredProvider === "bing" ? "google" : "bing";
        desiredProvider = requestedProvider;
        const requestOperation = ++providerOperation;
        try {
          await persistence.provider.enqueue(() => setStoredTranslationProvider(setValue, requestedProvider));
        } catch (error) {
          if (requestOperation === providerOperation) {
            desiredProvider = persistedProvider;
            showStatus(localizer.t("error.translationProviderPersistence", {
              error: errorMessage(error),
            }), {
              duration: 9000,
              error: true,
            });
          }
          return;
        }
        persistedProvider = requestedProvider;
        if (requestOperation === providerOperation) {
          currentProvider = requestedProvider;
          desiredProvider = requestedProvider;
          refreshMenus();
          await katakana.setProvider(requestedProvider);
        }
      },
    );
  };
  let languageOperation = 0;
  let persistedLocale = localizer.getLocale();
  let desiredLocale = persistedLocale;
  const registerLanguage = () => {
    if (languageMenuId != null) {
      unregisterMenuCommand(languageMenuId);
    }
    languageMenuId = registerMenuCommand(localizer.t("menu.language"), async () => {
      const requestOperation = ++languageOperation;
      const nextLocale = desiredLocale === "zh" ? "en" : "zh";
      desiredLocale = nextLocale;
      try {
        await persistence.locale.enqueue(() => setStoredLocale(setValue, nextLocale));
      } catch (error) {
        if (requestOperation === languageOperation) {
          desiredLocale = persistedLocale;
          showStatus(localizer.t("error.localePersistence", { error: errorMessage(error) }), {
            duration: 9000,
            error: true,
          });
        }
        return;
      }
      persistedLocale = nextLocale;
      if (requestOperation === languageOperation) {
        localizer.setLocale(nextLocale);
        desiredLocale = nextLocale;
        refreshMenus();
      }
    });
  };
  refreshMenus = () => {
    controls[0].register();
    registerKanjiMode();
    controls[1].register();
    registerProvider();
    registerLanguage();
  };
  refreshMenus();
  if (localePersistenceError) {
    showStatus(localizer.t("error.localePersistence", {
      error: errorMessage(localePersistenceError),
    }), {
      duration: 9000,
      error: true,
    });
  }
  if (translationProviderPersistenceError) {
    showStatus(localizer.t("error.translationProviderPersistence", {
      error: errorMessage(translationProviderPersistenceError),
    }), {
      duration: 9000,
      error: true,
    });
  }
  if (translationProviderReadError) {
    showStatus(localizer.t("error.translationProviderRead", {
      error: errorMessage(translationProviderReadError),
    }), {
      duration: 9000,
      error: true,
    });
  }
  if (kanjiRomajiModePersistenceError) {
    showStatus(localizer.t("error.kanjiRomajiModePersistence", {
      error: errorMessage(kanjiRomajiModePersistenceError),
    }), {
      duration: 9000,
      error: true,
    });
  }
  if (kanjiRomajiModeReadError) {
    showStatus(localizer.t("error.kanjiRomajiModeRead", {
      error: errorMessage(kanjiRomajiModeReadError),
    }), {
      duration: 9000,
      error: true,
    });
  }
  for (const { feature, error } of featureReadErrors) {
    showStatus(localizer.t(`error.${feature}ReadPersistence`, {
      error: errorMessage(error),
    }), {
      duration: 9000,
      error: true,
    });
  }
  for (const control of controls) {
    control.startIfEnabled();
  }

  const listenerIds = [];
  if (typeof addValueChangeListener === "function") {
    listenerIds.push(addValueChangeListener(
      KANJI_ROMAJI_MODE_SETTING_KEY,
      async (_key, _oldValue, nextMode, remote) => {
        if (remote !== true || !isSupportedKanjiRomajiMode(nextMode)) {
          return;
        }
        kanjiModeOperation += 1;
        currentKanjiMode = nextMode;
        persistedKanjiMode = nextMode;
        desiredKanjiMode = nextMode;
        refreshMenus();
        await kanji.setMode(nextMode);
      },
    ));
    listenerIds.push(addValueChangeListener(
      TRANSLATION_PROVIDER_SETTING_KEY,
      async (_key, _oldValue, nextProvider, remote) => {
        if (remote !== true || !isSupportedTranslationProvider(nextProvider)) {
          return;
        }
        providerOperation += 1;
        currentProvider = nextProvider;
        persistedProvider = nextProvider;
        desiredProvider = nextProvider;
        refreshMenus();
        await katakana.setProvider(nextProvider);
      },
    ));
  }
  return {
    dispose() {
      if (typeof removeValueChangeListener === "function") {
        for (const listenerId of listenerIds) {
          removeValueChangeListener(listenerId);
        }
      }
    },
  };
}

function nextKanjiMode(mode, locale) {
  const order = locale === "zh"
    ? ["bing", "local", "google"]
    : ["google", "local", "bing"];
  const index = order.indexOf(mode);
  return order[(index < 0 ? 0 : index + 1) % order.length];
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
  menuKey,
  session,
  enabled: initialEnabled,
  registerMenuCommand,
  unregisterMenuCommand,
  persist,
  showStatus,
  localizer,
  refreshMenus,
}) {
  if (!session || typeof session.enable !== "function" || typeof session.disable !== "function") {
    throw new TypeError(`The ${feature} feature requires enable and disable functions.`);
  }

  let enabled = initialEnabled;
  let desiredEnabled = initialEnabled;
  let menuId = null;
  let operation = 0;

  const register = () => {
    if (menuId != null) {
      unregisterMenuCommand(menuId);
    }
    menuId = registerMenuCommand(localizer.t(`menu.${enabled ? "disable" : "enable"}${menuKey}`), async () => {
      const requestedEnabled = !desiredEnabled;
      desiredEnabled = requestedEnabled;
      const requestOperation = ++operation;
      try {
        await persist(requestedEnabled);
      } catch (error) {
        if (requestOperation === operation) {
          desiredEnabled = enabled;
          showStatus(localizer.t(
            `error.${feature}${requestedEnabled ? "Enable" : "Disable"}Persistence`,
            { error: errorMessage(error) },
          ), {
            duration: 9000,
            error: true,
          });
        }
        return;
      }

      if (requestOperation === operation) {
        enabled = requestedEnabled;
        desiredEnabled = requestedEnabled;
        refreshMenus();
        if (requestedEnabled) {
          await session.enable();
        } else {
          session.disable();
        }
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
