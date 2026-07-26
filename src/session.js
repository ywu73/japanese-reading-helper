import { createLocalizer } from "./i18n.js";
import { installStyles } from "./styles.js";

export function createYomiRubySession({
  document,
  coordinator,
  loadTokenizer,
  createAnalyzer,
  translatePhrases,
  installSessionStyles = installStyles,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  logger = globalThis.console,
  localizer = createLocalizer("en"),
}) {
  if (
    !document
    || !coordinator
    || typeof loadTokenizer !== "function"
    || typeof createAnalyzer !== "function"
    || typeof translatePhrases !== "function"
  ) {
    throw new TypeError("A document, coordinator, tokenizer path, and translation path are required.");
  }

  let kanjiActive = false;
  let kanjiLoading = false;
  let katakanaActive = false;
  let kanjiGeneration = 0;
  let kanjiAbortController = null;
  let currentTranslatePhrases = translatePhrases;
  let removeStyles = null;
  let statusElement = null;
  let statusTimer = null;

  const kanji = {
    async enable() {
      if (kanjiActive || kanjiLoading) {
        return;
      }
      kanjiLoading = true;
      const generation = ++kanjiGeneration;
      const abortController = new AbortController();
      kanjiAbortController = abortController;
      ensureStyles();
      try {
        const tokenizer = await loadTokenizer({ signal: abortController.signal });
        if (generation !== kanjiGeneration || abortController.signal.aborted) {
          return;
        }
        coordinator.enableKanji(createAnalyzer(tokenizer));
        kanjiActive = true;
      } catch (error) {
        if (generation === kanjiGeneration && !abortController.signal.aborted) {
          coordinator.disableKanji();
          showStatus(localizer.t("error.kanjiStartup", { error: errorMessage(error) }), {
            duration: 9000,
            error: true,
          });
          logger?.error?.("[YomiRuby] Refused to start kanji annotation", error);
        }
      } finally {
        if (generation === kanjiGeneration) {
          kanjiLoading = false;
          if (kanjiAbortController === abortController) {
            kanjiAbortController = null;
          }
          removeStylesIfUnused();
        }
      }
    },
    disable() {
      kanjiGeneration += 1;
      kanjiLoading = false;
      kanjiAbortController?.abort();
      kanjiAbortController = null;
      kanjiActive = false;
      coordinator.disableKanji();
      removeStatus();
      removeStylesIfUnused();
    },
  };

  const katakana = {
    async enable() {
      if (katakanaActive) {
        return;
      }
      ensureStyles();
      try {
        coordinator.enableKatakana(currentTranslatePhrases);
        katakanaActive = true;
      } catch (error) {
        katakanaActive = false;
        coordinator.disableKatakana();
        showStatus(localizer.t("error.katakanaStartup", { error: errorMessage(error) }), {
          duration: 9000,
          error: true,
        });
        logger?.error?.("[YomiRuby] Refused to start katakana annotation", error);
      }
    },
    disable() {
      katakanaActive = false;
      coordinator.disableKatakana();
      removeStatus();
      removeStylesIfUnused();
    },
    async setTranslator(nextTranslatePhrases) {
      if (typeof nextTranslatePhrases !== "function") {
        throw new TypeError("Katakana translator replacement requires a translation function.");
      }
      currentTranslatePhrases = nextTranslatePhrases;
      if (!katakanaActive) {
        return;
      }
      katakanaActive = false;
      coordinator.disableKatakana();
      await katakana.enable();
    },
  };

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
    if (!kanjiActive && !kanjiLoading && !katakanaActive && !statusElement) {
      removeStyles?.();
      removeStyles = null;
    }
  }

  function stop() {
    kanjiGeneration += 1;
    kanjiAbortController?.abort();
    kanjiAbortController = null;
    kanjiActive = false;
    kanjiLoading = false;
    katakanaActive = false;
    coordinator.stop();
    removeStatus();
    removeStyles?.();
    removeStyles = null;
  }

  return { kanji, katakana, showStatus, stop };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
