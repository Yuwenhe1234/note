# 桌面任务组件设计

## 目标

通过 Tauri 将现有 React 项目包装为 Windows 桌面应用，提供可拖动、桌面置底、任务栏隐藏的任务组件。组件展示今日待办和仅含名称的任务清单，并支持今日待办的快速操作。

## 分阶段

- **第一阶段**：网页配置页 + 交互式预览（纯 React，浏览器内可用），配置随工作区按账户持久化。
- **第二阶段(已实现，需 `npm run tauri dev` + Rust 工具链验证)**：初始化 Tauri，创建置底可拖动的原生窗口，定义 invoke / event 边界。

---

## 第一阶段设计

### 入口与形态

“其他功能 → 放入桌面”进入**独立配置页**（而非模态框），沿用 `SettingsCenter` 的内部路由模式，带“返回”按钮；其余功能卡片保持现状。

### 配置项

| 字段 | 类型 | 默认值 |
| --- | --- | --- |
| `todayEnabled` 今日待办显示开关 | `boolean` | `true` |
| `tasksEnabled` 任务清单显示开关 | `boolean` | `true` |
| `todayLimit` 今日待办显示数量 | `number` | `5` |
| `tasksLimit` 任务清单显示数量 | `number` | `5` |
| `opacity` 透明度 | `number`(60–100) | `92` |
| `fontSize` 字体大小 | `"compact" \| "standard" \| "large"` | `"standard"` |

### 持久化

配置作为工作区快照的新字段 `desktopWidget`，写入 `.local/users/<id>/workspace-data.json`，按本机账户隔离；旧快照缺少该字段时回填默认值。同步更新 `server/workspace-store.ts` 与 `src/L4-data/workspace-repository.ts` 的类型定义。

### 组件拆分

从 `App.tsx` 抽出到 `src/L1-ui/features/desktop/`：

- `widget-model.ts` — 类型 + 默认值 + 归一化 / 合并（纯函数，可单测）
- `desktop-config-page.tsx` — 配置页（控件 + 实时预览 + 返回）
- `widget-preview.tsx` — 交互式预览（复用 `tasks` / `todayTodos` state，可勾选待办、点任务名跳转编辑）

### 测试

- `widget-model.test.ts`：默认值、合并、非法值（透明度越界、数量非法）归一化。
- `desktop-config-page.test.tsx`：开关 / 数量 / 透明度 / 字号控件生效、预览随配置变化、返回导航。

---

## 桌面组件（第二阶段原生窗口）

- 无边框、透明、跳过 Windows 任务栏、置底窗口；可从顶部标题栏拖动到任意桌面位置。
- 打开普通软件时组件被覆盖，不作为悬浮窗干扰工作。
- 顶部提供新增今日待办、设置和隐藏组件操作。

## 今日待办

- 单击切换完成状态。
- 双击编辑内容和提醒时间。
- 新增、删除和右键复用任务与主项目数据同步。

## 任务清单

- 只显示任务名称。
- 单击任务时显示主窗口，并导航到对应任务编辑界面。
- 不显示步骤、说明和目标，避免桌面组件变得过大。

## 同步与限制

- 组件与主窗口读取相同的本机账户工作区文件；主窗口写入后组件刷新。
- 第一阶段先完成网页配置页与交互式预览；第二阶段初始化 Tauri 并创建原生窗口。
- 若需要真正嵌入 Windows 图标后方，后续再评估 WorkerW 集成；第一版使用稳定的置底可拖动窗口。
