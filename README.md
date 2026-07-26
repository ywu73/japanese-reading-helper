# YomiRuby

**Local reading annotations for Japanese web pages.**

YomiRuby 是一个面向 Tampermonkey 的本地日语网页阅读辅助项目。**当前已经实现的模块**只为含汉字的可靠日语词显示 Hepburn 罗马音，并把网页正文留在浏览器本地处理；片假名辅助标注属于已确认的未来方向，尚未实现或验证。

> 当前状态：已产出 **YomiRuby 0.1.4 完整改名候选**，尚未安装。0.1.4 将产品名、包名、namespace、按网站设置键、DOM 前缀和词典资源名统一迁移到 `yomi-ruby`。这是一次有意的身份切换：旧版 `jrr:auto-origin:` 设置不会继承，未配置网站重新默认为关闭；真实 Tampermonkey 的脚本身份切换、资源持久性与真实 x.com 行为仍待获准安装后验证。

## 目标体验

原文：

```text
今日は日本語を勉強します。
```

目标 HTML 结构示意：

```html
<ruby>今日<rt>kyō</rt></ruby>は
<ruby>日本語<rt>nihongo</rt></ruby>を
<ruby>勉強<rt>benkyō</rt></ruby>します。
```

## 已确认的产品边界

- 使用浏览器本地日语分析，不把网页文字发送给翻译、读音或 AI 服务。
- 默认只标注含汉字的词；纯平假名和纯片假名保持不变。
- 汉字假名混写词使用完整词读音，例如 `食べる → taberu`。
- 默认使用带长音符号的 Hepburn 罗马音，例如 `kyō`、`Tōkyō`。
- 从未配置的 origin 默认关闭；唯一菜单显示“开启本网站自动标注”或“关闭本网站自动标注”。用户开启后，当前页立即初始化，以后刷新同一精确 origin 时自动运行。
- 默认只处理视口附近内容，滚动和动态加载时增量分析。
- 优先利用网页已有的假名 Ruby，并保留可恢复的原始值。
- 保留片假名终结者生成的英文标注，不覆盖、不嵌套。
- 没有可靠词典读音时保留原文，不做逐字猜读。
- 词汇与读音缓存仅存在于当前页面内存。
- 罗马音默认显示在上方；悬停或键盘聚焦时可查看假名。
- 分析程序以固定版本静态打包；词典由 Tampermonkey 在安装或更新时按 `@resource` 预载，并经过 SRI 与运行时长度/SHA-256 双重校验。

## 产品路线

YomiRuby 是总产品名，具体阅读能力作为独立模块演进：

- **当前已实现：汉字罗马音。** 只处理含汉字且具有可靠整词读音的 token，输出带长音符号的 Hepburn 罗马音。
- **未来方向：片假名辅助标注。** 具体输出、数据来源、隐私边界、与现有片假名终结者的迁移或共存方式尚未设计完成，因此当前构建不会处理纯片假名。
- 无论增加哪种模块，都必须继续满足本地处理、可归因 DOM、完整回滚、按精确 origin 启用和失败关闭原则。

## 使用方式

当前阶段只建议开发验证，不应在未完成浏览器门槛前把候选构建当作稳定工具。

开发环境需要 Node `^20.19.0`、`^22.13.0` 或 `>=24.0.0`；本地确定性候选使用 `.nvmrc` 固定的 Node 24.14.0 验证。使用 nvm 时可先执行 `nvm use`。

```bash
npm run check
npm run verify:vendor
```

生成文件位于 `dist/yomi-ruby.user.js`。Kuromoji 分析代码静态包含在文件中；十二个词典通过脚本头部的 `@resource` 在安装或更新时预载。页面运行时只接受 `GM_getResourceURL` 返回的本地资源 URL，再次核验大小和 SHA-256 后才构造 tokenizer。菜单“开启本网站自动标注”会先保存当前精确 origin，再立即启动当前页；菜单会在初始化完成前切换为“关闭本网站自动标注”。关闭会立即停止 observer 和队列、回滚 DOM、取消可取消的资源读取，并释放当前页面的 tokenizer 会话；重新开启时会从 Tampermonkey 本地资源重新构造。

安装属于独立外部变更，必须另行明确确认。获准后仍需严格执行 `docs/manual-test-plan.md`，并将真实网络结果记录在 `docs/network-audit.md`。

## 目录

```text
src/              用户脚本源代码
scripts/          构建、依赖获取和完整性验证工具
vendor/           经核查的第三方资源清单
tests/unit/       纯逻辑测试
tests/integration/ DOM 与加载流程测试
tests/fixtures/   受控网页夹具
docs/             设计、安全边界和验证记录
work/prototypes/  尚未进入正式实现的实验
dist/             最终可安装的生成文件
```

## 非目标

第一版不包含：

- 翻译；
- 在线词典查询；
- AI 解释；
- 学习记录或云同步；
- 对未知人名、地名和自造词进行猜读；
- Chrome 内部页、扩展页、本地文件或 iframe 注入；
- 未经确认的安装、发布、远程仓库或自动更新。

## 已验证与未验证

Node/jsdom 自动化测试覆盖罗马字规则、可靠读音筛选、DOM 安全、现有 ruby 恢复、片假名终结者共存、动态内容、重复开关、资产篡改拒绝和禁止动态 JavaScript 执行的 CSP 回归。Node 正式加载器已使用十二个完整 Kuromoji 词典成功分词。带 `script-src 'self'` 且不允许 `unsafe-eval` 的本地 Chrome 夹具已经完成初始化、动态标注和回滚。

0.1.0 曾在真实 Tampermonkey 环境完成 loopback 功能测试，但在 x.com 因运行时 `new Function` 被 CSP 拒绝。0.1.1 已移除该路径；用户随后报告已将 0.1.1 更新到 Tampermonkey 并在 x.com 手动开启测试，但本项目尚未独立记录完整功能、回滚与扩展后台网络证据。0.1.2、0.1.3 和 YomiRuby 0.1.4 都没有相应候选的完整真实安装验证，不能据本地 `@resource` 模拟器声称 Tampermonkey 已跨刷新缓存资源或已兼容 x.com。历史结果分别见 `docs/verification-report-2026-07-25.md`、`docs/verification-report-0.1.3-2026-07-25.md` 和 `docs/verification-report-0.1.4-2026-07-26.md`。
