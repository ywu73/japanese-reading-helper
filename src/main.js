import manifest from "yomi-ruby:runtime-manifest";
import { createAnalyzer } from "./analyzer.js";
import { createBingTranslationClient } from "./bing-translation.js";
import { AnnotationCoordinator } from "./coordinator.js";
import { installYomiRubyControls } from "./controls.js";
import { createLocalizer, initializeLocale } from "./i18n.js";
import { createGoogleTranslationClient } from "./katakana-translation.js";
import { createYomiRubySession } from "./session.js";
import { initializeTranslationProvider } from "./settings.js";
import { loadVerifiedKuromoji } from "./vendor-loader.js";

const coordinator = new AnnotationCoordinator({ document });
const localizer = createLocalizer("en");

void bootstrap();

async function bootstrap() {
  const { locale, persistenceError } = await initializeLocale({
    getValue: GM_getValue,
    setValue: GM_setValue,
    primaryLanguage: navigator.languages?.[0] ?? navigator.language,
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
  const session = createYomiRubySession({
    document,
    coordinator,
    loadTokenizer: ({ signal }) => loadVerifiedKuromoji({
      manifest,
      getResourceUrl: GM_getResourceURL,
      gmRequest: GM_xmlhttpRequest,
      signal,
    }),
    createAnalyzer,
    translatePhrases: translationProviderFactories[provider](),
    localizer,
  });
  await installYomiRubyControls({
    origin: location.origin,
    registerMenuCommand: GM_registerMenuCommand,
    unregisterMenuCommand: GM_unregisterMenuCommand,
    getValue: GM_getValue,
    setValue: GM_setValue,
    localizer,
    localePersistenceError: persistenceError,
    translationProvider: provider,
    translationProviderReadError,
    translationProviderPersistenceError,
    translationProviderFactories,
    kanji: session.kanji,
    katakana: session.katakana,
    showStatus: session.showStatus,
  });
}
