import { useState } from "react";
import { MonitorUp } from "lucide-react";
import type { Task } from "../../../L4-data/task-model";
import type { StoredTodayTodo } from "../../../L4-data/workspace-repository";
import { type DesktopWidgetSettings } from "./widget-model";
import { WidgetPreview } from "./widget-preview";
import { openDesktopWidget } from "../../../L5-services/widget-window";
import { PageBackButton } from "../../components/page-back-button";

export function DesktopConfigPage({
  settings,
  onChange,
  siteName,
  tasks,
  todayTodos,
  onToggleToday,
  onAddToday,
  onOpenTask,
  onBack,
}: {
  settings: DesktopWidgetSettings;
  onChange: (next: DesktopWidgetSettings) => void;
  siteName: string;
  tasks: Task[];
  todayTodos: StoredTodayTodo[];
  onToggleToday: (id: string) => void;
  onAddToday: () => void;
  onOpenTask: (task: Task) => void;
  onBack: () => void;
}) {
  const set = (patch: Partial<DesktopWidgetSettings>) =>
    onChange({ ...settings, ...patch });
  const [placeStatus, setPlaceStatus] = useState("");
  return (
    <>
      <PageBackButton label="返回更多功能" onClick={onBack} />
      <section className="page">
        <em>DESKTOP WIDGET</em>
        <h1>放入桌面</h1>
      </section>
      <div className="desktop-config-page">
        <section className="settings-panel desktop-controls" aria-label="桌面组件配置">
          <label className="setting-row">
            <span>显示今日待办</span>
            <input
              type="checkbox"
              aria-label="显示今日待办"
              checked={settings.todayEnabled}
              onChange={(e) => set({ todayEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>显示任务清单</span>
            <input
              type="checkbox"
              aria-label="显示任务清单"
              checked={settings.tasksEnabled}
              onChange={(e) => set({ tasksEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>今日待办数量</span>
            <input
              type="number"
              aria-label="今日待办数量"
              min={1}
              max={5}
              disabled={!settings.todayEnabled}
              value={settings.todayLimit}
              onChange={(e) => set({ todayLimit: Number(e.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>任务清单数量</span>
            <input
              type="number"
              aria-label="任务清单数量"
              min={1}
              max={20}
              disabled={!settings.tasksEnabled}
              value={settings.tasksLimit}
              onChange={(e) => set({ tasksLimit: Number(e.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>透明度</span>
            <input
              type="range"
              aria-label="透明度"
              min={60}
              max={100}
              value={settings.opacity}
              onChange={(e) => set({ opacity: Number(e.target.value) })}
            />
          </label>
          <fieldset className="widget-theme-control">
            <legend>外观模式</legend>
            {([
              ["system", "跟随系统"],
              ["dark", "深色"],
              ["light", "浅色"],
            ] as const).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="widget-theme"
                  value={value}
                  checked={settings.theme === value}
                  onChange={() => set({ theme: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </section>
        <WidgetPreview
          settings={settings}
          siteName={siteName}
          tasks={tasks}
          todayTodos={todayTodos}
          onToggleToday={onToggleToday}
          onAddToday={onAddToday}
          onOpenTask={onOpenTask}
        />
      </div>
      <div className="desktop-widget-actions">
        <button
          className="primary"
          onClick={() =>
            openDesktopWidget()
              .then((result) => {
                if (result === "created") setPlaceStatus("已放入 Windows 11 桌面，请到桌面右下角查看。");
                else if (result === "shown") setPlaceStatus("桌面组件已在显示中，已为你带到前台。");
                else setPlaceStatus("正在通过 Windows 桌面助手启动挂件…");
              })
              .catch((err) => setPlaceStatus(err instanceof Error ? `创建失败：${err.message}` : "创建失败，请查看终端日志。"))
          }
        >
          运行桌面挂件 <MonitorUp aria-hidden="true" />
        </button>
        {placeStatus && <p className="desktop-phase-note">{placeStatus}</p>}
      </div>
    </>
  );
}
