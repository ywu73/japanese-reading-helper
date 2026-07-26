const manifest = await fetch("/vendor/manifest.json").then((response) => response.json());
const resourceUrlByName = new Map();
const bytesByResourceUrl = new Map();

for (const asset of manifest.dictionary) {
  const response = await fetch(`/node_modules/kuromoji/dict/${asset.name}`);
  const bytes = await response.arrayBuffer();
  const resourceUrl = URL.createObjectURL(new Blob([bytes], { type: "application/gzip" }));
  resourceUrlByName.set(asset.resourceName, resourceUrl);
  bytesByResourceUrl.set(resourceUrl, bytes);
}

let nextMenuId = 1;
const menuById = new Map();
globalThis.__YOMI_RUBY_MENU_COMMANDS__ = new Map();
globalThis.GM_registerMenuCommand = (label, callback) => {
  const id = nextMenuId++;
  menuById.set(id, { label, callback });
  globalThis.__YOMI_RUBY_MENU_COMMANDS__.set(label, callback);
  return id;
};
globalThis.GM_unregisterMenuCommand = (id) => {
  const command = menuById.get(id);
  if (command) {
    globalThis.__YOMI_RUBY_MENU_COMMANDS__.delete(command.label);
    menuById.delete(id);
  }
};
globalThis.GM_getValue = async (key, fallback) => key.startsWith("yomi-ruby:auto-origin:")
  ? true
  : fallback;
globalThis.GM_setValue = async () => {};
globalThis.GM_getResourceURL = (name) => resourceUrlByName.get(name);
globalThis.GM_xmlhttpRequest = ({ url, onload, onerror, ontimeout, timeout }) => {
  const timer = setTimeout(() => {
    ontimeout?.();
  }, timeout);

  const bytes = bytesByResourceUrl.get(url);
  queueMicrotask(() => {
    clearTimeout(timer);
    if (bytes) {
      onload({ status: 200, response: bytes.slice(0) });
    } else {
      onerror?.(new Error(`Unknown preloaded resource URL: ${url}`));
    }
  });
};

await import("/dist/yomi-ruby.user.js");
await import("/tests/fixtures/csp-page.js");
