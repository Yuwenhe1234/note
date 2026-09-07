# 设置页第一版实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `App.tsx`「设置」视图的 5 个占位按钮替换为可读写、持久化、可测试的设置项（外观/主题、AI 与 Agent 配置、提醒方式、数据管理）。

**Architecture:** 新增类型化的 `settings-repository.ts`（L4 数据层，localStorage `settings` 键）负责读写与容错；新增 `useSettings` hook 供 UI 使用；设置 UI 渲染在 `App.tsx` 的「设置」视图内。严格 TDD，先写失败测试再实现。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + Vitest + Testing Library。

---

## 文件结构

- Create: `src/L4-data/settings-repository.ts` — 设置数据模型、默认值、读写、掩码、容错
- Test: `src/L4-data/settings-repository.test.ts`
- Create: `src/L1-ui/hooks/use-settings.ts` — React hook 封装
- Modify: `src/App.tsx` — 设置视图渲染（替换占位按钮）
- Test: `src/App.settings.test.tsx` — 设置 UI 测试

## 数据模型（与设计文档一致）

存储键：`settings`。默认值如下，枚举非法时回退默认。

```ts
type Settings = {
  theme: "dark" | "light" | "system";        // dark
  accent: string;                             // "#a9ffbd"
  reducedMotion: boolean;                     // false
  pace: "slow" | "medium" | "fast";           // medium
  proficiency: "beginner" | "medium" | "expert"; // medium
  autoAnalyze: boolean;                       // true
  model: string;                              // "rule-local"
  apiKey: string;                             // ""
  reminders: boolean;                         // true
  remindBeforeMinutes: number;                // 30
  notifyVia: "browser" | "inapp" | "sound";   // inapp
}
```

---

### Task 1: 类型化设置仓储（数据层）

**Files:**
- Test: `src/L4-data/settings-repository.test.ts`
- Create: `src/L4-data/settings-repository.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  getSettings,
  maskApiKey,
  resetSettings,
  saveSettings,
  type Settings,
} from "./settings-repository";

function memoryStorage(initial: Record<string, string> = {}) {
  let data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    dump: () => data,
  };
}

describe("settings-repository", () => {
  it("returns defaults when nothing is stored", () => {
    expect(getSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial updates and persists them", () => {
    const store = memoryStorage();
    const next = saveSettings({ pace: "fast" }, store);
    expect(next.pace).toBe("fast");
    expect(getSettings(store).pace).toBe("fast");
    expect(getSettings(store).proficiency).toBe(DEFAULT_SETTINGS.proficiency);
  });

  it("falls back to defaults on malformed JSON without overwriting storage", () => {
    const store = memoryStorage({ settings: "{not valid json" });
    expect(getSettings(store)).toEqual(DEFAULT_SETTINGS);
    expect(store.dump().settings).toBe("{not valid json");
  });

  it("ignores invalid enum values and keeps defaults", () => {
    const store = memoryStorage({
      settings: JSON.stringify({ theme: "neon", pace: "ultra" }),
    });
    const s = getSettings(store);
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(s.pace).toBe(DEFAULT_SETTINGS.pace);
  });

  it("masks an API key keeping the head and tail only", () => {
    expect(maskApiKey("sk-abcdef1234567890")).toBe("sk-a…7890");
    expect(maskApiKey("")).toBe("");
    expect(maskApiKey("short")).toBe("••••");
  });

  it("resets to defaults and persists them", () => {
    const store = memoryStorage({
      settings: JSON.stringify({ pace: "fast" }),
    });
    const reset = resetSettings(store);
    expect(reset).toEqual(DEFAULT_SETTINGS);
    expect(getSettings(store)).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --run src/L4-data/settings-repository.test.ts`
Expected: FAIL（`settings-repository` 不存在，模块解析错误）。

- [ ] **Step 3: 最小实现**

