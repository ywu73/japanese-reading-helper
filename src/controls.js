import {
  getFeatureEnabledForOrigin,
  setFeatureEnabledForOrigin,
  setStoredLocale,
  setStoredTranslationProvider,
} from "./settings.js";

export async function installYomiRubyControls({
  origin,
  registerMenuCommand,
  unregisterMenuCommand,
  getValue,
  setValue,
  localizer,
  localePersistenceError = null,
  translationProvider,
  translationProviderReadError = null,
  translationProviderPersistenceError = null,
  translationProviderFactories,
  kanji,
  katakana,
  showStatus,
}) {
  const persistence = createPersistenceQueue();
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
      persist: (nextEnabled) => persistence.enqueue(() => setFeatureEnabledForOrigin(
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
  let providerMenuId = null;
  let providerOperation = 0;
  let currentProvider = translationProvider;
  let persistedProvider = translationProvider;
  const registerProvider = () => {
    if (providerMenuId != null) {
      unregisterMenuCommand(providerMenuId);
    }
    const nextProvider = currentProvider === "bing" ? "google" : "bing";
    providerMenuId = registerMenuCommand(
      localizer.t("menu.translationProvider", { nextProvider }),
      async () => {
        const requestedProvider = nextProvider;
        const requestOperation = ++providerOperation;
        currentProvider = requestedProvider;
        refreshMenus();
        try {
          await persistence.enqueue(() => setStoredTranslationProvider(setValue, requestedProvider));
        } catch (error) {
          if (requestOperation === providerOperation) {
            currentProvider = persistedProvider;
            refreshMenus();
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
        if (requestOperation === providerOperation && currentProvider === requestedProvider) {
          let nextTranslator;
          try {
            nextTranslator = translationProviderFactories[requestedProvider]();
          } catch (error) {
            katakana.disable();
            showStatus(localizer.t("error.katakanaStartup", { error: errorMessage(error) }), {
              duration: 9000,
              error: true,
            });
            return;
          }
          await katakana.setTranslator(nextTranslator);
        }
      },
    );
  };
  let languageOperation = 0;
  let persistedLocale = localizer.getLocale();
  const registerLanguage = () => {
    if (languageMenuId != null) {
      unregisterMenuCommand(languageMenuId);
    }
    languageMenuId = registerMenuCommand(localizer.t("menu.language"), async () => {
      const requestOperation = ++languageOperation;
      const nextLocale = localizer.getLocale() === "zh" ? "en" : "zh";
      localizer.setLocale(nextLocale);
      refreshMenus();
      try {
        await persistence.enqueue(() => setStoredLocale(setValue, nextLocale));
      } catch (error) {
        if (requestOperation === languageOperation) {
          localizer.setLocale(persistedLocale);
          refreshMenus();
          showStatus(localizer.t("error.localePersistence", { error: errorMessage(error) }), {
            duration: 9000,
            error: true,
          });
        }
        return;
      }
      persistedLocale = nextLocale;
    });
  };
  refreshMenus = () => {
    for (const control of controls) {
      control.register();
    }
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
  let menuId = null;
  let operation = 0;

  const register = () => {
    if (menuId != null) {
      unregisterMenuCommand(menuId);
    }
    menuId = registerMenuCommand(localizer.t(`menu.${enabled ? "disable" : "enable"}${menuKey}`), async () => {
      const requestedEnabled = !enabled;
      const requestOperation = ++operation;
      enabled = requestedEnabled;
      refreshMenus();
      if (!requestedEnabled) {
        session.disable();
      }

      try {
        await persist(requestedEnabled);
      } catch (error) {
        if (requestOperation === operation) {
          enabled = false;
          refreshMenus();
          session.disable();
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
