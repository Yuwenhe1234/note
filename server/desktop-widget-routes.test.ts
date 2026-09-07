import { describe, expect, it, vi } from "vitest";
import { createDesktopWidgetLauncher } from "./desktop-widget-routes";

describe("desktop widget launcher", () => {
  it("starts the release helper in widget-only mode", () => {
    const unref = vi.fn();
    const spawn = vi.fn(() => ({ pid: 42, exitCode: null, unref }));
    const launcher = createDesktopWidgetLauncher({
      executablePath: "D:/note/src-tauri/target/release/app.exe",
      exists: () => true,
      spawn,
    });

    expect(launcher("user-1", "http://127.0.0.1:5174")).toEqual({ status: "started", pid: 42 });
    expect(spawn).toHaveBeenCalledWith(
      "D:/note/src-tauri/target/release/app.exe",
      [
        "--widget",
        "--widget-user=user-1",
        "--widget-origin=http://127.0.0.1:5174",
      ],
      expect.objectContaining({ detached: true, stdio: "ignore" }),
    );
    expect(unref).toHaveBeenCalledOnce();
  });

  it("keeps one active widget process and shows it on repeated requests", () => {
    const unref = vi.fn();
    const spawn = vi.fn(() => ({ pid: 42, exitCode: null, unref }));
    const launcher = createDesktopWidgetLauncher({
      executablePath: "D:/note/src-tauri/target/release/app.exe",
      exists: () => true,
      spawn,
    });

    expect(launcher("user-1", "http://127.0.0.1:5174").status).toBe("started");
    expect(launcher("user-1", "http://127.0.0.1:5174")).toEqual({ status: "shown", pid: 42 });
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("reports a missing release helper", () => {
    const launcher = createDesktopWidgetLauncher({
      executablePath: "missing.exe",
      exists: () => false,
      spawn: vi.fn(),
    });

    expect(() => launcher()).toThrow("桌面助手尚未构建");
  });
});
