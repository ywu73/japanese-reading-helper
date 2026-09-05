# 日语阅读助手 0.6.2 改名与升级说明

YomiRuby 更名为 **日语阅读助手 / Japanese Reading Helper**。

| 项目 | 新名称 |
| --- | --- |
| 中文用户脚本名称 | 日语阅读助手 — 汉字罗马音与片假名英译 |
| 英文用户脚本名称 | Japanese Reading Helper — Kanji Romaji & Katakana English |
| GitHub 仓库与 npm 包名 | `japanese-reading-helper` |
| 版本 | `0.6.2` |

## 安装与已有设置

为延续已有安装，构建产物仍为 `dist/yomi-ruby.user.js`，命名空间仍为
`yomi-ruby.local`。全部五类持久化设置键、DOM 所有权前缀、字典资源名和内部
JavaScript 接口保持原名。本次没有改变注音、翻译、联网权限或默认开关行为。

新的主页、问题反馈和 GitHub Raw 更新地址使用
`https://github.com/ywu73/japanese-reading-helper` 对应的仓库路径。
Greasy Fork 沿用脚本编号 `589223`，不新建第二个脚本条目。

GitHub 官方说明仓库改名后会重定向原仓库的网页与 Git 操作；不要重新创建
`ywu73/yomi-ruby`，否则旧地址的重定向会失效。
来源：[GitHub 仓库改名说明](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)。

## 版本与历史材料

0.6.2 统一使用新的中英文名称。GitHub 仓库改名、推送 `main` 与更新
Greasy Fork 已分别执行并核验。历史验证报告、固定提交安装文件和原始截图仍保留
YomiRuby 名称；中文使用指南已明确标记其固定链接对应旧版 0.6.0。

保留设置键和命名空间不能替代真实升级测试。应按
[浏览器手工测试计划](manual-test-plan.md#1-artifact-metadata-install-and-update)
验证从旧版更新后的单一脚本条目、设置保留、精确网站开关，以及旧/新仓库地址
的更新行为。真实 Chrome/Tampermonkey 升级尚未验证。

## 2026-09-05 发布与验证记录

- GitHub 已更名为 `ywu73/japanese-reading-helper`；仓库 ID 仍为
  `1312757637`，本地 `origin` 已同步。远端 `main` 为
  `fab8c9267406c793bbef4ac32aceaf34e1d0427b`。
- 原仓库网页重定向到新名称并返回 HTTP 200；新旧仓库路径的 GitHub Raw
  `main/dist/yomi-ruby.user.js` 均返回 HTTP 200。
- 使用新仓库名、固定在 `c4f5660bf7e632351b9e3a329e8dd13316584784`
  的 jsDelivr 0.6.0 安装链接返回 HTTP 200。
- Greasy Fork 脚本 `589223` 已更新并公开显示版本 `0.6.2`；中文标题为
  `日语阅读助手 — 汉字罗马音与片假名英译`，英文页面标题为
  `Japanese Reading Helper — Kanji Romaji & Katakana English`，支持链接已指向
  `ywu73/japanese-reading-helper/issues`。
- Node 24.14.0：`npm run check` 通过，包括 220 项测试、真实本地词典加载、
  feasibility/resource prototype、构建与元数据审计。
- `npm run verify:vendor` 通过，12 项固定字典资源的大小与 SHA-256 均匹配。
  直连超时后仅在校验命令中使用现有系统代理；没有修改持久代理配置。
- `npm run verify:deterministic-build` 通过；在工作区内按 lockfile 离线安装依赖后，
  连续两次构建相同，产物为 254448 字节，SHA-256 为
  `b8b30c4e4757129a9ad50d64bb2d9e89255efbab05f2357f75ff4bcd6a9f4608`。
- `git diff --check` 通过。原中文指南工作区的未提交文件保留原样，改名工作区
  使用其指南与七张配图的副本；历史报告与第三方资源内容未改写。

## 发布授权

用户已明确授权提交、合并、只推送 `main`，并更新现有 Greasy Fork 脚本条目，
包括上述中英文名称。此授权不代表真实浏览器升级或兼容性验证已经完成。
