import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import "./index.css";

describe("application shell", () => {
  it("reserves scrollbar space so the centered navigation never jumps", () => {
    render(<App />);
    expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe(
      "stable",
    );
  });

  it("uses the requested brand and slides the active navigation indicator", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "东非大裂谷" }),
    ).toBeInTheDocument();
    const indicator = screen.getByTestId("nav-indicator");
    expect(indicator).toHaveStyle({ transform: "translateX(0%)" });
    fireEvent.click(screen.getByRole("button", { name: "其他功能" }));
    expect(indicator).toHaveStyle({ transform: "translateX(200%)" });
  });

  it("edits and persists the navigation brand inline", () => {
    render(<App />);
    const brand = screen.getByRole("button", { name: "东非大裂谷" });
    fireEvent.click(brand);
    expect(
      screen.queryByRole("textbox", { name: "网站名称" }),
    ).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByTestId("brand-edit-area"));
    const input = screen.getByRole("textbox", { name: "网站名称" });
    fireEvent.change(input, { target: { value: "我的智能助理" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      screen.getByRole("button", { name: "我的智能助理" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("memo-agent-site-name")).toBe("我的智能助理");
  });

  it("allows double-clicking the brand logo area to edit the site name", () => {
    render(<App />);
    const brandArea = screen.getByTestId("brand-edit-area");
    fireEvent.doubleClick(brandArea);
    expect(
      screen.getByRole("textbox", { name: "网站名称" }),
    ).toBeInTheDocument();
  });

  it("edits and persists all three hero text blocks", () => {
    vi.useFakeTimers();
    render(<App />);
    const longPress = (element: HTMLElement) => {
      fireEvent.pointerDown(element);
      act(() => vi.advanceTimersByTime(3000));
    };
    longPress(screen.getByRole("button", { name: "编辑顶部标语" }));
    const eyebrow = screen.getByRole("textbox", { name: "顶部标语" });
    fireEvent.change(eyebrow, { target: { value: "我的工作空间" } });
    fireEvent.keyDown(eyebrow, { key: "Enter" });

    longPress(screen.getByRole("button", { name: "编辑主标题" }));
    const title = screen.getByRole("textbox", { name: "主标题" });
    fireEvent.change(title, { target: { value: "记录想法\n开始行动。" } });
    fireEvent.keyDown(title, { key: "Enter", ctrlKey: true });

    longPress(screen.getByRole("button", { name: "编辑说明文字" }));
    const description = screen.getByRole("textbox", { name: "说明文字" });
    fireEvent.change(description, {
      target: { value: "属于我的智能任务空间。" },
    });
    fireEvent.keyDown(description, { key: "Enter", ctrlKey: true });

    expect(localStorage.getItem("memo-agent-hero-eyebrow")).toBe(
      "我的工作空间",
    );
    expect(localStorage.getItem("memo-agent-hero-title")).toBe(
      "记录想法\n开始行动。",
    );
    expect(localStorage.getItem("memo-agent-hero-description")).toBe(
      "属于我的智能任务空间。",
    );
    vi.useRealTimers();
  });

  it("renders exactly the four primary navigation destinations", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "主导航" });
    const links = Array.from(nav.querySelectorAll("button")).map((button) =>
      button.textContent?.trim(),
    );
    expect(links).toEqual(["任务清单", "今日待办", "其他功能", "设置"]);
  });

  it("opens AI and API in a separate settings interface", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "AI 与 API" }));
    expect(
      screen.getByRole("heading", { name: "任务 AI 分析" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回设置" }));
    expect(
      screen.getByRole("button", { name: "AI 与 API" }),
    ).toBeInTheDocument();
  });

  it("applies appearance settings to the real application root", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "外观与主题" }));
    fireEvent.change(screen.getByLabelText("强调色"), {
      target: { value: "blue" },
    });
    expect(document.documentElement.dataset.accent).toBe("blue");
  });

  it("uses one consistent navigation-to-heading spacing across views", () => {
    render(<App />);
    expect(getComputedStyle(screen.getByRole("main")).paddingTop).toBe("64px");
    expect(
      getComputedStyle(document.querySelector(".hero")! as Element).paddingTop,
    ).toBe("0px");
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(
      getComputedStyle(document.querySelector(".page")! as Element).paddingTop,
    ).toBe("0px");
  });

  it("uses balanced spacing around the task statistics", () => {
    render(<App />);
    expect(
      getComputedStyle(document.querySelector(".hero")! as Element)
        .paddingBottom,
    ).toBe("48px");
    expect(
      getComputedStyle(screen.getByTestId("task-stats")).marginBottom,
    ).toBe("48px");
  });

  it("shows only three task-linked counters and updates them on completion", () => {
    render(<App />);
    const stats = screen.getByTestId("task-stats");
    expect(stats).toHaveTextContent("全部任务");
    expect(stats).toHaveTextContent("正在进行");
    expect(stats).toHaveTextContent("已经完成");
    expect(stats).not.toHaveTextContent("重点关注");
    expect(screen.getByTestId("stat-in-progress")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-completed")).toHaveTextContent("0");
    fireEvent.click(
      screen.getByRole("button", { name: "完成 完成 React 界面迁移" }),
    );
    expect(screen.getByTestId("stat-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-completed")).toHaveTextContent("1");
    expect(document.querySelectorAll(".check.checked")).toHaveLength(1);
  });

  it("filters the task list from the search field", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "搜索任务" }), {
      target: { value: "React" },
    });
    expect(screen.getByText("完成 React 界面迁移")).toBeInTheDocument();
    expect(screen.queryByText("整理本周学习计划")).not.toBeInTheDocument();
  });

  it("shows and searches completion goals in the task list", () => {
    render(<App />);
    expect(screen.getByText("完成可运行且架构边界清晰的 React 界面")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("搜索任务"), { target: { value: "架构边界清晰" } });
    expect(screen.getByText("完成 React 界面迁移")).toBeInTheDocument();
    expect(screen.queryByText("整理本周学习计划")).not.toBeInTheDocument();
  });

  it("keeps the task search and create action visually proportional", () => {
    render(<App />);
    const search = screen
      .getByRole("textbox", { name: "搜索任务" })
      .closest("label")!;
    const create = screen.getByRole("button", { name: "新建任务" });
    expect(getComputedStyle(search).height).toBe("48px");
    expect(getComputedStyle(create).height).toBe("48px");
    expect(getComputedStyle(create).fontSize).toBe("14px");
    expect(getComputedStyle(search).width).not.toBe(
      getComputedStyle(create).width,
    );
    const heading = screen.getByRole("heading", { name: "任务清单" });
    expect(getComputedStyle(heading).lineHeight).toBe("48px");
    expect(getComputedStyle(heading).marginBottom).toBe("0px");
  });

  it("keeps a fixed desktop canvas when the browser zoom changes", () => {
    render(<App />);
    expect(getComputedStyle(document.body).minWidth).toBe("1200px");
    expect(getComputedStyle(screen.getByRole("banner")).width).toBe("1120px");
    expect(getComputedStyle(screen.getByRole("main")).width).toBe("1120px");
  });

  it("opens a task from its centered edit control and saves changes", () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "编辑 完成 React 界面迁移" }),
    );
    expect(
      screen.getByRole("heading", { name: "编辑任务" }),
    ).toBeInTheDocument();
    const title = screen.getByLabelText("任务名称");
    fireEvent.change(title, { target: { value: "完成新版界面" } });
    expect(screen.getByLabelText("步骤 1 标题")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认并保存" }));
    expect(screen.getByText("完成新版界面")).toBeInTheDocument();
  });

  it("does not show manual analysis placeholder copy while editing", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "编辑 完成 React 界面迁移" }));
    expect(screen.queryByText("手动分析模式")).not.toBeInTheDocument();
    expect(screen.queryByText("未配置 AI，仍可手动填写步骤。")).not.toBeInTheDocument();
  });

  it("opens the two-stage task creation flow", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "新建任务" }));
    expect(
      screen.getByRole("heading", { name: "创建新任务" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2 基础信息")).toBeInTheDocument();
  });

  it("keeps creation out of the navigation bar and places it in page content", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    expect(header).not.toContainElement(
      screen.getByRole("button", { name: "新建任务" }),
    );
    expect(
      screen.getByRole("button", { name: "新建任务" }),
    ).toBeInTheDocument();
  });

  it("uses the task-list fields from the interaction sketch", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "新建任务" }));
    expect(screen.getByLabelText("任务名称")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑任务说明" })).toBeInTheDocument();
    expect(screen.getByLabelText("时间长度")).toBeInTheDocument();
    expect(screen.getByLabelText("需要注意的点")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一步" })).toBeInTheDocument();
  });

  it("opens capabilities as website secondary pages and returns to the grid", () => {
    const open = vi.spyOn(window, "open").mockReturnValue({ focus: vi.fn() } as any);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "其他功能" }));
    for (const name of ["今日消息", "AI 陪伴", "拓展功能"]) {
      const card = screen.getByRole("button", { name: new RegExp(name) });
      expect(card).toBeEnabled();
      fireEvent.click(card);
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "返回其他功能" }));
      expect(screen.getByRole("heading", { name: "更多智能能力" })).toBeInTheDocument();
    }
    expect(open).not.toHaveBeenCalled();
  });

  it("opens the desktop widget directly without a settings shortcut", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "其他功能" }));
    fireEvent.click(screen.getByRole("button", { name: /放入桌面/ }));
    expect(screen.getByRole("heading", { name: "放入桌面" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回更多功能" })).toBeInTheDocument();
    expect(screen.queryByText("正在通过 Windows 桌面助手打开挂件…")).not.toBeInTheDocument();
    expect(screen.queryByText("调整设置")).not.toBeInTheDocument();
    expect(screen.queryByText("这是桌面客户端功能")).not.toBeInTheDocument();
  });

  it("opens the reusable-task action from a task card context menu", () => {
    render(<App />);
    fireEvent.contextMenu(screen.getByText("完成 React 界面迁移").closest("article")!);
    expect(screen.getByText("项目")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置为复用任务" })).toBeInTheDocument();
  });

  it("opens the today editor from a widget deep link", async () => {
    window.history.replaceState({}, "", "/?widgetAction=add-today");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "添加待办" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日待办" })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("opens a task from a widget deep link", async () => {
    window.history.replaceState({}, "", "/?widgetTask=task-1");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "编辑任务" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("完成 React 界面迁移")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("shows due todos in a non-blocking top-left toast without creating a browser notification", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T09:00:00"));
    const notification = vi.fn();
    Object.assign(notification, { permission: "granted" });
    Object.defineProperty(window, "Notification", { configurable: true, value: notification });
    localStorage.setItem("memo-agent-today-todos", JSON.stringify([
      { id: "drink", content: "喝水", reminderTime: "09:01", completed: false },
    ]));

    render(<App />);
    await act(async () => {});
    act(() => vi.advanceTimersByTime(60_000));

    const reminderHeading = screen.getByRole("heading", { name: "待办提醒" });
    const reminderToast = reminderHeading.closest(".reminder-toast");
    const reminderDialog = reminderHeading.closest(".reminder-dialog");

    expect(reminderHeading).toBeInTheDocument();
    expect(screen.getByText("喝水")).toBeInTheDocument();
    expect(reminderToast).toBeInTheDocument();
    expect(reminderDialog).toBeInTheDocument();
    expect(window.getComputedStyle(reminderToast!).pointerEvents).toBe("none");
    expect(window.getComputedStyle(reminderDialog!).pointerEvents).toBe("auto");
    expect(document.querySelector(".reminder-overlay")).not.toBeInTheDocument();
    expect(notification).not.toHaveBeenCalled();
  });

  it("queues reminders that become due at the same time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T09:00:00"));
    localStorage.setItem("memo-agent-today-todos", JSON.stringify([
      { id: "first", content: "第一项", reminderTime: "09:01", completed: false },
      { id: "second", content: "第二项", reminderTime: "09:01", completed: false },
    ]));

    render(<App />);
    await act(async () => {});
    act(() => vi.advanceTimersByTime(60_000));

    expect(screen.getByText("第一项")).toBeInTheDocument();
    expect(screen.queryByText("第二项")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /我知道了/ }));
    expect(screen.getByText("第二项")).toBeInTheDocument();
  });
});
