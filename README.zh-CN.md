# 日语网页汉字罗马音与片假名英译 ｜ YomiRuby

[English](README.md)

**日语网页汉字罗马音与片假名英译 ｜ YomiRuby** 是一个隐私边界明确的 Tampermonkey 日语网页阅读辅助工具。它可以通过独立选择的本地、Google 或 Bing 模式，在含汉字词上方显示罗马音；也可以通过另行选择的联网服务，在匹配到的片假名词组上方显示尽力而为的英文翻译。

**0.6.1 是公开名称调整候选；0.6.0 已发布到 Greasy Fork，但桌面 Chrome + Tampermonkey 完整安装、扩展后台抓包、自动更新和真实网站兼容性仍未完成验证。**

## 功能

### 可选择的汉字罗马音

- 每个未配置的精确 origin 默认关闭。
- 使用独立的全局 `google | bing | local` 模式。已有安装缺少该设置时迁移为本地模式，避免升级后静默披露汉字词。
- 本地模式在页面内运行固定版本 `kuromoji@0.1.2`，并默认使用带长音符号的 modified Hepburn，例如 `kyō`、`Tōkyō`。0.6.1 仍预加载全部 12 个词典资源。
- Google/Bing 模式使用本地 `Intl.Segmenter` 划分词边界，只发送完整、去重且含汉字的词。Google 使用有界的 `🧩` 连接批次、严格位置校验和同服务精确逐词兜底；Bing 使用同时校验原文回显与罗马音对齐的有界换行批次。两者都不发送完整句子、周围上下文、页面标题、页面 URL、origin 或浏览历史。
- 联网模式只接受严格归属于日语源文的罗马化/转写字段，不把普通英文翻译当作罗马音；失败后不切换到另一服务或本地模式。
- 联网结果按服务返回值显示，属于实验性的尽力而为读音，不保证符合 modified Hepburn。

### 可选的联网片假名英文

- 只有用户为当前精确 origin 开启后才运行。
- 标签页位于前台时扫描全部安全正文，只把精确匹配且去重的片假名词组发送给用户所选的 Google 或 Bing 无密钥网页端点。动态新增安全正文按稳定 FIFO 追加，不设每页候选硬上限。
- Google 与 Bing 片假名请求都按稳定顺序分批：每批最多 50 个词组、编码后的候选载荷最多 1800 字符、批次间隔至少 250ms、超时 8 秒。Google 使用换行 `q` 查询，Bing 使用换行 `text` 表单正文。
- 简体中文界面首次默认选择 Bing，其他界面语言首次默认选择 Google；已保存或手动选择的服务始终优先。
- 不在服务之间静默降级；失败时保留原文，不把同一词组转发给另一家服务。
- 单个翻译失败时保持静默；响应缺失、含糊、无效或不适用时保留原文。
- 这是实验性、尽力而为的功能，不承诺可用性、准确性，也不承诺还原词语的英文词源。

## 安装状态

面向公开用户的安装与自动更新入口是：

<https://greasyfork.org/zh-CN/scripts/589223-yomiruby>

GitHub Raw 构建产物仍保留在 <https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js>，但 Greasy Fork 是公开用户的主要安装入口。当前兼容目标只包括 **桌面 Google Chrome + Tampermonkey**；完整浏览器验证尚未完成，对其他浏览器和用户脚本管理器不提供兼容承诺。

YomiRuby 匹配普通 HTTP/HTTPS 页面，并使用 `@noframes`。全站匹配是为了让用户能在任意网站选择开启 YomiRuby，并不表示功能会在所有网站自动运行：**每个未配置的精确 origin 上，两项功能都默认关闭**。

## 控制与语言

YomiRuby 按“汉字、汉字模式、片假名、片假名翻译服务、语言”的固定顺序注册五个 Tampermonkey 菜单。正常的开启、关闭、启动、模式切换、服务切换和语言切换不会出现授权确认框、加载横幅或成功横幅。只有设置写入失败、安全启动失败等可处理错误才会显示临时非模态提示。

汉字模式与片假名翻译服务菜单同时显示**当前已保存选择**和下一切换目标。各设置使用独立持久化队列；写入成功前菜单不会提前显示新值。写入失败时保留旧菜单与旧运行时。新选择已保存但所属运行时启动失败时，不回退已保存选择，只停止该功能并显示一次临时错误。

界面支持英文和简体中文。仅在第一次运行且没有已存语言时，YomiRuby 会读取浏览器首选语言：以 `zh` 开头时映射为简体中文，其他情况映射为英文，然后全局保存。手动切换语言会永久覆盖首次检测结果。语言切换不会改变功能开关、重新扫描文字、加载 Kuromoji 或发送请求；它只会立即重排汉字模式菜单的下一步操作，而不改变当前模式。没有有效片假名服务设置时，YomiRuby 会根据已解析的界面语言一次性选择默认值（`zh` -> Bing，其他 -> Google）并保存；之后切换语言不会覆盖服务设置。

持久化设置仅限：

- 全局 `yomi-ruby:locale = "en" | "zh"`；
- 全局 `yomi-ruby:kanji-romaji-mode = "google" | "bing" | "local"`；
- 全局 `yomi-ruby:translation-provider = "bing" | "google"`；
- 汉字罗马音启用状态使用 `yomi-ruby:auto-origin:<origin>`；
- 联网片假名英文使用 `yomi-ruby:katakana-origin:<origin>`。

读音、词组、翻译、匹配、失败、队列和请求状态均不持久化。

