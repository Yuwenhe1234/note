import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn as nodeSpawn } from "node:child_process";
import type { Plugin } from "vite";

type SpawnedProcess = { pid?: number; exitCode?: number | null; unref: () => void };
type SpawnWidget = (
  executable: string,
  args: string[],
  options: { detached: true; stdio: "ignore"; windowsHide: true; cwd: string },
) => SpawnedProcess;

export function createDesktopWidgetLauncher({
  executablePath,
  exists = existsSync,
  spawn = (executable, args, options) => nodeSpawn(executable, args, options),
}: {
  executablePath: string;
  exists?: (path: string) => boolean;
  spawn?: SpawnWidget;
}) {
  let activeProcess: SpawnedProcess | null = null;
  return (userId?: string, websiteOrigin?: string) => {
    if (activeProcess?.exitCode === null) {
      return { status: "shown" as const, pid: activeProcess.pid };
    }
    if (!exists(executablePath)) {
      throw new Error("桌面助手尚未构建，请先生成发布版程序");
    }
    const args = ["--widget"];
    if (userId) args.push(`--widget-user=${userId}`);
    if (websiteOrigin) args.push(`--widget-origin=${websiteOrigin}`);
    const child = spawn(executablePath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: dirname(executablePath),
    });
    child.unref();
    activeProcess = child;
    return { status: "started" as const, pid: child.pid };
  };
}

export function desktopWidgetRoutes(): Plugin {
  const executablePath = join(
    process.cwd(),
    "src-tauri",
    "target",
    "release",
    "app.exe",
  );
  const launch = createDesktopWidgetLauncher({ executablePath });
  return {
    name: "desktop-widget-routes",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== "/api/desktop-widget/open") return next();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ ok: false, error: "仅支持 POST 请求" }));
          return;
        }
        const user = (request as any).localUser as { id: string } | undefined;
        if (!user) {
          response.statusCode = 401;
          response.end(JSON.stringify({ ok: false, error: "请先登录账户" }));
          return;
        }
        const host = String(request.headers.host || "");
        if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
          response.statusCode = 400;
          response.end(JSON.stringify({ ok: false, error: "网站地址无效" }));
          return;
        }
        try {
          response.statusCode = 200;
          response.end(JSON.stringify({
            ok: true,
            ...launch(user.id, `http://${host}`),
          }));
        } catch (error) {
          response.statusCode = 503;
          response.end(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "桌面挂件启动失败",
          }));
        }
      });
    },
  };
}
