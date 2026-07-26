import manifest from "yomi-ruby:runtime-manifest";
import { createAnalyzer } from "./analyzer.js";
import { AnnotationCoordinator } from "./coordinator.js";
import { installYomiRubyControls } from "./controls.js";
import { createKatakanaTranslationClient } from "./katakana-translation.js";
import { createYomiRubySession } from "./session.js";
import { loadVerifiedKuromoji } from "./vendor-loader.js";

const coordinator = new AnnotationCoordinator({ document });
const katakanaTranslation = createKatakanaTranslationClient({
  gmRequest: GM_xmlhttpRequest,
});
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
  translatePhrases: katakanaTranslation.translatePhrases,
});

void bootstrap();

async function bootstrap() {
  await installYomiRubyControls({
    origin: location.origin,
    registerMenuCommand: GM_registerMenuCommand,
    unregisterMenuCommand: GM_unregisterMenuCommand,
    getValue: GM_getValue,
    setValue: GM_setValue,
    confirmKatakana: (message) => globalThis.confirm(message),
    kanji: session.kanji,
    katakana: session.katakana,
    showStatus: session.showStatus,
  });
}
