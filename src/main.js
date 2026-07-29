import manifest from "yomi-ruby:runtime-manifest";
import { createAnalyzer } from "./analyzer.js";
import { createBingKanjiRomajiClient } from "./bing-kanji-romaji.js";
import { createBingTranslationClient } from "./bing-translation.js";
import { AnnotationCoordinator } from "./coordinator.js";
import { installYomiRubyControls } from "./controls.js";
import { createLocalizer, initializeLocale } from "./i18n.js";
import { createGoogleTranslationClient } from "./katakana-translation.js";
import { createGoogleKanjiRomajiClient } from "./google-kanji-romaji.js";
import { createOnlineKanjiAnalyzer } from "./online-kanji-analyzer.js";
import { createYomiRubySession } from "./session.js";
import { initializeKanjiRomajiMode, initializeTranslationProvider } from "./settings.js";
import { loadVerifiedKuromoji } from "./vendor-loader.js";

const coordinator = new AnnotationCoordinator({ document });
const localizer = createLocalizer("en");

void bootstrap();

async function bootstrap() {
  const primaryLanguage = navigator.languages?.[0] ?? navigator.language;
  const {
    mode: kanjiRomajiMode,
    readError: kanjiRomajiModeReadError,
    persistenceError: kanjiRomajiModePersistenceError,
  } = await initializeKanjiRomajiMode({
    getValue: GM_getValue,
    setValue: GM_setValue,
    primaryLanguage,
  });
  const { locale, persistenceError } = await initializeLocale({
    getValue: GM_getValue,
    setValue: GM_setValue,
    primaryLanguage,
  });
  localizer.setLocale(locale);
  const {
    provider,
    readError: translationProviderReadError,
    persistenceError: translationProviderPersistenceError,
  } = await initializeTranslationProvider({
    getValue: GM_getValue,
    setValue: GM_setValue,
    locale,
  });
  const translationProviderFactories = {
    bing: () => createBingTranslationClient({
      gmRequest: GM_xmlhttpRequest,
    }).translatePhrases,
    google: () => createGoogleTranslationClient({
      gmRequest: GM_xmlhttpRequest,
    }).translatePhrases,
  };
  const kanjiAnalyzerFactories = {
    local: async ({ signal }) => createAnalyzer(await loadVerifiedKuromoji({
      manifest,
      getResourceUrl: GM_getResourceURL,
      gmRequest: GM_xmlhttpRequest,
      signal,
    })),
    google: async () => createOnlineKanjiAnalyzer({
      romanizeWords: createGoogleKanjiRomajiClient({
        gmRequest: GM_xmlhttpRequest,
      }).romanizeWords,
    }),
    bing: async () => createOnlineKanjiAnalyzer({
      romanizeWords: createBingKanjiRomajiClient({
        gmRequest: GM_xmlhttpRequest,
      }).romanizeWords,
    }),
  };
  const session = createYomiRubySession({
    document,
    coordinator,
    kanjiMode: kanjiRomajiMode,
    kanjiAnalyzerFactories,
    translationProvider: provider,
    translationProviderFactories,
    localizer,
  });
  await installYomiRubyControls({
    origin: location.origin,
    registerMenuCommand: GM_registerMenuCommand,
    unregisterMenuCommand: GM_unregisterMenuCommand,
    getValue: GM_getValue,
    setValue: GM_setValue,
    addValueChangeListener: GM_addValueChangeListener,
    removeValueChangeListener: GM_removeValueChangeListener,
    localizer,
    localePersistenceError: persistenceError,
    kanjiRomajiMode,
    kanjiRomajiModeReadError,
    kanjiRomajiModePersistenceError,
    translationProvider: provider,
    translationProviderReadError,
    translationProviderPersistenceError,
    kanji: session.kanji,
    katakana: session.katakana,
    showStatus: session.showStatus,
  });
}
