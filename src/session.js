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
      showStatus("正在读取并校验 Tampermonkey 预载词典…", { duration: 0 });
      try {
        const tokenizer = await loadTokenizer({ signal: abortController.signal });
        if (generation !== kanjiGeneration || abortController.signal.aborted) {
          return;
        }
        coordinator.enableKanji(createAnalyzer(tokenizer));
        kanjiActive = true;
        showStatus("汉字罗马音已开启。页面文字只在本页内分析。", { duration: 4000 });
      } catch (error) {
        if (generation === kanjiGeneration && !abortController.signal.aborted) {
          coordinator.disableKanji();
          showStatus(`无法安全启动汉字罗马音：${errorMessage(error)}`, {
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
        coordinator.enableKatakana(translatePhrases);
        katakanaActive = true;
        showStatus("片假名英文已开启。匹配词组会发送给 Google Translate。", { duration: 5000 });
      } catch (error) {
        katakanaActive = false;
        coordinator.disableKatakana();
        showStatus(`无法安全启动片假名英文：${errorMessage(error)}`, {
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
