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
    onIdle: () => { coordinator.continuePending(); notify("kanji"); },
  });
  const katakanaRuntime = new KatakanaRuntime({
    provider: translationProvider,
    translatorFactories: resolvedTranslationFactories,
    onPlanChanged: (record) => coordinator.refresh(record),
    onIdle: () => { coordinator.continuePending(); notify("katakana"); },
  });
  let kanjiActive = false;
  let kanjiDesired = false;
  let kanjiOperation = 0;
  let katakanaActive = false;
  let katakanaDesired = false;
  let katakanaOperation = 0;
  let removeStyles = null;
  let statusElement = null;
  let statusTimer = null;
  const states = { kanji: { phase: "off" }, katakana: { phase: "off" } };
  const listeners = { kanji: new Set(), katakana: new Set() };

  function getState(feature) {
    const runtime = feature === "kanji" ? kanjiRuntime : katakanaRuntime;
    return { ...states[feature], hasFailures: runtime.hasFailures() };
  }

  function notify(feature) {
    for (const listener of listeners[feature]) listener(getState(feature));
  }

  function setState(feature, phase, progress = {}) {
    states[feature] = { phase, ...progress };
    notify(feature);
  }

  function subscribe(feature, listener) {
    listeners[feature].add(listener);
    return () => listeners[feature].delete(listener);
  }

  const kanji = {
    getState: () => getState("kanji"),
    subscribe: (listener) => subscribe("kanji", listener),
    async enable() {
      if (kanjiActive || kanjiDesired) return;
      const operation = ++kanjiOperation;
      kanjiDesired = true;
      setState("kanji", "loading");
      ensureStyles();
      try {
        await kanjiRuntime.enable({ onProgress: (progress) => {
          if (operation === kanjiOperation) setState("kanji", "loading", progress);
        } });
        if (operation !== kanjiOperation || !kanjiDesired || !kanjiRuntime.active) return;
        coordinator.enableKanji(kanjiRuntime);
        kanjiActive = true;
        setState("kanji", "running");
      } catch (error) {
        if (operation !== kanjiOperation) return;
        kanjiDesired = false;
        kanjiRuntime.disable();
        coordinator.disableKanji();
        setState("kanji", "error");
        showStartupError("kanji", error);
      } finally {
        removeStylesIfUnused();
      }
    },
    disable() {
      kanjiOperation += 1;
      kanjiDesired = false;
      kanjiActive = false;
      coordinator.disableKanji();
      kanjiRuntime.disable();
      setState("kanji", "off");
      removeStatus();
      removeStylesIfUnused();
    },
    async setMode(mode) {
      if (mode === kanjiRuntime.mode) return;
      const restart = kanjiDesired || states.kanji.phase === "error";
      if (!restart) {
        await kanjiRuntime.setMode(mode);
        return;
      }
      kanji.disable();
      const operation = kanjiOperation;
      await kanjiRuntime.setMode(mode);
      if (restart && operation === kanjiOperation) await kanji.enable();
    },
    async retry() {
      if (states.kanji.phase === "error") {
        removeStatus();
        await kanji.enable();
      } else if (kanjiRuntime.retryFailures()) {
        coordinator.reprocess();
        notify("kanji");
      }
    },
  };

  const katakana = {
    getState: () => getState("katakana"),
    subscribe: (listener) => subscribe("katakana", listener),
    async enable() {
      if (katakanaActive || katakanaDesired) return;
      const operation = ++katakanaOperation;
      katakanaDesired = true;
      setState("katakana", "loading");
      ensureStyles();
      try {
        await katakanaRuntime.enable();
        if (operation !== katakanaOperation || !katakanaDesired || !katakanaRuntime.active) return;
        coordinator.enableKatakana(katakanaRuntime);
        katakanaActive = true;
        setState("katakana", "running");
      } catch (error) {
        if (operation !== katakanaOperation) return;
        katakanaDesired = false;
        katakanaRuntime.disable();
        coordinator.disableKatakana();
        setState("katakana", "error");
        showStartupError("katakana", error);
      } finally {
        removeStylesIfUnused();
      }
    },
    disable() {
      katakanaOperation += 1;
      katakanaDesired = false;
      katakanaActive = false;
      coordinator.disableKatakana();
      katakanaRuntime.disable();
      setState("katakana", "off");
      removeStatus();
      removeStylesIfUnused();
    },
    async setProvider(provider) {
      if (provider === katakanaRuntime.provider) return;
      const restart = katakanaDesired || states.katakana.phase === "error";
      if (!restart) {
        await katakanaRuntime.setProvider(provider);
        return;
      }
      katakana.disable();
      const operation = katakanaOperation;
      await katakanaRuntime.setProvider(provider);
      if (restart && operation === katakanaOperation) await katakana.enable();
    },
    async retry() {
      if (states.katakana.phase === "error") {
        removeStatus();
        await katakana.enable();
      } else if (katakanaRuntime.retryFailures()) {
        coordinator.reprocess();
        notify("katakana");
      }
    },
  };

  function showStartupError(feature, error) {
    showStatus(localizer.t(`error.${feature}Startup`, { error: errorMessage(error) }), {
      duration: 9000,
      error: true,
    });
    logger?.error?.(`[Japanese Reading Helper] Refused to start ${feature} annotation`, error);
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
    if (!kanjiActive && !kanjiDesired && !katakanaActive && !katakanaDesired && !statusElement) {
      removeStyles?.();
      removeStyles = null;
    }
  }

  function stop() {
    kanjiOperation += 1;
    katakanaOperation += 1;
    katakanaDesired = false;
    kanjiDesired = false;
    kanjiActive = false;
    katakanaActive = false;
    kanjiRuntime.stop();
    katakanaRuntime.stop();
    coordinator.stop();
    setState("kanji", "off");
    setState("katakana", "off");
    removeStatus();
    removeStyles?.();
    removeStyles = null;
  }

  return { kanji, katakana, showStatus, stop, kanjiRuntime, katakanaRuntime };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
