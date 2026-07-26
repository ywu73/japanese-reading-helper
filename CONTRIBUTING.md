# Contributing to YomiRuby

[简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping improve YomiRuby. Ordinary bugs, documentation problems,
and proposed features may be discussed through GitHub Issues. Security or
privacy vulnerabilities must follow [SECURITY.md](SECURITY.md) instead of a
public Issue.

Before opening a change:

1. Keep the privacy and product boundaries in `AGENTS.md` intact. A new remote
   endpoint, executable asset, analytics path, persistent data category, or
   compatibility claim requires an explicit product decision.
2. Add behavior-focused tests at public seams. Do not weaken cancellation,
   integrity, DOM ownership, response validation, or rollback checks.
3. Treat `src/` as source and regenerate `dist/yomi-ruby.user.js` with the build
   script. Never hand-edit `dist`.
4. Preserve third-party copyright, license, NOTICE, and provenance records.
5. Run the full local gates:

```bash
npm ci
npm test
npm run check
npm run verify:vendor
npm run verify:deterministic-build
```

Describe what changed, which privacy or network surfaces are affected, the
commands actually run, and every browser or publication claim that remains
unverified. Contributions are accepted under YomiRuby's MIT License. Version
0.4.0 uses neither a Contributor License Agreement nor a Developer Certificate
of Origin.
