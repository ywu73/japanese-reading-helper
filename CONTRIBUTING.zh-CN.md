# 参与 YomiRuby 贡献

[English](CONTRIBUTING.md)

感谢你帮助改进 YomiRuby。普通缺陷、文档问题和功能提案可以通过 GitHub Issues 讨论；安全或隐私漏洞必须按 [SECURITY.md](SECURITY.md) 报告，不要使用公开 Issue。

提交变更前：

1. 保持 `AGENTS.md` 中的隐私和产品边界。新增远程端点、可执行资源、分析链路、持久化数据类别或兼容性声明，都需要单独的明确产品决策。
2. 在公开接缝上补充面向行为的测试，不得削弱取消、完整性、DOM 所有权、响应验收和回滚检查。
3. 把 `src/` 视为源代码，通过构建脚本重新生成 `dist/yomi-ruby.user.js`，禁止手工修改 `dist`。
4. 保留第三方版权、许可证、NOTICE 和来源记录。
5. 运行完整本地门槛：

```bash
npm ci
npm test
npm run check
npm run verify:vendor
npm run verify:deterministic-build
```

变更说明应写清改动内容、涉及的隐私或网络表面、实际执行的命令，以及仍未验证的浏览器或发布声明。贡献采用 YomiRuby 的 MIT License。0.4.0 不要求 Contributor License Agreement 或 Developer Certificate of Origin。
