import Tokenizer from "kuromoji/src/Tokenizer.js";
import DynamicDictionaries from "kuromoji/src/dict/DynamicDictionaries.js";
import zlib from "zlibjs/bin/gunzip.min.js";

export function buildStaticTokenizer(dictionaryFiles) {
  const dictionaries = new DynamicDictionaries();

  dictionaries.loadTrie(
    new Int32Array(decompress(dictionaryFiles, "base.dat.gz")),
    new Int32Array(decompress(dictionaryFiles, "check.dat.gz")),
  );
  dictionaries.loadTokenInfoDictionaries(
    new Uint8Array(decompress(dictionaryFiles, "tid.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "tid_pos.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "tid_map.dat.gz")),
  );
  dictionaries.loadConnectionCosts(new Int16Array(decompress(dictionaryFiles, "cc.dat.gz")));
  dictionaries.loadUnknownDictionaries(
    new Uint8Array(decompress(dictionaryFiles, "unk.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "unk_pos.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "unk_map.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "unk_char.dat.gz")),
    new Uint32Array(decompress(dictionaryFiles, "unk_compat.dat.gz")),
    new Uint8Array(decompress(dictionaryFiles, "unk_invoke.dat.gz")),
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
