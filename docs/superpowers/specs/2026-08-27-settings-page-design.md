# 设置页第一版设计

## 目标

将 `App.tsx` 中「设置」视图当前的 5 个占位按钮，替换为一组可实际读写、可持久化、可测试的设置项。设置数据统一存放在浏览器 localStorage，延续现有 `js/L4-data/user-repository.js` 的偏好字段与命名，并为后续 L4 数据层 TS 化落点。

## 范围（第一版实现）

| 分组 | 设置项 | 说明 |
| --- | --- | --- |
| 外观与主题 | 主题模式（深色 / 浅色 / 跟随系统）、强调色、减少动态效果 | 深色为当前默认；动效开关符合设计文档对 reduced-motion 的要求 |
| AI 与 Agent 配置 | 执行节奏 `pace`、熟练程度 `proficiency`、是否自动分析、模型 / API Key（掩码保存） | `pace` / `proficiency` 对接已有字段 |
| 提醒方式 | 全局提醒开关、默认提醒时间（提前分钟数）、通知方式 | 对接已有 `reminders` 字段 |
| 数据管理 | 导出 JSON、导入 JSON、清空任务、恢复默认设置 | 清除与恢复需二次确认 |

**暂不做**：交互与行为、账号与同步、关于、键盘操作/快捷键说明。

## 架构（遵循五层边界）

- 新增 `src/L4-data/settings-repository.ts`：类型化设置的读写（localStorage `settings` 键），提供默认值、合并更新、掩码与容错。业务逻辑独立、可单测。
- 设置 UI 渲染在 `App.tsx` 的「设置」视图内，通过 `useSettings` hook 读取与更新 store。
- 保存即时生效并写入 localStorage。
- 数据管理：导出走浏览器文件下载；导入走文件上传解析。
- 不引入键盘快捷键说明。

## 数据模型

```ts
type Settings = {
  theme: "dark" | "light" | "system";
  accent: string;                 // 强调色 hex，默认 #a9ffbd
  reducedMotion: boolean;         // false
  pace: "slow" | "medium" | "fast";               // medium
  proficiency: "beginner" | "medium" | "expert";  // medium
  autoAnalyze: boolean;           // true
  model: string;                  // 默认 "rule-local"
  apiKey: string;                 // 掩码保存，默认空
  reminders: boolean;             // true
  remindBeforeMinutes: number;    // 30
  notifyVia: "browser" | "inapp" | "sound";
};
```

存储键：`settings`（延续 user-repository 约定）。

## 交互与安全约束

- API Key 不完整回显：只显示掩码（如 `sk-…****`），本地保存时提示安全说明。
- 数据清除 / 恢复默认：必须二次确认。
- 每个设置项的状态变化必须有文字或图形反馈，不只能靠颜色。

## 测试（TDD）

- `src/L4-data/settings-repository.test.ts`：默认值、合并保存、损坏数据容错（不覆盖原值）、掩码处理、非法值回退。
- `App` 层少量 UI 测试：设置项渲染、切换即时更新、导出 / 导入 / 清空动作存在。

## 不做（首轮边界）

- 不接入真实模型 / 外部 API（模型选择为占位，外部能力未配置时明确标注）。
- 不做账号、云同步、多设备。
- 不做键盘快捷键说明。
