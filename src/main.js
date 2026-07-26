import manifest from "yomi-ruby:runtime-manifest";
import { createAnalyzer } from "./analyzer.js";
import { installAnnotationControls } from "./controls.js";
import { PageAnnotator } from "./scheduler.js";
import { createAnnotationSession } from "./session.js";
import { loadVerifiedKuromoji } from "./vendor-loader.js";

const session = createAnnotationSession({
  document,
  loadTokenizer: ({ signal }) => loadVerifiedKuromoji({
    manifest,
    getResourceUrl: GM_getResourceURL,
    gmRequest: GM_xmlhttpRequest,
    signal,
  }),
  createAnnotator: (tokenizer) => new PageAnnotator({
    document,
    analyzeText: createAnalyzer(tokenizer),
  }),
});

void bootstrap();

async function bootstrap() {
  await installAnnotationControls({
    origin: location.origin,
    registerMenuCommand: GM_registerMenuCommand,
    unregisterMenuCommand: GM_unregisterMenuCommand,
    getValue: GM_getValue,
    setValue: GM_setValue,
    enable: session.enable,
    disable: session.disable,
    showStatus: session.showStatus,
  });
}
