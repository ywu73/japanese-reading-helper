import Tokenizer from "kuromoji/src/Tokenizer.js";
import DynamicDictionaries from "kuromoji/src/dict/DynamicDictionaries.js";
import zlib from "zlibjs/bin/gunzip.min.js";

export function buildStaticTokenizer(dictionaryFiles) {
  return createTokenizer((name) => decompress(dictionaryFiles, name));
}

// Preserve the synchronous builder for environments without native gzip support.
// All input buffers must have passed the vendor loader's integrity checks first.
export async function buildStaticTokenizerAsync(dictionaryFiles, { signal } = {}) {
  throwIfAborted(signal);
  if (typeof globalThis.DecompressionStream !== "function") {
    return buildStaticTokenizer(dictionaryFiles);
  }
  const decoded = new Map();
  try {
    // Sequential streams bound temporary decompression work and let cancellation
    // prevent the remaining files from starting.
    for (const [name, compressed] of dictionaryFiles) {
      throwIfAborted(signal);
      if (!(compressed instanceof ArrayBuffer)) {
        throw new Error(`Verified dictionary asset not found: ${name}`);
      }
      const stream = new Blob([compressed]).stream().pipeThrough(
        new DecompressionStream("gzip"),
        { signal },
      );
      decoded.set(name, await new Response(stream).arrayBuffer());
    }
    throwIfAborted(signal);
    return createTokenizer((name) => {
      const bytes = decoded.get(name);
      if (!(bytes instanceof ArrayBuffer)) {
        throw new Error(`Verified dictionary asset not found: ${name}`);
      }
      return bytes;
    });
  } catch (error) {
    throwIfAborted(signal);
    throw error;
  } finally {
    decoded.clear();
  }
}

function createTokenizer(decompress) {
  const dictionaries = new DynamicDictionaries();

  dictionaries.loadTrie(
    new Int32Array(decompress("base.dat.gz")),
    new Int32Array(decompress("check.dat.gz")),
  );
  dictionaries.loadTokenInfoDictionaries(
    new Uint8Array(decompress("tid.dat.gz")),
    new Uint8Array(decompress("tid_pos.dat.gz")),
    new Uint8Array(decompress("tid_map.dat.gz")),
  );
  dictionaries.loadConnectionCosts(new Int16Array(decompress("cc.dat.gz")));
  dictionaries.loadUnknownDictionaries(
    new Uint8Array(decompress("unk.dat.gz")),
    new Uint8Array(decompress("unk_pos.dat.gz")),
    new Uint8Array(decompress("unk_map.dat.gz")),
    new Uint8Array(decompress("unk_char.dat.gz")),
    new Uint32Array(decompress("unk_compat.dat.gz")),
    new Uint8Array(decompress("unk_invoke.dat.gz")),
  );

  return new Tokenizer(dictionaries);
}

function decompress(dictionaryFiles, name) {
  const compressed = dictionaryFiles.get(name);
  if (!(compressed instanceof ArrayBuffer)) {
    throw new Error(`Verified dictionary asset not found: ${name}`);
  }
  const gunzip = new zlib.Zlib.Gunzip(new Uint8Array(compressed));
  const bytes = gunzip.decompress();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new Error("Dictionary initialization aborted.");
  }
}
