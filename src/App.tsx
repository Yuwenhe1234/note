import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Plus,
  Check,
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowLeft,
  MessageCircle,
  Heart,
  Newspaper,
  Network,
  MonitorUp,
  Mic,
X,
} from "lucide-react";
import { AiSettings } from "./L1-ui/features/ai/ai-settings";
import { SettingsCenter } from "./L1-ui/features/settings/settings-center";
import { loadSettings } from "./L4-data/settings-repository";
import { applyEditableText, loadWorkspace, readEditableText, saveWorkspace } from "./L4-data/workspace-repository";
import {
  createSteps,
  migrateTask,
  taskDuration,
  taskProgress,
  toggleAllSteps,
  type Task,
  type TaskStep,
} from "./L4-data/task-model";
import { TaskSteps } from "./L1-ui/features/tasks/task-steps";
import { AnalysisStepEditor } from "./L1-ui/features/tasks/analysis-step-editor";
import { TaskDescriptionDialog } from "./L1-ui/features/tasks/task-description-dialog";
import {
  analyzeTask,
  type TaskAnalysis,
} from "./L1-ui/features/tasks/analyze-task";
import { DesktopConfigPage } from "./L1-ui/features/desktop/desktop-config-page";
import {
  type DesktopWidgetSettings,
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from "./L1-ui/features/desktop/widget-model";
import { NewsWindow } from "./L1-ui/features/news/news-window";
import { refreshNews } from "./L1-ui/features/news/news-client";
import { createNewsRepository } from "./L4-data/news-repository";
import { createNewsRefreshScheduler } from "./L5-services/news-refresh-scheduler";
import { generateTodayTodos as requestTodayTodos } from "./L5-services/today-ai";
import { runtimeCapabilities } from "./L5-services/runtime-capabilities";
import { createTodoReminderScheduler } from "./L5-services/todo-reminder-scheduler";
import { browserReminderService } from "./L5-services/reminder-service";
import { CompanionWindow } from "./L1-ui/features/companion/companion-window";
import { PluginCenterWindow } from "./L1-ui/features/plugins/plugin-center-window";
import { PageBackButton } from "./L1-ui/components/page-back-button";
type View = "任务清单" | "今日待办" | "其他功能" | "设置";
type FeaturePage = "news" | "companion" | "plugins";
type TodayTodo = { id: string; content: string; reminderTime: string; completed: boolean; dailyReusable?: boolean };
const nav: View[] = ["任务清单", "今日待办", "其他功能", "设置"];
const initial: Task[] = [
  {
    id: "task-1",
    title: "完成 React 界面迁移",
    description: "重构交互层，同时保持五层架构边界",
    goal: "完成可运行且架构边界清晰的 React 界面",
    completed: false,
    priority: "high",
    durationHours: 1,
    steps: createSteps(3, 1, (index) => `task-1-step-${index}`),
  },
  {
    id: "task-2",
    title: "整理本周学习计划",
    description: "让 Agent 根据可用时间生成清晰步骤",
    goal: "形成一份可执行的本周学习计划",
    completed: false,
    priority: "medium",
    durationHours: 1,
    steps: createSteps(3, 1, (index) => `task-2-step-${index}`),
  },
];
export default function App({ staticWeb = runtimeCapabilities.staticWeb }: { staticWeb?: boolean } = {}) {
  const [view, setView] = useState<View>("任务清单"),
    [open, setOpen] = useState(false),
    [stage, setStage] = useState(1),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [goal, setGoal] = useState(""),
    [durationHint, setDurationHint] = useState("2-3 小时"),
    [notes, setNotes] = useState(""),
    [query, setQuery] = useState(""),
    [editingTaskId, setEditingTaskId] = useState<string | null>(null),
    [analysis, setAnalysis] = useState<TaskAnalysis | null>(null),
    [analysisError, setAnalysisError] = useState(""),
    [analysisLoading, setAnalysisLoading] = useState(false),
    [draftSteps, setDraftSteps] = useState<TaskStep[]>([]),
    [tasks, setTasks] = useState(() => staticWeb ? [] : initial),
    [todayTodos, setTodayTodos] = useState<TodayTodo[]>(() => JSON.parse(localStorage.getItem("memo-agent-today-todos") || "[]")),
    [todayOpen, setTodayOpen] = useState(false),
    [todayContent, setTodayContent] = useState(""),
    [todayReminder, setTodayReminder] = useState(""),
    [todayAiCandidates, setTodayAiCandidates] = useState<string[]>([]),
    [todayAiOpen, setTodayAiOpen] = useState(false),
    [todayAiError, setTodayAiError] = useState(""),
    [timePickerOpen, setTimePickerOpen] = useState(false),
    [editingTodayId, setEditingTodayId] = useState<string | null>(null),
    [todayMenu, setTodayMenu] = useState<{ id: string; x: number; y: number } | null>(null),
    [taskMenu, setTaskMenu] = useState<{ id: string; x: number; y: number } | null>(null),
    [activeReminder, setActiveReminder] = useState<TodayTodo | null>(null),
    [voiceListening, setVoiceListening] = useState(false),
    [voiceTranscript, setVoiceTranscript] = useState(""),
    [workspaceReady, setWorkspaceReady] = useState(false),
    [workspaceRevision, setWorkspaceRevision] = useState(0),
    [saveStatus, setSaveStatus] = useState("正在载入…"),
    [desktopConfigOpen, setDesktopConfigOpen] = useState(false),
    [featurePage, setFeaturePage] = useState<FeaturePage | null>(null),
    [desktopWidget, setDesktopWidget] = useState<DesktopWidgetSettings>(DEFAULT_WIDGET_SETTINGS),
    [siteName, setSiteName] = useState(
      () => localStorage.getItem("memo-agent-site-name") || "东非大裂谷",
    ),
    [editingSiteName, setEditingSiteName] = useState(false),
    [siteNameDraft, setSiteNameDraft] = useState(siteName);
  const voiceRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef("");
  const voiceCancelledRef = useRef(false);
  const reminderSchedulerRef = useRef<ReturnType<typeof createTodoReminderScheduler> | null>(null);
  const reminderQueueRef = useRef<TodayTodo[]>([]);
  useEffect(() => {
    if (!runtimeCapabilities.automaticNews) return;
    const repo = createNewsRepository(localStorage);
    const scheduler = createNewsRefreshScheduler({
      load: repo.getSchedule,
      save: repo.saveSchedule,
      refresh: async () => {
        const state = repo.load();
        if (!state.sources.length) return;
        const result = await refreshNews(state.sources, state.items.flatMap((item) => [item.id, item.url]));
        repo.replaceLatestItems(result.items);
        result.sources.forEach((source) => repo.updateSource(source.id, { cursor: source.cursor, lastSuccessfulRefreshAt: source.lastSuccessfulRefreshAt || source.cursor }));
        repo.removeItemsForSources(result.errors.map((error) => error.sourceId));
      },
    });
    const timer = scheduler.start();
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    loadWorkspace().then((data) => {
      if (data) { setTasks(data.tasks.map((task) => migrateTask(task))); setTodayTodos(data.todayTodos); setWorkspaceRevision(data.revision); applyEditableText(data.editableText); setSiteName(data.editableText.siteName); setSiteNameDraft(data.editableText.siteName); setDesktopWidget(normalizeWidgetSettings(data.desktopWidget)); }
      setWorkspaceReady(true); setSaveStatus("已保存");
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "载入失败";
      setSaveStatus(message);
      if (message !== "浏览器工作区数据已损坏") setWorkspaceReady(true);
    });
  }, []);
  useEffect(() => {
    if (!workspaceReady) return;
    setSaveStatus("保存中…");
    const timer = window.setTimeout(() => saveWorkspace({ version: 1, revision: workspaceRevision, updatedAt: "", tasks, todayTodos, settings: loadSettings(), editableText: { ...readEditableText(), siteName }, desktopWidget }).then((saved) => { setWorkspaceRevision(saved.revision); setSaveStatus("已保存"); }).catch((error) => setSaveStatus(error instanceof Error ? error.message : "保存失败")), 300);
    return () => window.clearTimeout(timer);
  }, [tasks, todayTodos, siteName, desktopWidget, workspaceReady]);
  useEffect(() => {
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.documentElement.style.scrollbarGutter = "";
    };
  }, []);
  useEffect(() => localStorage.setItem("memo-agent-today-todos", JSON.stringify(todayTodos)), [todayTodos]);
  useEffect(() => {
    const scheduler = createTodoReminderScheduler({
      now: () => Date.now(),
      setTimer: window.setTimeout.bind(window),
      clearTimer: window.clearTimeout.bind(window),
    });
    reminderSchedulerRef.current = scheduler;
    const unsubscribe = scheduler.subscribe(({ todo }) => {
      if (!loadSettings().reminders.notifications) return;
      browserReminderService.notifyTodo(todo.content, todo.reminderTime);
      setActiveReminder((active) => {
        if (active) {
          reminderQueueRef.current.push(todo);
          return active;
        }
        return todo;
      });
    });
    return () => {
      unsubscribe();
      scheduler.dispose();
      reminderSchedulerRef.current = null;
      reminderQueueRef.current = [];
    };
  }, []);
  useEffect(() => {
    reminderSchedulerRef.current?.sync(todayTodos);
  }, [todayTodos]);
  useEffect(() => {
    if (!todayMenu && !taskMenu) return;
    const closeMenus = () => { setTodayMenu(null); setTaskMenu(null); };
    window.addEventListener("mousedown", closeMenus);
    return () => window.removeEventListener("mousedown", closeMenus);
  }, [todayMenu, taskMenu]);
  const addTodayTodo = () => {
    if (!todayContent.trim()) return;
    const savedId = editingTodayId || crypto.randomUUID();
    const savedContent = todayContent.trim();
    setTodayTodos((items) => editingTodayId ? items.map((item) => item.id === editingTodayId ? { ...item, content: savedContent, reminderTime: todayReminder } : item) : [{ id: savedId, content: savedContent, reminderTime: todayReminder, completed: false }, ...items]);
    setTodayContent(""); setTodayReminder(""); setTodayOpen(false);
    setEditingTodayId(null);
  };
  const openTodayEditor = (todo?: TodayTodo) => { setEditingTodayId(todo?.id || null); setTodayContent(todo?.content || ""); setTodayReminder(todo?.reminderTime || ""); setTodayOpen(true); };
  const generateTodayTodos = async () => {
    try {
      const result = await requestTodayTodos(tasks);
      setTodayAiCandidates(result); setTodayAiError(""); setTodayAiOpen(true);
    } catch (error) { setTodayAiCandidates([]); setTodayAiError(error instanceof Error ? error.message : "AI 生成失败"); setTodayAiOpen(true); }
  };
  const startVoiceInput = () => {
    if (voiceListening) {
      voiceRecognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return window.alert("当前浏览器不支持语音输入");
    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    voiceCancelledRef.current = false; voiceTranscriptRef.current = ""; setVoiceTranscript("");
    recognition.lang = "zh-CN"; recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => {
      voiceRecognitionRef.current = null; setVoiceListening(false);
      if (!voiceCancelledRef.current && voiceTranscriptRef.current.trim()) {
        const parsed = parseVoiceTodo(voiceTranscriptRef.current);
        setTodayContent(parsed.content); setTodayReminder(parsed.time); setEditingTodayId(null); setTodayOpen(true);
      }
    };
    recognition.onerror = () => { setVoiceListening(false); if (!voiceCancelledRef.current) window.alert("语音识别失败，请检查麦克风权限"); };
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results as any).map((result: any) => result[0].transcript).join("");
      voiceTranscriptRef.current = text; setVoiceTranscript(text);
    };
    recognition.start();
  };
  const add = () => {
    const defaults = loadSettings().taskDefaults;
    const effectiveSteps = draftSteps.length
      ? draftSteps
      : createSteps(
          Math.min(defaults.maxSteps, Math.max(defaults.minSteps, 3)),
          defaults.defaultDurationMinutes / 60,
        );
    if (title.trim() && editingTaskId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: title.trim(),
                description: description.trim() || task.description,
                goal: goal.trim(),
                steps: draftSteps,
                durationHours: taskDuration(draftSteps),
                completed: taskProgress(draftSteps).done,
              }
            : task,
        ),
      );
    } else if (title.trim())
      setTasks([
        {
          id: crypto.randomUUID(),
          title,
          description: description.trim() || "由 Agent 分析生成的可执行任务",
          goal: goal.trim(),
          completed: false,
          priority: defaults.defaultPriority,
          durationHours: taskDuration(effectiveSteps),
          steps: effectiveSteps,
        },
        ...tasks,
      ]);
    setOpen(false);
    setStage(1);
    setTitle("");
    setDescription("");
    setGoal("");
    setDurationHint("2-3 小时");
    setNotes("");
    setEditingTaskId(null);
    setDraftSteps([]);
  };
  const openNewTask = () => {
    setEditingTaskId(null);
    setTitle("");
    setDescription("");
    setGoal("");
    setStage(1);
    setOpen(true);
    setAnalysis(null);
    setAnalysisError("");
    const defaults = loadSettings().taskDefaults;
    setDraftSteps(
      createSteps(
        Math.min(defaults.maxSteps, Math.max(defaults.minSteps, 3)),
        defaults.defaultDurationMinutes / 60,
      ),
    );
  };
  const startAnalysis = async () => {
    if (!title.trim()) return;
    setStage(2);
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const defaults = loadSettings().taskDefaults;
      const result = await analyzeTask({
        title,
        description,
        duration: durationHint,
        notes,
        minSteps: defaults.minSteps,
        maxSteps: defaults.maxSteps,
      });
      setAnalysis(result);
      setGoal(result.goal);
      setDraftSteps(
        result.steps.map((step) => ({
          id: crypto.randomUUID(),
          title: step.title,
          hours: step.hours,
          completed: false,
        })),
      );
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "AI 分析失败");
    } finally {
      setAnalysisLoading(false);
    }
  };
  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setGoal(task.goal);
    setDraftSteps(task.steps);
    setStage(2);
    setOpen(true);
  };
  useEffect(() => {
    if (!workspaceReady) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("widgetAction");
    const taskId = params.get("widgetTask");
    if (action === "add-today") {
      setView("今日待办");
      openTodayEditor();
      params.delete("widgetAction");
    } else if (taskId) {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      setView("任务清单");
      openEditTask(task);
      params.delete("widgetTask");
    } else {
      return;
    }
    const search = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, [workspaceReady, tasks]);
  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (
      target &&
      !target.completed &&
      loadSettings().interaction.confirmComplete &&
      !window.confirm(`完成任务“${target.title}”？`)
    )
      return;
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              steps: toggleAllSteps(task.steps, !task.completed),
            }
          : task,
      ),
    );
  };
  const toggleTodayTodo = (id: string) =>
    setTodayTodos((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  const inProgressCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const listDefaults = loadSettings().taskDefaults;
  const visibleTasks = tasks
    .filter((task) => {
      const needle = query.trim().toLocaleLowerCase();
      const matches =
        !needle ||
        `${task.title} ${task.description} ${task.goal}`
          .toLocaleLowerCase()
          .includes(needle);
      return (
        matches &&
        (listDefaults.completedVisibility === "show" || !task.completed)
      );
    })
    .sort((a, b) =>
      listDefaults.sortBy === "title"
        ? a.title.localeCompare(b.title, "zh-CN")
        : listDefaults.sortBy === "priority"
          ? { high: 0, medium: 1, low: 2 }[a.priority] -
            { high: 0, medium: 1, low: 2 }[b.priority]
          : 0,
    );
  const saveSiteName = () => {
    const nextName = siteNameDraft.trim();
    if (nextName) {
      setSiteName(nextName);
      localStorage.setItem("memo-agent-site-name", nextName);
    } else {
      setSiteNameDraft(siteName);
    }
    setEditingSiteName(false);
  };
  return (
    <div className="app min-h-screen">
      <div className="glow" />
      <header>
        <div
          className="brand"
          data-testid="brand-edit-area"
          title="双击修改网站名称"
          onDoubleClick={() => {
            if (!editingSiteName) {
              setSiteNameDraft(siteName);
              setEditingSiteName(true);
            }
          }}
        >
          <i>
            <Check />
          </i>
          {editingSiteName ? (
            <input
              className="brand-input"
              aria-label="网站名称"
              value={siteNameDraft}
              onChange={(event) => setSiteNameDraft(event.target.value)}
              onBlur={saveSiteName}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveSiteName();
                if (event.key === "Escape") {
                  setSiteNameDraft(siteName);
                  setEditingSiteName(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button className="brand-name" aria-label={siteName}>
              {siteName}
            </button>
          )}
        </div>
        <nav aria-label="主导航">
          <span
            className="nav-indicator"
            data-testid="nav-indicator"
            style={{ transform: `translateX(${nav.indexOf(view) * 100}%)` }}
          />
          {nav.map((n) => (
            <button
              key={n}
              className={view === n ? "active" : ""}
              onClick={() => { setView(n); setFeaturePage(null); setDesktopConfigOpen(false); }}
            >
              {n}
            </button>
          ))}
        </nav>
      </header>
      <span className={`workspace-save-status ${saveStatus === "保存失败" ? "error" : ""}`}>{saveStatus}</span>
      <main>
        <div className="view-stage" key={view}>
          {view === "任务清单" && (
            <>
              <section className="hero">
                <p>
                  <EditableHeroText
                    storageKey="memo-agent-hero-eyebrow"
                    initial="PERSONAL AGENT WORKSPACE"
                    label="顶部标语"
                    render={(value) => (
                      <>
                        <Sparkles /> {value}
                      </>
                    )}
                  />
                </p>
                <h1>
                  <EditableHeroText
                    storageKey="memo-agent-hero-title"
                    initial={"把想法变成\n清晰的行动。"}
                    label="主标题"
                    multiline
                    render={(value) => {
                      const [first, ...rest] = value.split("\n");
                      return (
                        <>
                          {first}
                          <br />
                          <i>{rest.join(" ") || " "}</i>
                        </>
                      );
                    }}
                  />
                </h1>
                <small>
                  <EditableHeroText
                    storageKey="memo-agent-hero-description"
                    initial="Agent 理解目标，拆解步骤、估算时间，并在真正重要的时候提醒你。"
                    label="说明文字"
                    multiline
                    render={(value) => value}
                  />
                </small>
              </section>
              <section className="stats" data-testid="task-stats">
                {[
                  [tasks.length, "全部任务", "total"],
                  [inProgressCount, "正在进行", "in-progress"],
                  [completedCount, "已经完成", "completed"],
                ].map(([n, l, testId]) => (
                  <div key={String(l)} data-testid={`stat-${testId}`}>
                    <b>{n}</b>
                    <span>{l}</span>
                  </div>
                ))}
              </section>
              <div className="heading">
                <div>
                  <em>YOUR TASKS</em>
                  <h2>任务清单</h2>
                </div>
                <div className="page-actions">
                  <label>
                    <Search />
                    <input
                      aria-label="搜索任务"
                      placeholder="搜索任务…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <button className="new" onClick={openNewTask}>
                    <Plus /> 新建任务
                  </button>
                </div>
              </div>
              <section className="tasks">
                {visibleTasks.map((task, i) => (
                  <article
                    key={task.id}
                    className={task.completed ? "completed" : ""}
                    onDoubleClick={(event) => { if (!(event.target instanceof HTMLButtonElement)) openEditTask(task); }}
                    onContextMenu={(event) => { event.preventDefault(); setTaskMenu({ id: task.id, x: event.clientX, y: event.clientY }); }}
                  >
                    <button
                      className={`check ${task.completed ? "checked" : ""}`}
                      aria-label={
                        (task.completed ? "恢复 " : "完成 ") + task.title
                      }
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.completed && <Check />}
                    </button>
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{task.title}</h3>
                      <button type="button" className="task-description-preview" onClick={() => openEditTask(task)}>{task.description}</button>
                      {task.goal && <button type="button" className="task-goal-preview" onClick={() => openEditTask(task)}><em>完成目标</em><span>{task.goal}</span></button>}
                      <TaskSteps
                        steps={task.steps}
                        onChange={(steps) =>
                          setTasks((current) =>
                            current.map((item) =>
                              item.id === task.id
                                ? {
                                    ...item,
                                    steps,
                                    durationHours: taskDuration(steps),
                                    completed: taskProgress(steps).done,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      className="go"
                      aria-label={`编辑 ${task.title}`}
                      onClick={() => openEditTask(task)}
                    >
                      <ArrowUpRight />
                    </button>
                  </article>
                ))}
              </section>
            </>
          )}
          {view === "今日待办" && (
            <Page over="FOCUS FOR TODAY" title="今日待办">
              <div className="today-actions">
                <button className="new" onClick={() => openTodayEditor()}>
                  <Plus /> 添加待办
                </button>
                <button onClick={startVoiceInput}><Mic /> {voiceListening ? "取消语音输入" : "语音输入"}</button>
                <button onClick={generateTodayTodos}>AI 生成今日待办</button>
              </div>
              <div className="focus">
                <EditableHeroText storageKey="memo-agent-today-focus" initial={`今天，专注完成 ${todayTodos.filter((item) => !item.completed).length} 件重要的事。`} label="今日专注文案" editTrigger="double-click" render={(value) => value} />
              </div>
              <section className="tasks">
                {todayTodos.map((todo, i) => (
                    <article key={todo.id} className={todo.completed ? "completed" : ""} onDoubleClick={(event) => { if (!(event.target instanceof HTMLButtonElement)) openTodayEditor(todo); }} onContextMenu={(event) => { event.preventDefault(); setTodayMenu({ id: todo.id, x: event.clientX, y: event.clientY }); }}>
                      <button
                        className={`check ${todo.completed ? "checked" : ""}`}
                        aria-label={(todo.completed ? "恢复 " : "完成 ") + todo.content}
                        onClick={() => setTodayTodos((items) => items.map((item) => item.id === todo.id ? { ...item, completed: !item.completed } : item))}
                      >{todo.completed && <Check />}</button>
                      <span>0{i + 1}</span>
                      <div>
                        <h3>{todo.content}</h3>
                        {todo.dailyReusable && <span className="daily-reuse-tag">每日复用</span>}
                        {todo.reminderTime && <p>提醒时间：{todo.reminderTime}</p>}
                      </div>
                      <button className="go" aria-label={`删除 ${todo.content}`} onClick={() => setTodayTodos((items) => items.filter((item) => item.id !== todo.id))}><X /></button>
                    </article>
                  ))}
              </section>
            </Page>
          )}
          {view === "其他功能" &&
            (desktopConfigOpen ? (
              <DesktopConfigPage
                settings={desktopWidget}
                onChange={setDesktopWidget}
                siteName={siteName}
                tasks={tasks}
                todayTodos={todayTodos}
                onToggleToday={toggleTodayTodo}
                onAddToday={() => openTodayEditor()}
                onOpenTask={openEditTask}
              />
            ) : featurePage ? (
              <div className="secondary-feature-page">
                {featurePage === "news" && <NewsWindow />}
                {featurePage === "companion" && <CompanionWindow />}
                {featurePage === "plugins" && <PluginCenterWindow />}
              </div>
            ) : (
              <Page over="EXPLORE CAPABILITIES" title="更多智能能力">
                <div className="features">
                  {([
                    ["聊天对话", MessageCircle, null],
                    ["AI 陪伴", Heart, { primary: () => setFeaturePage("companion") }],
                    ["今日消息", Newspaper, { primary: () => setFeaturePage("news") }],
                    ["Agent", Network, null],
                    ["放入桌面", MonitorUp, { primary: () => setDesktopConfigOpen(true) }],
                    ["拓展功能", Sparkles, { primary: () => setFeaturePage("plugins") }],
                  ] as const).map(([n, I, action]: any) => (
                    <button
                      key={n}
                      onClick={() => action?.primary?.() ?? null}
                      disabled={!action}
                    >
                      <I />
                      <small>AVAILABLE MODULE</small>
                      <h3>{n}</h3>
                      <p>
                        {n === "放入桌面"
                          ? "一键将组件放到桌面，看今日待办与任务清单。"
                          : "进入模块，使用与任务关联的智能能力。"}
                      </p>
                      <ArrowUpRight />
                    </button>
                  ))}
                </div>
              </Page>
            ))}
          {view === "设置" && (
            <SettingsCenter
              tasks={tasks}
              onImportTasks={(imported) =>
                setTasks(
                  imported.map((task) =>
                    migrateTask({
                      id: task.id,
                      title: task.title,
                      description: task.description || "",
                      goal: task.goal || "",
                      completed: task.completed,
                      priority: task.priority || "medium",
                      durationHours: task.durationHours,
                      durationMinutes: task.durationMinutes,
                      steps: task.steps || 3,
                    }),
                  ),
                )
              }
              onClearCompleted={() =>
                setTasks((current) => current.filter((task) => !task.completed))
              }
              onClearAll={() => setTasks([])}
            />
          )}
        </div>
      </main>
      {open && (
        <div className="overlay">
          <section className="modal">
            <button className="close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <em>
              {stage}/2 {stage === 1 ? "基础信息" : "AGENT 分析"}
            </em>
            <h2>
              {editingTaskId
                ? "编辑任务"
                : stage === 1
                  ? "创建新任务"
                  : "检查分析结果"}
            </h2>
            {stage === 1 ? (
              <>
                <label>
                  任务名称
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：学习 React 基础"
                    autoFocus={loadSettings().interaction.autoFocus}
                  />
                </label>
                <TaskDescriptionDialog description={description} goal={goal} onSave={(details) => { setDescription(details.description); setGoal(details.goal); }} />
                <label>
                  时间长度
                  <input value={durationHint} onChange={(event) => setDurationHint(event.target.value)} placeholder="例如：2-3 小时" />
                </label>
                <label>
                  需要注意的点
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="输入限制、风险或提醒事项" />
                </label>
                <button className="primary" onClick={startAnalysis}>
                  下一步 <Sparkles />
                </button>
              </>
            ) : (
              <>
                {analysisLoading ? (
                  <p className="ai-message">正在拆解任务、估算时长…</p>
                ) : (
                  <div className="analysis">
                    {analysis && <b>{`预计 ${taskDuration(draftSteps)} 小时 · ${analysis.priority} 优先级`}</b>}
                    {analysisError && <p className="ai-message">{analysisError}</p>}
                    {editingTaskId && (
                      <div className="edit-task-basics">
                        <label>任务名称<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                        <TaskDescriptionDialog description={description} goal={goal} onSave={(details) => { setDescription(details.description); setGoal(details.goal); }} />
                      </div>
                    )}
                    <AnalysisStepEditor steps={draftSteps} onChange={setDraftSteps} />
                  </div>
                )}
                <button className="primary" onClick={add}>
                  确认并保存 <Check />
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {todayOpen && <div className="overlay"><section className="modal today-todo-modal"><button className="close" onClick={() => { setTodayOpen(false); setEditingTodayId(null); }}><X /></button><em>TODAY TODO</em><h2>{editingTodayId ? "编辑待办" : "添加待办"}</h2><label>待办内容<input aria-label="待办内容" value={todayContent} onChange={(event) => setTodayContent(event.target.value)} placeholder="输入今天要做的事" autoFocus /></label><label>提醒时间点（可选）<button type="button" className="time-wheel-trigger" onClick={() => setTimePickerOpen(true)}>{todayReminder || "选择提醒时间"}</button></label><button className="primary" onClick={addTodayTodo}>{editingTodayId ? "保存修改" : "添加待办"} <Check /></button></section></div>}
      {todayAiOpen && <div className="overlay"><section className="modal"><button className="close" onClick={() => setTodayAiOpen(false)}><X /></button><em>AI REVIEW</em><h2>审核今日待办</h2><p className="ai-message">确认前可编辑、删除或补充候选待办。</p>{todayAiError && <p className="ai-message">{todayAiError}</p>}<div className="analysis-step-editor-list">{todayAiCandidates.map((content, index) => <div className="analysis-step-edit-row" key={`${index}-${content}`}><input aria-label={`候选待办 ${index + 1}`} value={content} onChange={(event) => setTodayAiCandidates((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button aria-label={`删除候选待办 ${index + 1}`} onClick={() => setTodayAiCandidates((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X /></button></div>)}</div><button onClick={() => setTodayAiCandidates((items) => [...items, ""])}>+ 添加待办</button><button className="primary" disabled={!todayAiCandidates.some((item) => item.trim())} onClick={() => { setTodayTodos((items) => [...todayAiCandidates.filter((item) => item.trim()).map((content) => ({ id: crypto.randomUUID(), content: content.trim(), reminderTime: "", completed: false })), ...items]); setTodayAiOpen(false); }}>确认添加 <Check /></button></section></div>}
      {timePickerOpen && <TimeWheelPicker value={todayReminder} onCancel={() => setTimePickerOpen(false)} onConfirm={(value) => { setTodayReminder(value); setTimePickerOpen(false); }} />}
      {activeReminder && <div className="reminder-toast"><section className="reminder-dialog"><em>REMINDER</em><h2>待办提醒</h2><p>{activeReminder.content}</p><small>设定时间：{activeReminder.reminderTime}</small><button className="primary" onClick={() => setActiveReminder(reminderQueueRef.current.shift() || null)}>我知道了 <Check /></button></section></div>}
      {voiceListening && <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="语音输入"><div className="voice-orb-wrap"><button className="voice-orb" aria-label="完成语音输入" onClick={() => voiceRecognitionRef.current?.stop()}><span /></button><h2>正在聆听</h2><p>{voiceTranscript || "请说出待办内容和提醒时间…"}</p><button className="voice-cancel" onClick={() => { voiceCancelledRef.current = true; voiceRecognitionRef.current?.abort(); setVoiceListening(false); }}>取消</button></div></div>}
      {todayMenu && (() => { const todo = todayTodos.find((item) => item.id === todayMenu.id); if (!todo) return null; return <div className="task-context-menu" onMouseDown={(event) => event.stopPropagation()} style={{ left: todayMenu.x, top: todayMenu.y }}><span>项目</span><button onClick={() => { setTodayTodos((items) => items.map((item) => item.id === todo.id ? { ...item, dailyReusable: !item.dailyReusable } : item)); setTodayMenu(null); }}>{todo.dailyReusable ? "取消复用任务" : "设置为复用任务"}</button></div>; })()}
      {taskMenu && (() => { const task = tasks.find((item) => item.id === taskMenu.id); if (!task) return null; return <div className="task-context-menu" onMouseDown={(event) => event.stopPropagation()} style={{ left: taskMenu.x, top: taskMenu.y }}><span>项目</span><button onClick={() => { setTasks((items) => items.map((item) => item.id === task.id ? { ...item, dailyReusable: !item.dailyReusable } : item)); setTaskMenu(null); }}>{task.dailyReusable ? "取消复用任务" : "设置为复用任务"}</button></div>; })()}
    </div>
  );
}
function EditableHeroText({
  storageKey,
  initial,
  label,
  multiline = false,
  render,
  delay = 3000,
  editTrigger = "long-press",
}: {
  storageKey: string;
  initial: string;
  label: string;
  multiline?: boolean;
  render: (value: string) => ReactNode;
  delay?: number;
  editTrigger?: "long-press" | "double-click";
}) {
  const [value, setValue] = useState(
    () => localStorage.getItem(storageKey) || initial,
  );
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const longPress = useLongPress(() => {
    setDraft(value);
    setEditing(true);
  }, delay);
  const beginEditing = () => { setDraft(value); setEditing(true); };
  const save = () => {
    const next = draft.trim();
    if (next) {
      setValue(next);
      localStorage.setItem(storageKey, next);
    } else setDraft(value);
    setEditing(false);
  };
  const common = {
    className: `hero-editor ${multiline ? "multiline" : ""}`,
    "aria-label": label,
    value: draft,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setDraft(event.target.value),
    onBlur: save,
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (event.key === "Escape") {
        setDraft(value);
        setEditing(false);
      }
      if (
        event.key === "Enter" &&
        (!multiline || event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        save();
      }
    },
    autoFocus: true,
  };
  if (editing)
    return multiline ? <textarea {...common} /> : <input {...common} />;
  return (
    <button
      className="hero-editable long-press-target"
      aria-label={`编辑${label}`}
      title={editTrigger === "double-click" ? "双击修改文字" : `长按 ${delay / 1000} 秒修改文字`}
      {...(editTrigger === "double-click" ? { onDoubleClick: beginEditing } : longPress)}
    >
      {render(value)}
    </button>
  );
}
function useLongPress(onComplete: () => void, delay = 3000) {
  const timer = useRef<number | null>(null);
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onComplete();
    }, delay);
  };
  useEffect(() => cancel, []);
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if ((event.key === "Enter" || event.key === " ") && !event.repeat)
        start();
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") cancel();
    },
  };
}
function Page({
  over,
  title,
  children,
}: {
  over: string;
  title: string;
  children: any;
}) {
  return (
    <>
      <section className="page">
        <em>{over}</em>
        <h1>{title}</h1>
      </section>
      {children}
    </>
  );
}

function TimeWheelPicker({ value, onCancel, onConfirm }: { value: string; onCancel: () => void; onConfirm: (value: string) => void }) {
  const now = new Date();
  const [hour, setHour] = useState(() => Number(value.split(":")[0] || now.getHours()));
  const [minute, setMinute] = useState(() => Number(value.split(":")[1] || now.getMinutes()));
  const valid = (h: number, m: number) => h > now.getHours() || (h === now.getHours() && m >= now.getMinutes());
  return <div className="wheel-overlay"><section className="wheel-picker"><em>REMINDER TIME</em><h3>选择提醒时间</h3><div className="wheel-columns"><div>{Array.from({ length: 24 }, (_, h) => <button className={hour === h ? "selected" : ""} disabled={!valid(h, minute)} onClick={() => setHour(h)} key={h}>{String(h).padStart(2, "0")}</button>)}</div><b>:</b><div>{Array.from({ length: 60 }, (_, m) => <button className={minute === m ? "selected" : ""} disabled={!valid(hour, m)} onClick={() => setMinute(m)} key={m}>{String(m).padStart(2, "0")}</button>)}</div></div><div className="wheel-actions"><button onClick={onCancel}>取消</button><button className="primary" disabled={!valid(hour, minute)} onClick={() => onConfirm(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}>确认</button></div></section></div>;
}

function parseVoiceTodo(transcript: string) {
  const chinese: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const numberOf = (raw: string) => /^\d+$/.test(raw) ? Number(raw) : raw === "十" ? 10 : raw.startsWith("十") ? 10 + (chinese[raw[1]] || 0) : raw.endsWith("十") ? (chinese[raw[0]] || 0) * 10 : chinese[raw] ?? 0;
  const match = transcript.match(/(凌晨|早上|上午|中午|下午|晚上)?\s*([零一二两三四五六七八九十\d]{1,3})[点时](?:([零一二两三四五六七八九十\d]{1,3})分?)?/);
  let time = "";
  if (match) {
    let hour = numberOf(match[2]); const minute = match[3] ? numberOf(match[3]) : 0;
    if (["下午", "晚上"].includes(match[1]) && hour < 12) hour += 12;
    if (match[1] === "中午" && hour < 11) hour += 12;
    time = `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(Math.min(minute, 59)).padStart(2, "0")}`;
  }
  const content = transcript.replace(match?.[0] || "", "").replace(/^(请|帮我)?(提醒我|提醒)?/, "").replace(/(提醒我|提醒)$/g, "").trim() || transcript.trim();
  return { content, time };
}

type SettingPage = "appearance" | "interaction" | "ai" | "reminders" | "data";
type SimpleSettings = {
  accent: string;
  fontSize: string;
  density: string;
  animations: boolean;
  reducedMotion: boolean;
  confirmDelete: boolean;
  editHints: boolean;
  notifications: boolean;
  reminderMinutes: string;
  sound: boolean;
  aiReminders: boolean;
};
const SETTINGS_KEY = "memo-agent-settings-v1";
const DEFAULT_SETTINGS: SimpleSettings = {
  accent: "green",
  fontSize: "standard",
  density: "standard",
  animations: true,
  reducedMotion: false,
  confirmDelete: true,
  editHints: true,
  notifications: false,
  reminderMinutes: "15",
  sound: true,
  aiReminders: true,
};
function SettingsDetail({
  page,
  onBack,
}: {
  page: SettingPage;
  onBack: () => void;
}) {
  const [settings, setSettings] = useState<SimpleSettings>(() => {
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.fontSize = settings.fontSize;
    document.documentElement.dataset.density = settings.density;
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.reducedMotion || !settings.animations,
    );
  }, [settings]);
  const update = (
    key: keyof typeof DEFAULT_SETTINGS,
    value: string | boolean,
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const titles = {
    appearance: "外观与主题",
    interaction: "交互与动效",
    ai: "AI 与 API",
    reminders: "提醒方式",
    data: "数据管理",
  };
  return (
    <Page over="SETTINGS" title={titles[page]}>
      <button className="back-settings" onClick={onBack}>
        返回设置
      </button>
      {page === "ai" && <AiSettings />}
      {page === "appearance" && (
        <section className="settings-panel">
          <SettingSelect
            label="强调色"
            value={settings.accent}
            onChange={(v) => update("accent", v)}
            options={["green:绿色", "blue:蓝色", "orange:橙色"]}
          />
          <SettingSelect
            label="字体大小"
            value={settings.fontSize}
            onChange={(v) => update("fontSize", v)}
            options={["compact:紧凑", "standard:标准", "large:宽松"]}
          />
          <SettingSelect
            label="界面密度"
            value={settings.density}
            onChange={(v) => update("density", v)}
            options={["compact:紧凑", "standard:标准", "comfortable:舒适"]}
          />
        </section>
      )}
      {page === "interaction" && (
        <section className="settings-panel">
          <SettingToggle
            label="页面切换动画"
            checked={settings.animations}
            onChange={(v) => update("animations", v)}
          />
          <SettingToggle
            label="减少动态效果"
            checked={settings.reducedMotion}
            onChange={(v) => update("reducedMotion", v)}
          />
        </section>
      )}
      {page === "reminders" && (
        <section className="settings-panel">
          <SettingToggle
            label="浏览器通知"
            checked={settings.notifications}
            onChange={async (v) => {
              if (!v) return update("notifications", false);
              if (!("Notification" in window))
                return update("notifications", false);
              const permission = await Notification.requestPermission();
              update("notifications", permission === "granted");
              if (permission === "granted") new Notification("任务提醒已启用");
            }}
          />
        </section>
      )}
      {page === "data" && (
        <section className="settings-panel data-actions">
          <button
            onClick={() => {
              const data: Record<string, string> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) data[key] = localStorage.getItem(key) || "";
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "memo-agent-backup.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            导出本地设置
          </button>
          <button
            onClick={() => {
              if (confirm("恢复所有设置为默认值？"))
                setSettings(DEFAULT_SETTINGS);
            }}
          >
            恢复默认设置
          </button>
        </section>
      )}
    </Page>
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
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
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
      <select value={value} onChange={(e) => onChange(e.target.value)}>
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