## 隐私与网络披露

| 网络参与方 | 可能发生请求的时机 | 用途与数据 |
|---|---|---|
| GitHub Raw | 安装或自动更新用户脚本时 | 下载用户脚本产物；会产生普通服务器请求元数据。 |
| unpkg | Tampermonkey 安装或更新固定资源时 | 下载 12 个按 URL、大小和 SHA-256 固定的 `kuromoji@0.1.2` 词典资源；请求不包含页面文字。 |
| Google Translate | 只有当前精确 origin 已开启对应联网功能，且选择 Google 时 | 片假名功能通过 `q` 发送有界的匹配词组；汉字模式通过 `q` 发送有界的 `🧩` 连接完整词批次，要求对齐的 `dt=rm` 结果，批量失败时只降级到同服务精确逐词请求。 |
| Bing Translator | 只有当前精确 origin 已开启对应联网功能，且选择 Bing 时 | 先匿名 GET 临时配置而不执行页面脚本；片假名功能以 `ja -> en` 发送有界换行批次，汉字模式以 `ja -> ja` 发送有界换行完整词批次。两者都严格校验位置对齐，汉字模式只接受独立的 `inputTransliteration`。 |

汉字联网请求不会包含周围句子或完整文本节点；两个联网功能都不会发送页面标题、页面 URL、origin 或浏览历史。Google 把提交的词或词组批次放在 URL 查询参数中，因此它们可能进入浏览器、扩展、网络设备、代理或服务端日志；Bing 把每个有界词组批次放在 POST 表单正文中，但内容仍会披露给浏览器扩展、网络链路和 Bing。

YomiRuby 不包含项目自有分析、遥测、崩溃上报、远程日志、跟踪标识、安装回调或跨服务静默降级。仅允许以下翻译路由：

```text
https://translate.googleapis.com/translate_a/single
https://www.bing.com/translator
https://www.bing.com/ttranslatev3
https://cn.bing.com/translator
https://cn.bing.com/ttranslatev3
```

Google 与 Bing 的网页端点都是未文档化、无合约保证的尽力而为接口；不保证可用性、中国大陆可达性、速率限制、响应结构、正确性或持续无密钥访问。

详细边界参见[安全与隐私边界](docs/security-boundary.md)、[网络审计](docs/network-audit.md)和[安全报告方式](SECURITY.md)。

## DOM 与生命周期安全

- 所有生成类名和属性使用 `yomi-ruby-` / `data-yomi-ruby-` 前缀。
- 跳过脚本、样式、表单、编辑区、代码、隐藏内容、现有 Ruby、SVG/MathML、媒体和 YomiRuby 自有界面。
- 保留作者 Ruby 和 Katakana Terminator 已有标注。
- 页面协调器阻止生成嵌套或重叠 Ruby，并在功能关闭时恢复原文。
- 汉字与片假名分别使用独立深运行时，各自拥有 adapter、精确候选缓存、FIFO、AbortController、generation、Bing 临时配置和设置生命周期。同一家服务的两个客户端可以并行，但不共享任何可变请求状态。
- DOM Coordinator 是唯一 Ruby 所有者。它通过约 500ms 的事件驱动合并窗口与保持顺序的协作式分块扫描前台整页，不使用永久 interval，也不再把视口位置作为资格门槛。后台标签不启动新任务，回到前台后补扫当前仍连接的 DOM。
- 关闭后停止队列和观察器；过期或已取消的异步结果不能重新写入页面。

## Katakana Terminator 致谢

YomiRuby 的可选联网片假名英文模块基于 Arnie97 与 Katakana Terminator Contributors 开发的 Katakana Terminator。该模块改编了 Katakana Terminator 的片假名匹配模式、精确候选去重思想和 Google Translate 请求方案。YomiRuby 的汉字罗马音模式、Kuromoji 校验加载、Google/Bing 源罗马化客户端、两个独立深运行时、前台整页 DOM 协调、请求取消、响应验收、可逆生命周期和双语控制属于独立实现。Katakana Terminator 使用 MIT License。

经过审阅的参考文件和不可变 revision 记录保存在 [`third_party/katakana-terminator/`](third_party/katakana-terminator/README.md)。

## 开发与验证

使用 `.nvmrc` 指定的 Node 版本，并安装 lockfile 中的精确依赖：

```bash
npm ci
npm test
npm run check
npm run verify:vendor
npm run verify:deterministic-build
```

`src/` 是源代码真相；`dist/yomi-ruby.user.js` 只能通过 `scripts/build.mjs` 生成，禁止手工修改。构建会嵌入规范的 YomiRuby 和第三方许可证/NOTICE，并审计版本、元数据、存储范围、请求路径、禁止能力、固定资源与法律材料。

本地 Node/jsdom 证据不能证明真实 Chrome/Tampermonkey 行为、扩展后台隐私、安装/更新、性能、准确性或完整浏览器回滚。参见[浏览器手工测试计划](docs/manual-test-plan.md)和 `docs/` 下的版本化验证报告。

## 贡献、安全与许可证

普通缺陷与功能讨论使用 GitHub Issues；安全或隐私漏洞必须使用 GitHub Private Vulnerability Reporting，不要在公开 Issue 中发布敏感细节。参见[简体中文贡献指南](CONTRIBUTING.zh-CN.md)和[安全报告方式](SECURITY.md)。

YomiRuby 自有代码与贡献采用 [MIT License](LICENSE)。第三方许可证与来源记录见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。0.6.1 不要求 CLA 或 DCO。
