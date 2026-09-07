# 贡献指南

感谢你愿意为 MemoAgent 贡献代码或文档。以下约定能帮助项目保持一致并顺利合并。

## 环境准备

- Node.js `20.19+` 或 `22.12+`(Vite 8 要求),并安装 npm。
- 首次运行前执行 `npm install`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器(默认 http://localhost:5173) |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅类型检查 |
| `npm test -- --run` | 单次运行测试 |
| `npm test` | 交互式(watch)测试 |

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/),提交信息格式:

```text
<type>: <简短描述>
```

常用 `type`:

- `feat`:新功能
- `fix`:缺陷修复
- `docs`:文档更新
- `refactor`:重构(不改行为)
- `test`:测试
- `chore`:构建 / 依赖 / 杂项

建议在改动较大或跨多个步骤时拆分提交,保持每个提交单一职责。

## 分层约定

项目遵循五层 Agent 架构,请按职责放置代码:

- **L1 交互接入层**(`src/L1-ui`):只负责渲染与交互,不写业务逻辑。
- **L4 数据持久层**(`src/L4-data`):数据模型、仓库与迁移。
- **L5 基础能力层**(`src/L5-services`):可复用的底层能力(如提醒)。
- **服务端**(`server/`):Vite 中间件,负责 AI 分析、账户与工作区持久化。

跨模块状态变化优先通过事件总线通知,避免模块间直接依赖;上层不绕过调度直接拼接复杂流程。

## 代码风格

- TypeScript 开启 `strict`,避免 `any` 滥用。
- 使用 [Prettier](https://prettier.io/) 统一格式。
- 新组件复用现有设计令牌与组件语言,不散落硬编码颜色 / 尺寸。

## 测试

- 逻辑层(L4 / L5 / server)需补充单元测试。
- UI 交互改动需补充 Testing Library 测试。
- 提交前运行 `npm test -- --run`、`npm run typecheck`、`npm run build`,确保全部通过。

## 文档同步

修改架构、页面、数据字段或核心流程后,请同步更新:

- `README.md`(对外说明)
- `PROJECT.md`(内部设计与扩展约定)
- `docs/superpowers/specs/`(设计文档)与 `docs/superpowers/plans/`(实施计划)

## 提交流程

1. 从 `main` 新建分支:`git checkout -b feat/xxx`。
2. 完成后运行测试、类型检查与构建。
3. 提交 Pull Request,并填写 PR 模板中的分层与验证信息。
