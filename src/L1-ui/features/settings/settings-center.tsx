import { useEffect, useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { AiSettings } from "../ai/ai-settings";
import {
  loadSettings,
  resetSettings,
  saveSettings,
} from "../../../L4-data/settings-repository";
import {
  createBackup,
  parseBackup,
  type BackupTask,
} from "../../../L4-data/backup-schema";
import { browserReminderService } from "../../../L5-services/reminder-service";
import { PageBackButton } from "../../components/page-back-button";

type Route =
  | "root"
  | "task-defaults"
  | "ai"
  | "reminders"
  | "appearance"
  | "interaction"
  | "data"
  | "diagnostics";
const cards: {
  route: Exclude<Route, "root">;
  title: string;
  description: string;
}[] = [
  {
    route: "task-defaults",
    title: "任务默认值",
    description: "新任务、排序与今日待办",
  },
  { route: "ai", title: "AI 与 API", description: "服务商、模型与连接状态" },
  { route: "reminders", title: "提醒方式", description: "通知权限与提醒规则" },
  {
    route: "appearance",
    title: "外观与主题",
    description: "主题、颜色、字体与密度",
  },
  {
    route: "interaction",
    title: "交互与快捷操作",
    description: "动画、确认与编辑方式",
  },
  { route: "data", title: "数据管理", description: "备份、恢复与清理" },
  {
    route: "diagnostics",
    title: "关于与诊断",
    description: "版本、服务与错误信息",
  },
];

export function SettingsCenter({
  tasks = [],
  onImportTasks,
  onClearCompleted,
  onClearAll,
}: {
  tasks?: BackupTask[];
  onImportTasks?: (tasks: BackupTask[]) => void;
  onClearCompleted?: () => void;
  onClearAll?: () => void;
}) {
  const [route, setRoute] = useState<Route>("root");
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    saveSettings(settings);
    document.documentElement.dataset.accent = settings.appearance.accent;
    document.documentElement.dataset.fontSize = settings.appearance.fontSize;
    document.documentElement.dataset.density = settings.appearance.density;
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.interaction.reducedMotion || !settings.interaction.animations,
    );
  }, [settings]);
  if (route === "root")
    return (
      <>
        <section className="page">
          <em>PREFERENCES</em>
          <h1>让 Agent 更懂你</h1>
        </section>
        <div className="settings">
          {cards.map((card) => (
            <button
              key={card.route}
              aria-label={card.title}
              onClick={() => setRoute(card.route)}
            >
              <Settings2 />
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <span>进入</span>
            </button>
          ))}
        </div>
      </>
    );
  const card = cards.find((item) => item.route === route)!;
  return (
    <>
      <section className="page settings-page-title">
        <em>SETTINGS</em>
        <h1>{card.title}</h1>
      </section>
      <PageBackButton label="返回设置" onClick={() => setRoute("root")} />
      {route === "ai" ? (
        <AiSettings />
      ) : route === "task-defaults" ? (
        <section className="settings-panel">
          <SettingSelect
            label="默认优先级"
            value={settings.taskDefaults.defaultPriority}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: {
                  ...current.taskDefaults,
                  defaultPriority:
                    value as typeof current.taskDefaults.defaultPriority,
                },
              }))
            }
            options={["low:低", "medium:中", "high:高"]}
          />
          <SettingNumber
            label="默认预计时长"
            value={settings.taskDefaults.defaultDurationMinutes}
            min={5}
            max={1440}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: {
                  ...current.taskDefaults,
                  defaultDurationMinutes: value,
                },
              }))
            }
          />
          <SettingNumber
            label="最少步骤"
            value={settings.taskDefaults.minSteps}
            min={2}
            max={8}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: { ...current.taskDefaults, minSteps: value },
              }))
            }
          />
          <SettingNumber
            label="最多步骤"
            value={settings.taskDefaults.maxSteps}
            min={2}
            max={8}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: { ...current.taskDefaults, maxSteps: value },
              }))
            }
          />
          <SettingSelect
            label="完成任务"
            value={settings.taskDefaults.completedVisibility}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: {
                  ...current.taskDefaults,
                  completedVisibility:
                    value as typeof current.taskDefaults.completedVisibility,
                },
              }))
            }
            options={["show:继续显示", "hide:自动隐藏"]}
          />
          <SettingSelect
            label="默认排序"
            value={settings.taskDefaults.sortBy}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                taskDefaults: {
                  ...current.taskDefaults,
                  sortBy: value as typeof current.taskDefaults.sortBy,
                },
              }))
            }
            options={["created:创建时间", "priority:优先级", "title:标题"]}
          />
        </section>
      ) : route === "diagnostics" ? (
        <DiagnosticsPanel />
      ) : route === "data" ? (
        <DataPanel
          tasks={tasks}
          settings={settings}
          onImport={(backup) => {
            onImportTasks?.(backup.tasks);
            setSettings(backup.settings);
          }}
          onClearCompleted={onClearCompleted}
          onClearAll={onClearAll}
          onReset={() => setSettings(resetSettings())}
        />
      ) : route === "reminders" ? (
        <ReminderPanel
          value={settings.reminders}
          onChange={(reminders) =>
            setSettings((current) => ({ ...current, reminders }))
          }
        />
      ) : route === "interaction" ? (
        <section className="settings-panel">
          <SettingToggle
            label="页面切换动画"
            checked={settings.interaction.animations}
            onChange={(animations) =>
              setSettings((current) => ({
                ...current,
                interaction: { ...current.interaction, animations },
              }))
            }
          />
          <SettingToggle
            label="减少动态效果"
            checked={settings.interaction.reducedMotion}
            onChange={(reducedMotion) =>
              setSettings((current) => ({
                ...current,
                interaction: { ...current.interaction, reducedMotion },
              }))
            }
          />
          <SettingToggle
            label="完成任务前确认"
            checked={settings.interaction.confirmComplete}
            onChange={(confirmComplete) =>
              setSettings((current) => ({
                ...current,
                interaction: { ...current.interaction, confirmComplete },
              }))
            }
          />
          <SettingToggle
            label="新建任务自动聚焦"
            checked={settings.interaction.autoFocus}
            onChange={(autoFocus) =>
              setSettings((current) => ({
                ...current,
                interaction: { ...current.interaction, autoFocus },
              }))
            }
          />
        </section>
      ) : route === "appearance" ? (
        <section className="settings-panel">
          <SettingSelect
            label="强调色"
            value={settings.appearance.accent}
            onChange={(accent) =>
              setSettings((current) => ({
                ...current,
                appearance: {
                  ...current.appearance,
                  accent: accent as typeof current.appearance.accent,
                },
              }))
            }
            options={["green:绿色", "blue:蓝色", "orange:橙色"]}
          />
          <SettingSelect
            label="字体大小"
            value={settings.appearance.fontSize}
            onChange={(fontSize) =>
              setSettings((current) => ({
                ...current,
                appearance: {
                  ...current.appearance,
                  fontSize: fontSize as typeof current.appearance.fontSize,
                },
              }))
            }
            options={["compact:紧凑", "standard:标准", "large:宽松"]}
          />
          <SettingSelect
            label="界面密度"
            value={settings.appearance.density}
            onChange={(density) =>
              setSettings((current) => ({
                ...current,
                appearance: {
                  ...current.appearance,
                  density: density as typeof current.appearance.density,
                },
              }))
            }
            options={["compact:紧凑", "standard:标准", "comfortable:舒适"]}
          />
        </section>
      ) : (
        <SettingsPlaceholder title={card.title} />
      )}
    </>
  );
}

function SettingSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const [id, name] = option.split(":");
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function SettingNumber({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Math.min(max, Number(event.target.value))))
        }
      />
    </label>
  );
}

function SettingsPlaceholder({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="settings-panel" aria-label={`${title}配置`}>
      {children || <p>配置项将在对应实现任务中接入实际功能。</p>}
    </section>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function DataPanel({
  tasks,
  settings,
  onImport,
  onClearCompleted,
  onClearAll,
  onReset,
}: {
  tasks: BackupTask[];
  settings: ReturnType<typeof loadSettings>;
  onImport: (backup: ReturnType<typeof createBackup>) => void;
  onClearCompleted?: () => void;
  onClearAll?: () => void;
  onReset: () => void;
}) {
  const [message, setMessage] = useState("");
  const download = () => {
    const blob = new Blob(
      [JSON.stringify(createBackup(tasks, settings), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `memo-agent-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("备份已导出");
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      onImport(parseBackup(await file.text()));
      setMessage("备份已导入");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败");
    }
  };
  return (
    <section className="settings-panel data-actions">
      <button onClick={download}>导出完整备份</button>
      <label>
        导入 JSON 备份
        <input
          aria-label="导入 JSON 备份"
          type="file"
          accept="application/json"
          onChange={(event) => importFile(event.target.files?.[0])}
        />
      </label>
      <button onClick={onClearCompleted}>清除已完成任务</button>
      <button
        onClick={() => {
          if (prompt("输入“清除全部任务”确认") === "清除全部任务")
            onClearAll?.();
        }}
      >
        清除全部任务
      </button>
      <button
        onClick={() => {
          if (confirm("恢复所有设置为默认值？")) onReset();
        }}
      >
        恢复默认设置
      </button>
      {message && <p className="ai-message">{message}</p>}
    </section>
  );
}

function ReminderPanel({
  value,
  onChange,
}: {
  value: ReturnType<typeof loadSettings>["reminders"];
  onChange: (value: ReturnType<typeof loadSettings>["reminders"]) => void;
}) {
  const [message, setMessage] = useState("");
  const permission =
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission;
  const enable = async (checked: boolean) => {
    if (!checked) {
      onChange({ ...value, notifications: false });
      setMessage("浏览器通知已关闭");
      return false;
    }
    if (permission === "unsupported") {
      onChange({ ...value, notifications: false });
      setMessage("当前浏览器不支持通知");
      return false;
    }
    const granted = await browserReminderService.enable();
    onChange({ ...value, notifications: granted });
    setMessage(
      granted
        ? "浏览器通知已启用"
        : "通知权限被拒绝，请在浏览器地址栏权限中重新允许",
    );
    return granted;
  };
  const test = async () => {
    if (permission === "unsupported") {
      setMessage("当前浏览器不支持通知");
      return;
    }
    const granted = permission === "granted" || (await enable(true));
    if (granted && browserReminderService.test()) setMessage("测试通知已发送");
  };
  return (
    <section className="settings-panel reminder-panel">
      <div className="setting-row">
        <div>
          <strong>浏览器通知</strong>
          <small>
            权限状态：
            {permission === "granted"
              ? "已允许"
              : permission === "denied"
                ? "已拒绝"
                : permission === "default"
                  ? "未授权"
                  : "不支持"}
          </small>
        </div>
        <input
          aria-label="浏览器通知"
          type="checkbox"
          checked={value.notifications && permission === "granted"}
          onChange={(event) => enable(event.target.checked)}
        />
      </div>
      <SettingNumber
        label="默认提前分钟"
        value={value.defaultLeadMinutes}
        min={0}
        max={1440}
        onChange={(defaultLeadMinutes) =>
          onChange({ ...value, defaultLeadMinutes })
        }
      />
      <SettingToggle
        label="逾期提醒"
        checked={value.overdueReminder}
        onChange={(overdueReminder) => onChange({ ...value, overdueReminder })}
      />
      <div className="settings-action-row">
        <button className="btn-secondary" onClick={test}>
          发送测试通知
        </button>
      </div>
      {message && (
        <p className="setting-feedback" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function DiagnosticsPanel() {
  const [api, setApi] = useState("检查中");
  const [provider, setProvider] = useState("未配置");
  useEffect(() => {
    fetch("/api/ai/config")
      .then((response) => response.json())
      .then((result) => {
        setApi(result.ok ? "在线" : "异常");
        if (result.ok)
          setProvider(`${result.data.provider} / ${result.data.model}`);
      })
      .catch(() => setApi("离线"));
  }, []);
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    bytes += key.length + (localStorage.getItem(key) || "").length;
  }
  const permission =
    typeof Notification === "undefined" ? "不支持" : Notification.permission;
  const text = `MemoAgent 0.2.0\n数据版本: 1\n本地 API: ${api}\n当前模型: ${provider}\n通知权限: ${permission}\n存储字符数: ${bytes}`;
  return (
    <section className="settings-panel diagnostics">
      <p>应用版本：0.2.0</p>
      <p>数据版本：1</p>
      <p>本地 API：{api}</p>
      <p>当前模型：{provider}</p>
      <p>通知权限：{permission}</p>
      <p>存储字符数：{bytes}</p>
      <button
        className="btn-secondary"
        onClick={() => navigator.clipboard?.writeText(text)}
      >
        复制诊断信息
      </button>
    </section>
  );
}