```ts
export type Theme = "dark" | "light" | "system";
export type Pace = "slow" | "medium" | "fast";
export type Proficiency = "beginner" | "medium" | "expert";
export type NotifyVia = "browser" | "inapp" | "sound";

export interface Settings {
  theme: Theme;
  accent: string;
  reducedMotion: boolean;
  pace: Pace;
  proficiency: Proficiency;
  autoAnalyze: boolean;
  model: string;
  apiKey: string;
  reminders: boolean;
  remindBeforeMinutes: number;
  notifyVia: NotifyVia;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#a9ffbd",
  reducedMotion: false,
  pace: "medium",
  proficiency: "medium",
  autoAnalyze: true,
  model: "rule-local",
  apiKey: "",
  reminders: true,
  remindBeforeMinutes: 30,
  notifyVia: "inapp",
};

const KEY = "settings";
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type Readable = Pick<Storage, "getItem">;

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

const THEMES: Theme[] = ["dark", "light", "system"];
const PACES: Pace[] = ["slow", "medium", "fast"];
const PROFICIENCIES: Proficiency[] = ["beginner", "medium", "expert"];
const NOTIFY: NotifyVia[] = ["browser", "inapp", "sound"];

function normalize(value: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== "object") return s;
  const v = value as Record<string, unknown>;
  if (THEMES.includes(v.theme as Theme)) s.theme = v.theme as Theme;
  if (typeof v.accent === "string" && v.accent) s.accent = v.accent;
  if (typeof v.reducedMotion === "boolean") s.reducedMotion = v.reducedMotion;
  if (PACES.includes(v.pace as Pace)) s.pace = v.pace as Pace;
  if (PROFICIENCIES.includes(v.proficiency as Proficiency))
    s.proficiency = v.proficiency as Proficiency;
  if (typeof v.autoAnalyze === "boolean") s.autoAnalyze = v.autoAnalyze;
  if (typeof v.model === "string" && v.model) s.model = v.model;
  if (typeof v.apiKey === "string") s.apiKey = v.apiKey;
  if (typeof v.reminders === "boolean") s.reminders = v.reminders;
  if (
    typeof v.remindBeforeMinutes === "number" &&
    v.remindBeforeMinutes > 0
  )
    s.remindBeforeMinutes = v.remindBeforeMinutes;
  if (NOTIFY.includes(v.notifyVia as NotifyVia))
    s.notifyVia = v.notifyVia as NotifyVia;
  return s;
}

export function getSettings(storage: Readable = localStorage): Settings {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalize(JSON.parse(raw));
  } catch {
    // Malformed data: return defaults but do NOT overwrite the stored value.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(
  updates: Partial<Settings>,
  storage: StorageLike = localStorage,
): Settings {
  const merged = { ...getSettings(storage), ...updates };
  storage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export function resetSettings(storage: StorageLike = localStorage): Settings {
  storage.setItem(KEY, JSON.stringify(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --run src/L4-data/settings-repository.test.ts`
Expected: PASS。

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/L4-data/settings-repository.ts src/L4-data/settings-repository.test.ts
git commit -m "feat: add typed settings repository"
```

---

### Task 2: `useSettings` hook

**Files:**
- Create: `src/L1-ui/hooks/use-settings.ts`

- [ ] **Step 1: 实现 hook**

```ts
import { useCallback, useState } from "react";
import {
  getSettings,
  resetSettings,
  saveSettings,
  type Settings,
} from "../../L4-data/settings-repository";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  const update = useCallback((updates: Partial<Settings>) => {
    setSettings(saveSettings(updates));
  }, []);

  const reset = useCallback(() => {
    setSettings(resetSettings());
  }, []);

  return { settings, update, reset };
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add src/L1-ui/hooks/use-settings.ts
git commit -m "feat: add useSettings hook"
```

---

### Task 3: 设置视图 UI（外观 / AI / 提醒 / 数据）

**Files:**
- Modify: `src/App.tsx` — 在设置视图接入 `useSettings`
- Test: `src/App.settings.test.tsx`

- [ ] **Step 1: 写失败 UI 测试**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import "./index.css";

describe("settings view", () => {
  const openSettings = () =>
    fireEvent.click(screen.getByRole("button", { name: "设置" }));

  it("renders the four setting groups", () => {
    render(<App />);
    openSettings();
    expect(screen.getByText("外观与主题")).toBeInTheDocument();
    expect(screen.getByText("AI 与 Agent")).toBeInTheDocument();
    expect(screen.getByText("提醒方式")).toBeInTheDocument();
    expect(screen.getByText("数据管理")).toBeInTheDocument();
  });

  it("toggles reduced motion and persists it", () => {
    render(<App />);
    openSettings();
    const toggle = screen.getByRole("switch", { name: "减少动态效果" });
    fireEvent.click(toggle);
    expect(JSON.parse(localStorage.getItem("settings")!).reducedMotion).toBe(
      true,
    );
  });

  it("masks the API key display", () => {
    localStorage.setItem(
      "settings",
      JSON.stringify({ apiKey: "sk-abcdef1234567890" }),
    );
    render(<App />);
    openSettings();
    expect(screen.getByText("sk-a…7890")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --run src/App.settings.test.tsx`
