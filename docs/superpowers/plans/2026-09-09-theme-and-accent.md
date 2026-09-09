# 深浅主题与全站强调色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除字体与密度设置，加入持久化深浅主题并让强调色覆盖全站交互元素。

**Architecture:** 启动阶段从设置仓库把 `theme` 与 `accent` 写入根元素 dataset。CSS 使用统一的强调色、透明派生色与主题表面变量，登录页和主应用共享同一组令牌。

**Tech Stack:** React、TypeScript、CSS、Vitest、Testing Library。

---

### Task 1: 设置界面与启动恢复

**Files:**

- Modify: `src/L1-ui/features/settings/settings-center.tsx`
- Modify: `src/L1-ui/features/settings/settings-center.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/L4-data/settings-repository.test.ts`

- [ ] **Step 1: 写失败测试**

验证外观页仅有“主题”“强调色”，不存在“字体大小”“界面密度”；选择浅色和蓝色后根元素 dataset 更新，重新渲染登录页前仍从本地设置恢复。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx src/L4-data/settings-repository.test.ts --run`

Expected: FAIL，主题控件和启动恢复尚不存在。

- [ ] **Step 3: 实现最小功能**

外观页新增 `主题` 下拉框（dark/light），删除字体和密度控件。在 SettingsCenter effect 同时写入 `dataset.theme` 与 `dataset.accent`。在 `main.tsx` React 渲染前调用 `loadSettings()` 并设置两个 dataset，保证登录页和刷新首帧使用保存值。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- src/L1-ui/features/settings/settings-center.test.tsx src/L4-data/settings-repository.test.ts --run && npm run typecheck`

Expected: PASS。

Run: `git add src/L1-ui/features/settings/settings-center.tsx src/L1-ui/features/settings/settings-center.test.tsx src/main.tsx src/L4-data/settings-repository.test.ts && git commit -m "feat: add persistent dark and light themes"`

### Task 2: 全站主题与强调色令牌

**Files:**

- Modify: `src/index.css`
- Modify: `src/App.test.tsx`
- Modify: `src/L1-ui/features/auth/login-screen.tsx`

- [ ] **Step 1: 写失败测试**

验证切换蓝色后品牌图标、登录图标和按钮 focus/hover 使用 `--accent-user`；浅色主题根背景、卡片和输入框使用浅色表面令牌。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- src/App.test.tsx src/L1-ui/features/settings/settings-center.test.tsx --run`

Expected: FAIL，CSS 中仍有写死绿色且没有浅色主题令牌。

- [ ] **Step 3: 实现令牌化 CSS**

定义 `--accent-user`、`--accent-soft`、`--accent-border`、`--accent-glow`、`--page-bg`、`--surface-*`、`--text-*`。将全站交互相关 `#a9ffbd`/`#8fffa9` 替换为变量或 `color-mix` 派生色。增加 `html[data-theme="light"]` 的页面、卡片、输入和文字覆盖；品牌圆形图标与登录页图标统一使用强调色。

- [ ] **Step 4: 完整验证并提交**

Run: `npm test -- src/App.test.tsx src/L1-ui/features/settings/settings-center.test.tsx --run && npm run build`

Expected: PASS，且生产构建成功。

Run: `git add src/index.css src/App.test.tsx src/L1-ui/features/auth/login-screen.tsx && git commit -m "feat: apply theme and accent colors across the app"`
