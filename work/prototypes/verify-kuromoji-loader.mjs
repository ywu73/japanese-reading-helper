import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.resolve("kuromoji/package.json")));
const runtimeSource = await readFile(
  path.join(packageRoot, "build/kuromoji.js"),
  "utf8",
);

const dictionaryFiles = new Map();
for (const filename of await readdir(path.join(packageRoot, "dict"))) {
  if (!filename.endsWith(".dat.gz")) {
    continue;
  }
  dictionaryFiles.set(
    filename,
    await readFile(path.join(packageRoot, "dict", filename)),
  );
}

const requestedUrls = [];

class VerifiedDictionaryXMLHttpRequest {
  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send() {
    queueMicrotask(() => {
      requestedUrls.push(this.url);
      const filename = this.url.split("/").at(-1);
      const bytes = dictionaryFiles.get(filename);

      if (this.method !== "GET" || bytes == null) {
        this.status = 404;
        this.statusText = "Verified dictionary asset not found";
        this.onerror?.(new Error(this.statusText));
        return;
      }

      this.status = 200;
      this.statusText = "OK";
      this.response = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      this.onload?.call(this);
    });
  }
}

const moduleRecord = { exports: {} };
const evaluateRuntime = new Function(
  "module",
  "exports",
  "XMLHttpRequest",
  `${runtimeSource}\nreturn module.exports;`,
);
const kuromoji = evaluateRuntime(
  moduleRecord,
  moduleRecord.exports,
  VerifiedDictionaryXMLHttpRequest,
);

if (typeof kuromoji?.builder !== "function") {
  throw new Error("The verified Kuromoji runtime did not expose builder().");
}

const tokenizer = await new Promise((resolve, reject) => {
  kuromoji.builder({ dicPath: "verified://dictionary" }).build((error, value) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(value);
  });
});

const samples = [
  "今日は日本語を勉強します。",
  "食べる方法を調べています。",
  "東京の高校へ行きます。",
  "五月雨と小鳥遊",
];

const tokenized = Object.fromEntries(
  samples.map((sample) => [
    sample,
    tokenizer.tokenize(sample).map((token) => ({
      surface: token.surface_form,
      reading: token.reading,
      wordType: token.word_type,
      pos: token.pos,
    })),
  ]),
);

console.log(
  JSON.stringify(
    {
      dictionaryAssetCount: dictionaryFiles.size,
      requestedUrls,
      tokenized,
    },
    null,
    2,
  ),
);