Expected: FAIL（设置视图仍是占位按钮）。

- [ ] **Step 3: 实现设置视图**

在 `App.tsx` 顶部引入：

```tsx
import {
  maskApiKey,
  type Settings,
} from "./L4-data/settings-repository";
import { useSettings } from "./L1-ui/hooks/use-settings";
```

在 `App` 组件内加入：

```tsx
const { settings, update, reset } = useSettings();
```

将设置视图替换为（可复用现有 `.settings` 样式）：

```tsx
{view === "设置" && (
  <Page over="PREFERENCES" title="让 Agent 更懂你">
    <div className="settings-groups">
      <SettingsGroup title="外观与主题">
        <SettingRow label="主题模式">
          <select
            aria-label="主题模式"
            value={settings.theme}
            onChange={(e) =>
              update({ theme: e.target.value as Settings["theme"] })
            }
          >
            <option value="dark">深色</option>
            <option value="light">浅色</option>
            <option value="system">跟随系统</option>
          </select>
        </SettingRow>
        <SettingRow label="减少动态效果">
          <input
            type="checkbox"
            role="switch"
            aria-label="减少动态效果"
            checked={settings.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="AI 与 Agent">
        <SettingRow label="执行节奏">
          <select
            aria-label="执行节奏"
            value={settings.pace}
            onChange={(e) =>
              update({ pace: e.target.value as Settings["pace"] })
            }
          >
            <option value="slow">慢</option>
            <option value="medium">中</option>
            <option value="fast">快</option>
          </select>
        </SettingRow>
        <SettingRow label="熟练程度">
          <select
            aria-label="熟练程度"
            value={settings.proficiency}
            onChange={(e) =>
              update({
                proficiency: e.target.value as Settings["proficiency"],
              })
            }
          >
            <option value="beginner">新手</option>
            <option value="medium">中等</option>
            <option value="expert">熟练</option>
          </select>
        </SettingRow>
        <SettingRow label="自动分析">
          <input
            type="checkbox"
            role="switch"
            aria-label="自动分析"
            checked={settings.autoAnalyze}
            onChange={(e) => update({ autoAnalyze: e.target.checked })}
          />
        </SettingRow>
        <SettingRow label="模型 / API Key">
          <span aria-label="API Key 显示">
            {settings.apiKey
              ? maskApiKey(settings.apiKey)
              : "未配置（本地规则引擎）"}
          </span>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="提醒方式">
        <SettingRow label="开启提醒">
          <input
            type="checkbox"
            role="switch"
            aria-label="开启提醒"
            checked={settings.reminders}
            onChange={(e) => update({ reminders: e.target.checked })}
          />
        </SettingRow>
        <SettingRow label="默认提前（分钟）">
          <input
            aria-label="默认提前分钟"
            type="number"
            min={1}
            value={settings.remindBeforeMinutes}
            onChange={(e) =>
              update({
                remindBeforeMinutes: Math.max(
                  1,
                  Number(e.target.value) || 1,
                ),
              })
            }
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="数据管理">
        <button className="new" onClick={() => alert("导出（占位）")}>
          导出 JSON
        </button>
        <button className="new" onClick={() => alert("导入（占位）")}>
          导入 JSON
        </button>
        <button className="danger" onClick={() => alert("清空任务（占位）")}>
          清空任务
        </button>
        <button className="danger" onClick={() => reset()}>
          恢复默认设置
        </button>
      </SettingsGroup>
    </div>
  </Page>
)}
```

在文件末尾新增两个小组件（或置于 `Page` 附近）：

```tsx
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-group">
      <h3>{title}</h3>
      <div className="settings-group-body">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      {children}
    </label>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --run src/App.settings.test.tsx`
Expected: PASS。

- [ ] **Step 5: 全量回归**

Run: `npm test -- --run`
Expected: 全部通过（含原有 `App.test.tsx`）。

- [ ] **Step 6: 类型检查 + 构建**

Run: `npm run typecheck && npm run build`
Expected: 均成功。

- [ ] **Step 7: 提交**

```bash
git add src/App.tsx src/App.settings.test.tsx
git commit -m "feat: implement functional settings page"
```

---

### Task 4: 更新 PROJECT.md

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: 更新设置相关说明**

在 `PROJECT.md` 的设置描述处补充：设置页现包含 外观与主题 / AI 与 Agent / 提醒方式 / 数据管理 四组，数据存 localStorage `settings` 键。

- [ ] **Step 2: 提交**

```bash
git add PROJECT.md
git commit -m "docs: document settings page"
```
