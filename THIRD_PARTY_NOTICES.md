# Third-party notices

YomiRuby includes or adapts material from the following projects. These notices
do not replace the full license texts stored in this repository.

## Kuromoji.js 0.1.2

Kuromoji.js is distributed under the Apache License 2.0. The userscript
statically bundles executable modules from the exact `kuromoji@0.1.2` npm
package. Its twelve dictionary files are declared as immutable Tampermonkey
resources and verified by size and SHA-256 before use.

- License: `licenses/Apache-2.0.txt`
- Code copyright: `licenses/Kuromoji-COPYRIGHT.txt`
- Upstream NOTICE, including mecab-ipadic and ICOT terms:
  `licenses/Kuromoji-NOTICE.md`
- Source: https://github.com/takuyaa/kuromoji.js/tree/0.1.2

The bundled tokenizer path also includes:

- `doublearray@0.0.2`, copyright 2014 Takuya Asano, MIT License:
  `licenses/doublearray-MIT.txt`;
- `zlibjs@0.3.1`, copyright 2012 imaya, MIT License:
  `licenses/zlibjs-MIT.txt`.

## Katakana Terminator

YomiRuby's optional online Katakana-to-English module is based on Katakana
Terminator by Arnie97 and the Katakana Terminator Contributors. It adapts
Katakana Terminator's Katakana matching pattern and Google Translate request
approach. The remainder of YomiRuby is a separate implementation.

Katakana Terminator is licensed under the MIT License.

- License: `third_party/katakana-terminator/LICENSE`
- Provenance: `third_party/katakana-terminator/README.md`
- Reviewed reference: `third_party/katakana-terminator/katakana-terminator.reference.user.js`
