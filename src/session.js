import { installStyles } from "./styles.js";

export function createAnnotationSession({
  document,
  loadTokenizer,
  createAnnotator,
  installSessionStyles = installStyles,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  logger = globalThis.console,
}) {
  if (!document || typeof loadTokenizer !== "function" || typeof createAnnotator !== "function") {
    throw new TypeError("A document, tokenizer loader, and annotator factory are required.");
  }

  let annotator = null;
  let loading = false;
  let generation = 0;
  let tokenizerPromise = null;
  let abortController = null;
  let removeStyles = null;
  let statusElement = null;
  let statusTimer = null;

  async function enable() {
    if (annotator || loading) {
      return;
    }
    loading = true;
    const requestGeneration = ++generation;
    const requestAbortController = new AbortController();
    abortController = requestAbortController;
    ensureStyles();
    showStatus("正在读取并校验 Tampermonkey 预载词典…", { duration: 0 });

    const requestPromise = Promise.resolve().then(() => loadTokenizer({
      signal: requestAbortController.signal,
    }));
    tokenizerPromise = requestPromise;

    try {
      const tokenizer = await requestPromise;
      if (requestGeneration !== generation || tokenizerPromise !== requestPromise) {
        return;
      }
      const nextAnnotator = createAnnotator(tokenizer);
      try {
        nextAnnotator.start();
      } catch (error) {
        nextAnnotator.stop?.();
        throw error;
      }
      annotator = nextAnnotator;
      showStatus("罗马音标注已开启。页面文字只在本页内分析。", { duration: 4000 });
    } catch (error) {
      if (requestGeneration === generation && !requestAbortController.signal.aborted) {
        tokenizerPromise = null;
        showStatus(`无法安全启动：${errorMessage(error)}`, { duration: 9000, error: true });
        scheduleStyleRemoval(9500);
        logger?.error?.("[YomiRuby] Refused to start", error);
      }
    } finally {
      if (requestGeneration === generation) {
        loading = false;
        if (abortController === requestAbortController) {
          abortController = null;
        }
        if (!annotator) {
          tokenizerPromise = null;
        }
      }
    }
  }

  function disable() {
    generation += 1;
    loading = false;
    abortController?.abort();
    abortController = null;
    tokenizerPromise = null;
    annotator?.stop();
    annotator = null;
    removeStatus();
    removeStyles?.();
    removeStyles = null;
  }

  function ensureStyles() {
    removeStyles ??= installSessionStyles(document);
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

  function removeStatus() {
    if (statusTimer != null) {
      clearTimer(statusTimer);
    }
    statusTimer = null;
    statusElement?.remove();
    statusElement = null;
    if (!annotator && !loading) {
      removeStyles?.();
      removeStyles = null;
    }
  }

  function scheduleStyleRemoval(delay) {
    setTimer(() => {
      if (!annotator && !loading && !statusElement) {
        removeStyles?.();
        removeStyles = null;
      }
    }, delay);
  }

  return { enable, disable, showStatus };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
