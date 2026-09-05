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

## Katakana matching attribution and translation providers

YomiRuby's full-width and half-width katakana matching semantics are derived
from **Katakana Terminator**, copyright 2017-2022 Katakana Terminator
Contributors, licensed MIT:

- source: <https://github.com/Arnie97/katakana-terminator>
- reviewed immutable revision: `dbbff055b41e5fa12886af50b9862d9ae9f307c9`
- reviewed reference copy: `third_party/katakana-terminator/katakana-terminator.reference.user.js`
- provenance and digest: `third_party/katakana-terminator/README.md`

YomiRuby does not copy Katakana Terminator's periodic whole-page scanner or its
DOM/request lifecycle. The page coordinator, viewport scheduling, batching,
cancellation, response validation, ownership, and rollback are project-owned.

After the user enables the exact-origin feature, the katakana module calls only
the selected provider. Google uses the same no-key endpoint as the retained
Katakana Terminator reference:
`https://translate.googleapis.com/translate_a/single`.

The Bing client is an independent, minimal implementation informed by
first-party translator-page evidence observed on 2026-07-26 and corroborated
against `plainheart/bing-translate-api` at immutable commit
`d2bbd97695db48e7aa707f5bd66c30d862eef29f`. No code or runtime dependency from
that Node package is bundled. YomiRuby fetches the approved Bing translator
page anonymously, parses only `IG`, the `#rich_tta` IID, and the
`params_AbusePreventionHelper` tuple without executing returned code, then sends
bounded newline-joined katakana batches per anonymous `/ttranslatev3` POST.
Each batch follows the same 50-candidate, 1800-encoded-character, 250 ms, and
8-second limits as the Google katakana path, adapted from URL length to Bing's
encoded `text` form field. The reference is MIT-licensed,
but its license does not authorize Microsoft's web service.

Both providers are external runtime web endpoints, not executable dependencies,
pinned assets, official contracted APIs, or stability guarantees. Neither uses
an account, project-owned proxy, Azure resource, or secret key. Failures never
cross-fallback to the other provider.

## Development-only dependencies

| Package | Version | License | Purpose |
|---|---:|---|---|
| `esbuild` | 0.28.1 | MIT | Deterministic single-file userscript bundle |
| `jsdom` | 29.1.1 | MIT | DOM integration tests and fixture generation |
| `kuromoji` | 0.1.2 | Apache-2.0 | Statically bundled tokenizer modules and reproducible verification |
| `doublearray` | 0.0.2 | MIT | Transitive runtime trie implementation bundled through Kuromoji |
| `zlibjs` | 0.3.1 | MIT | Bundled decompression for verified dictionary bytes when native GZIP support is absent; also retained for synchronous verification tools |

The three direct development dependencies are exact in `package.json`.
`doublearray` and `zlibjs` are exact transitive runtime versions in
`package-lock.json`, which records the official npm-registry URLs, integrity
values, resolved versions, and declared licenses. `npm install` reported zero known audit
vulnerabilities on 2026-07-25; that time-bounded registry result is not a
permanent security guarantee.
