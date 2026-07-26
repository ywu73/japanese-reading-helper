# Dependency record and attribution

## Static runtime dependency

| Field | Locked value |
|---|---|
| Package | `kuromoji@0.1.2` |
| License | Apache-2.0 |
| Source repository | <https://github.com/takuyaa/kuromoji.js> |
| Official npm tarball | <https://registry.npmjs.org/kuromoji/-/kuromoji-0.1.2.tgz> |
| npm integrity | `sha512-V0dUf+C2LpcPEXhoHLMAop/bOht16Dyr+mDiIE39yX3vqau7p80De/koFqpiTcL1zzdZlc3xuHZ8u5gjYRfFaQ==` |
| Executable delivery | Statically bundled at build time |
| Dictionary delivery | Twelve SHA-256 SRI `@resource` entries, acquired by Tampermonkey at install/update |
| Dictionary CDN base | <https://unpkg.com/kuromoji@0.1.2/> |

The package's Apache 2.0 license text and notice are present in the official npm
package as `LICENSE-2.0.txt` and `NOTICE.md`. The executable modules are bundled
from the exact npm package recorded in `package-lock.json`; no remote JavaScript
is evaluated at runtime. Exact dictionary resource names, sizes, URLs, and
SHA-256 digests are recorded in `vendor/manifest.json`, emitted as SRI metadata,
and checked independently by `npm run verify:vendor`. The page runtime accepts
only Tampermonkey-provided local resource URLs and verifies the bytes again.

This is an old, pinned compatibility candidate. Exact hashes establish byte
identity with the reviewed package; they do not establish that the upstream is
currently maintained.

## Katakana matching attribution and translation endpoint

YomiRuby's full-width and half-width katakana matching semantics are derived
from **Katakana Terminator**, copyright 2017-2021 Katakana Terminator
Contributors, licensed MIT:

- source: <https://github.com/Arnie97/katakana-terminator>
- reviewed reference copy: `docs/片假名终结者.js`

YomiRuby does not copy Katakana Terminator's periodic whole-page scanner or its
DOM/request lifecycle. The page coordinator, viewport scheduling, batching,
cancellation, response validation, ownership, and rollback are project-owned.

After exact-origin consent, the katakana module calls the same no-key Google
Translate endpoint used by the reference script:
`https://translate.googleapis.com/translate_a/single`. This is an external
runtime endpoint, not an executable dependency, pinned asset, official paid
Google Cloud API, or stability guarantee. No API key or second translation
provider is configured.

## Development-only dependencies

| Package | Version | License | Purpose |
|---|---:|---|---|
| `esbuild` | 0.28.1 | MIT | Deterministic single-file userscript bundle |
| `jsdom` | 29.1.1 | MIT | DOM integration tests and fixture generation |
| `kuromoji` | 0.1.2 | Apache-2.0 | Statically bundled tokenizer modules and reproducible verification |

All three are exact direct versions in `package.json`. `package-lock.json`
records the official npm-registry URLs, integrity values, resolved transitive
versions, and declared licenses. `npm install` reported zero known audit
vulnerabilities on 2026-07-25; that time-bounded registry result is not a
permanent security guarantee.
