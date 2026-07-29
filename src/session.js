import { createLocalizer } from "./i18n.js";
import { KanjiRuntime } from "./kanji-runtime.js";
import { KatakanaRuntime } from "./katakana-runtime.js";
import { installStyles } from "./styles.js";

export function createYomiRubySession({
  document,
  coordinator,
  kanjiMode = "local",
  kanjiAnalyzerFactories,
  translationProvider = "google",
  translationProviderFactories,
  translatePhrases = null,
  installSessionStyles = installStyles,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  logger = globalThis.console,
  localizer = createLocalizer("en"),
}) {
  if (!document || !coordinator || !kanjiAnalyzerFactories) {
    throw new TypeError("A document, coordinator, and kanji analyzer adapters are required.");
  }
  const resolvedTranslationFactories = translationProviderFactories ?? (
    typeof translatePhrases === "function"
      ? { [translationProvider]: () => translatePhrases }
      : null
  );
  if (!resolvedTranslationFactories) {
    throw new TypeError("Katakana translation adapters are required.");
  }

  const kanjiRuntime = new KanjiRuntime({
    mode: kanjiMode,
    analyzerFactories: kanjiAnalyzerFactories,
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  const katakanaRuntime = new KatakanaRuntime({
    provider: translationProvider,
    translatorFactories: resolvedTranslationFactories,
    onPlanChanged: (record) => coordinator.refresh(record),
  });
  let kanjiActive = false;
  let kanjiDesired = false;
  let katakanaActive = false;
  let removeStyles = null;
  let statusElement = null;
  let statusTimer = null;

  const kanji = {
    async enable() {
      if (kanjiActive) {
        return;
      }
      kanjiDesired = true;
      ensureStyles();
      try {
        await kanjiRuntime.enable();
        if (!kanjiDesired || !kanjiRuntime.active) {
          return;
        }
        coordinator.enableKanji(kanjiRuntime);
        kanjiActive = true;
      } catch (error) {
        kanjiDesired = false;
        kanjiRuntime.disable();
        coordinator.disableKanji();
        showStartupError("kanji", error);
      } finally {
        removeStylesIfUnused();
      }
    },
    disable() {
      kanjiDesired = false;
      kanjiActive = false;
      coordinator.disableKanji();
      kanjiRuntime.disable();
      removeStatus();
      removeStylesIfUnused();
    },
    async setMode(mode) {
      if (!kanjiActive) {
        await kanjiRuntime.setMode(mode);
        return;
      }
      coordinator.disableKanji();
      kanjiActive = false;
      try {
        await kanjiRuntime.setMode(mode);
        if (kanjiRuntime.active && kanjiDesired) {
          coordinator.enableKanji(kanjiRuntime);
          kanjiActive = true;
        }
      } catch (error) {
        kanjiDesired = false;
        kanjiRuntime.disable();
        showStartupError("kanji", error);
      } finally {
        removeStylesIfUnused();
      }
    },
  };

  const katakana = {
    async enable() {
      if (katakanaActive) {
        return;
      }
      ensureStyles();
      try {
        await katakanaRuntime.enable();
        if (!katakanaRuntime.active) {
          return;
        }
        coordinator.enableKatakana(katakanaRuntime);
        katakanaActive = true;
      } catch (error) {
        katakanaRuntime.disable();
        coordinator.disableKatakana();
        showStartupError("katakana", error);
      } finally {
        removeStylesIfUnused();
      }
    },
    disable() {
      katakanaActive = false;
      coordinator.disableKatakana();
      katakanaRuntime.disable();
      removeStatus();
      removeStylesIfUnused();
    },
    async setProvider(provider) {
      if (!katakanaActive) {
        await katakanaRuntime.setProvider(provider);
        return;
      }
      coordinator.disableKatakana();
      katakanaActive = false;
      try {
        await katakanaRuntime.setProvider(provider);
        if (katakanaRuntime.active) {
          coordinator.enableKatakana(katakanaRuntime);
          katakanaActive = true;
        }
      } catch (error) {
        katakanaRuntime.disable();
        showStartupError("katakana", error);
      } finally {
        removeStylesIfUnused();
      }
    },
  };

  function showStartupError(feature, error) {
    showStatus(localizer.t(`error.${feature}Startup`, { error: errorMessage(error) }), {
      duration: 9000,
      error: true,
    });
    logger?.error?.(`[YomiRuby] Refused to start ${feature} annotation`, error);
  }

  function showStatus(message, { duration = 4000, error = false } = {}) {
    removeStatus();
    ensureStyles();
    const element = document.createElement("div");
    element.setAttribute("data-yomi-ruby-status", "");
    element.setAttribute("role", error ? "alert" : "status");
    element.textContent = message;
    (document.body ?? document.documentElement).append(element);
    statusElement = element;
    if (duration > 0) {
      statusTimer = setTimer(removeStatus, duration);
    }
  }

  function ensureStyles() {
    removeStyles ??= installSessionStyles(document);
  }

  function removeStatus() {
    if (statusTimer != null) {
      clearTimer(statusTimer);
    }
    statusTimer = null;
    statusElement?.remove();
    statusElement = null;
    removeStylesIfUnused();
  }

  function removeStylesIfUnused() {
    if (!kanjiActive && !kanjiDesired && !katakanaActive && !statusElement) {
      removeStyles?.();
      removeStyles = null;
    }
  }

  function stop() {
    kanjiDesired = false;
    kanjiActive = false;
    katakanaActive = false;
    kanjiRuntime.stop();
    katakanaRuntime.stop();
    coordinator.stop();
    removeStatus();
    removeStyles?.();
    removeStyles = null;
  }

  return { kanji, katakana, showStatus, stop, kanjiRuntime, katakanaRuntime };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
