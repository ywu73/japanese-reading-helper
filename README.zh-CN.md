# YomiRuby

[English](README.md)

YomiRuby 是一个隐私边界明确的 Tampermonkey 日语网页阅读辅助工具。它会在具有可靠读音的含汉字词上方显示本地 Hepburn 罗马音，也可以通过可选联网功能，在匹配到的片假名词组上方显示尽力而为的英文注音。

**0.3.0 当前只是经过本地验证的发布候选；桌面 Chrome + Tampermonkey 安装、扩展后台抓包、更新、真实网站和发布门槛尚未完成。**

## 功能

### 本地汉字罗马音

- 在当前页面本地运行固定版本 `kuromoji@0.1.2` 分析器。
- 只标注含汉字且具有可靠整词读音的 token。
- 默认使用带长音符号的 modified Hepburn，例如 `kyō`、`Tōkyō`。
- 分析器无法提供可靠读音时保留原文，不按单个汉字猜读音。

### 可选的联网片假名英文

- 只有用户为当前精确 origin 开启后才运行。
- 只把视口附近匹配到且去重的片假名词组发送给固定的 Google Translate 无密钥端点。
- 单个翻译失败时保持静默；响应缺失、含糊、无效或不适用时保留原文。
- 这是实验性、尽力而为的功能，不承诺可用性、准确性，也不承诺还原词语的英文词源。

## 安装状态

计划中的唯一安装与自动更新地址是：

<https://raw.githubusercontent.com/ywu73/yomi-ruby/main/dist/yomi-ruby.user.js>

在 0.3.0 的浏览器与发布门槛正式记录为完成之前，不应把该地址视为已经发布的稳定版本。首个公开版本的兼容目标只包括 **桌面 Google Chrome + Tampermonkey**；其他浏览器和用户脚本管理器尚未验证，不提供兼容承诺。

YomiRuby 匹配普通 HTTP/HTTPS 页面，并使用 `@noframes`。全站匹配是为了让用户能在任意网站选择开启 YomiRuby，并不表示功能会在所有网站自动运行：**每个未配置的精确 origin 上，两项功能都默认关闭**。

## 控制与语言

YomiRuby 按“汉字、片假名、语言”的固定顺序注册三个 Tampermonkey 菜单。正常的开启、关闭、启动和语言切换不会出现授权确认框、加载横幅或成功横幅。只有设置写入失败、安全启动失败等可处理错误才会显示临时非模态提示。

界面支持英文和简体中文。仅在第一次运行且没有已存语言时，YomiRuby 会读取浏览器首选语言：以 `zh` 开头时映射为简体中文，其他情况映射为英文，然后全局保存。手动切换语言会永久覆盖首次检测结果。语言切换不会改变功能开关、重新扫描文字、加载 Kuromoji 或发送翻译请求。

持久化设置仅限：

- 全局 `yomi-ruby:locale = "en" | "zh"`；
- 本地汉字罗马音使用 `yomi-ruby:auto-origin:<origin>`；
- 联网片假名英文使用 `yomi-ruby:katakana-origin:<origin>`。

读音、词组、翻译、匹配、失败、队列和请求状态均不持久化。

## 隐私与网络披露

| 网络参与方 | 可能发生请求的时机 | 用途与数据 |
|---|---|---|
| GitHub Raw | 安装或自动更新用户脚本时 | 下载用户脚本产物；会产生普通服务器请求元数据。 |
| unpkg | Tampermonkey 安装或更新固定资源时 | 下载 12 个按 URL、大小和 SHA-256 固定的 `kuromoji@0.1.2` 词典资源；请求不包含页面文字。 |
| Google Translate | 只有当前精确 origin 已开启联网片假名英文，且安全正文节点的匹配词组进入视口附近后 | GET 请求通过 `q` 查询参数发送匹配并去重的片假名词组。 |

Google 请求不会主动包含周围句子、汉字、平假名、页面标题、页面 URL、origin 或浏览历史。由于片假名词组位于 URL 查询参数中，它们可能出现在浏览器、扩展、网络设备、代理或服务端日志中。

YomiRuby 不包含项目自有分析、遥测、崩溃上报、远程日志、跟踪标识、安装回调、第二翻译服务或静默远程降级。唯一允许的翻译端点是：

```text
https://translate.googleapis.com/translate_a/single
```

详细边界参见[安全与隐私边界](docs/security-boundary.md)、[网络审计](docs/network-audit.md)和[安全报告方式](SECURITY.md)。

## DOM 与生命周期安全

- 所有生成类名和属性使用 `yomi-ruby-` / `data-yomi-ruby-` 前缀。
- 跳过脚本、样式、表单、编辑区、代码、隐藏内容、现有 Ruby、SVG/MathML、媒体和 YomiRuby 自有界面。
- 保留作者 Ruby 和 Katakana Terminator 已有标注。
- 页面协调器阻止生成嵌套或重叠 Ruby，并在功能关闭时恢复原文。
- 关闭后停止队列和观察器；过期或已取消的异步结果不能重新写入页面。

## Katakana Terminator 致谢

YomiRuby 的可选联网片假名英文模块基于 Arnie97 与 Katakana Terminator Contributors 开发的 Katakana Terminator。该模块改编了 Katakana Terminator 的片假名匹配模式和 Google Translate 请求方案。YomiRuby 的本地汉字罗马音、Kuromoji 校验加载、隐私有界的 DOM 协调器、视口调度、请求取消、响应验收、可逆生命周期和双语控制属于独立实现。Katakana Terminator 使用 MIT License。

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

YomiRuby 自有代码与贡献采用 [MIT License](LICENSE)。第三方许可证与来源记录见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。0.3.0 不要求 CLA 或 DCO。
