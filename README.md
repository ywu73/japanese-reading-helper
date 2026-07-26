# YomiRuby

**Privacy-bounded reading annotations for Japanese web pages.**

YomiRuby 是一个面向 Tampermonkey 的日语网页阅读辅助项目。**0.2.0 本地候选**包含两个可独立控制的模块：

- **汉字罗马音**：在浏览器本地使用固定版本 Kuromoji 分析含汉字词，并显示带长音符号的 Hepburn 罗马音。
- **片假名英文**：仅在用户为当前精确 origin 明确授权后，把视口附近匹配到且去重的片假名词组发送给 Google Translate 无密钥端点，并在响应通过最低验收后显示英文 Ruby。

0.2.0 尚未安装，也没有完成真实 Tampermonkey、扩展后台网络、跨刷新资源缓存或 x.com 验证。自动化测试和本地构建不能替代这些浏览器门槛。

## 目标体验

原文：

```text
今日はゲームで日本語を勉強します。
```

两个模块都开启且片假名翻译有效时，结构示意为：

```html
<ruby>今日<rt>kyō</rt></ruby>は
<ruby>ゲーム<rt>game</rt></ruby>で
<ruby>日本語<rt>nihongo</rt></ruby>を
<ruby>勉強<rt>benkyō</rt></ruby>します。
```

## 控制与授权

Tampermonkey 菜单提供两个独立动态命令，不向网页注入悬浮控制面板：

- `开启/关闭本网站汉字罗马音`
- `开启/关闭本网站片假名英文`

两个模块对未配置 origin 均默认关闭。现有 0.1.4 设置 `yomi-ruby:auto-origin:<origin>` 继续只控制汉字模块；片假名使用独立的 `yomi-ruby:katakana-origin:<origin>`，绝不从汉字设置或旧 `jrr:auto-origin:` 推导联网同意。

第一次开启片假名模块时，确认框会说明匹配到的片假名词组将发送给 Google Translate，并说明不会发送完整句子、页面标题或网页 URL。取消时不保存、不扫描、不请求。关闭片假名模块会立即清空未发送队列、取消等待任务、尽力 abort 在途请求并关闭该 origin 的自动运行；再次开启必须重新确认。

## 数据与隐私边界

### 汉字罗马音

- 页面文字只传给当前页面内的 Kuromoji tokenizer。
- Kuromoji 可执行模块在构建时静态打包；十二个词典由固定 `@resource` URL 预载，版本、大小与 SHA-256 均固定并在运行时再次校验。
- 不使用远程读音、翻译、AI、分析或日志服务。

### 片假名英文

- 只发送 YomiRuby 安全正文节点内实际匹配到、已去重、已进入视口附近的片假名词组。
- 固定端点为 `https://translate.googleapis.com/translate_a/single`，固定为日语到英语的 GET 请求。
- `q` 查询参数包含片假名词组，因此词组可能出现在网络设备、代理或服务端日志中。
- 不发送周围汉字、平假名、完整句子、页面标题、页面 URL 或浏览历史。
- 不配置第二翻译服务，不做静默远程降级；Google 无密钥端点属于尽力而为能力，不承诺稳定性、可用性或翻译准确性。
- 匹配、成功、失败、待处理、在途状态和翻译结果只保存在当前页面内存中。

## 标注与冲突语义

- 汉字模块只标注含汉字且有可靠整词读音的 token；汉字假名混写词使用完整词读音，例如 `食べる → taberu`。
- 片假名匹配范围继承 Katakana Terminator 的全角、半角、长音和组合字符语义，但使用 YomiRuby 更严格的 DOM 安全范围。
- 不预判片假名是否真是英语借词；输出称“在线翻译”，不承诺还原英文词源。
- 响应必须是 trim 后非空、不同于原片假名且至少包含一个拉丁字母，并通过原词明确映射；缺项、重复、错配或无法解释时保留原文。
- 非重叠范围分别标注。发生重叠时片假名先获得处理机会；等待期间保留原文且不插入空 Ruby。
- 片假名成功时片假名英文胜出；重叠汉字只有存在独立可靠分析时才标注。片假名失败时释放保留范围，允许可靠整词汉字读音接管。
- 不生成嵌套 Ruby，也不使用双层自定义注音布局。

## DOM 与调度安全

- 每个 YomiRuby DOM 变更使用 `yomi-ruby-` / `data-yomi-ruby-` 前缀并可归因。
- 跳过脚本、样式、表单、编辑区、代码、隐藏内容、Ruby、SVG/MathML 等不安全或无关节点；普通链接文本允许处理。
- 保留作者 Ruby 与现有 `rt.katakana-terminator-rt` / `rt[data-rt]`，不覆盖、不嵌套。
- 页面级协调器统一决定两个模块的范围所有权、提交和回滚；最终开关状态决定最终 DOM，不依赖启动先后顺序。
- 只处理视口及附近内容，并通过 IntersectionObserver/MutationObserver 增量处理；用户从未接近的屏外片假名不会发送。
- 关闭、取消、目标改写或 generation 失效后，旧异步结果不能重新写入页面。

## 开发与构建

开发环境需要 Node `^20.19.0`、`^22.13.0` 或 `>=24.0.0`；`.nvmrc` 固定本地候选使用的 Node 版本。

```bash
npm test
npm run check
npm run verify:vendor
```

生成文件只有 `dist/yomi-ruby.user.js`。`src/` 是源代码真相，`dist/` 由 `scripts/build.mjs` 生成，禁止手改。`npm run check` 会运行自动化测试、真实本地词典加载、可行性/Blob 原型、构建与构建安全审计。

安装、停用旧脚本、真实 Chrome/x.com 操作、提交、推送和发布都属于独立外部动作，不包含在本地候选实施范围内。

## 目录

```text
src/              用户脚本源代码与页面级协调器
scripts/          构建、依赖与安全审计工具
vendor/           经核查的第三方资源清单
tests/unit/       纯逻辑测试
tests/integration/ DOM、生命周期、加载与请求边界测试
tests/fixtures/   受控网页夹具
docs/             安全边界、网络审计、手工计划和验证记录
work/prototypes/  尚未进入正式实现的实验或本地预览
dist/             生成的唯一可安装 userscript
```

## 非目标与未验证项

- 不提供远程汉字读音、AI 解释、学习记录、云同步或未知词逐字猜读。
- 不支持 Chrome 内部页、扩展页、本地文件或 iframe 注入。
- 不宣称能控制或回滚另一个仍在运行的独立 Katakana Terminator userscript；正式迁移需在真实验证后另行停用旧脚本。
- 不根据本地 jsdom/Node 测试声称真实 Tampermonkey 兼容、翻译准确、隐私抓包完整、性能达标或完整浏览器回滚。

历史候选证据保留在 `docs/verification-report-2026-07-25.md`、`docs/verification-report-0.1.3-2026-07-25.md` 和 `docs/verification-report-0.1.4-2026-07-26.md`；0.2.0 使用独立验证报告，不回写历史结论。
