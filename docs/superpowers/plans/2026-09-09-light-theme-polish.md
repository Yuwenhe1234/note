# 浅色主题视觉优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将浅色主题调整为层级清晰、低眩光的冷灰视觉体系。

**Architecture:** 扩展现有浅色 CSS 令牌，所有页面表面通过统一变量控制。浅色主题覆盖只改变颜色、边框和阴影，不改组件结构。

**Tech Stack:** CSS、React、Vitest。

---

### Task 1: 浅色主题令牌与页面表面

**Files:**

- Modify: `src/index.css`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`

- [ ] **Step 1: 写失败测试**

在主题测试中验证浅色模式设置根 dataset，并验证背景、导航和设置卡片使用不同的浅色表面值，而非同一纯白色。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx --run`

Expected: FAIL，当前浅色表面层级不足。

- [ ] **Step 3: 实现冷灰主题**

将浅色变量设为冷灰背景 `#eef1f0`、白色主表面、`#f5f7f6` 次表面、深炭文字和中灰辅助文字；绿色/蓝色/橙色在浅色主题使用更深值。为 header、卡片、输入、任务、设置、弹窗、登录页设置独立边框与轻阴影，降低网格和环境光强度。

- [ ] **Step 4: 验证**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx src/App.test.tsx --run && npm run build`

Expected: PASS，生产构建成功。

- [ ] **Step 5: 提交**

Run: `git add src/index.css src/L1-ui/features/settings/settings-center.test.tsx && git commit -m "style: refine light theme hierarchy"`
