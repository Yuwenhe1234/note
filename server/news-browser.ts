import { chromium, type BrowserContext } from "playwright-core";

type PersistentOptions = NonNullable<Parameters<typeof chromium.launchPersistentContext>[1]>;
type Launcher = (profileDir: string, options: PersistentOptions) => Promise<BrowserContext>;
type BrowserOptions = { launchPersistentContext?: Launcher; profileDir: string };

export function createNewsBrowser({ launchPersistentContext = chromium.launchPersistentContext.bind(chromium), profileDir }: BrowserOptions) {
  let contextPromise: Promise<BrowserContext> | null = null;
  let contextMode: "login" | "background" | null = null;
  let activeContext: BrowserContext | null = null;
  const closeContext = async () => {
    const pending = contextPromise;
    contextPromise = null;
    contextMode = null;
    activeContext = null;
    if (pending) await pending.then((browser) => browser.close()).catch(() => undefined);
  };
  const context = async (mode: "login" | "background") => {
    if (contextPromise && contextMode !== mode) await closeContext();
    if (!contextPromise) {
      contextMode = mode;
      contextPromise = launchPersistentContext(profileDir, {
        channel: "msedge",
        headless: mode === "background",
        viewport: { width: 1280, height: 820 },
        locale: "zh-CN",
        args: ["--disable-blink-features=AutomationControlled"],
      }).then((browser) => {
        activeContext = browser;
        browser.on?.("close", () => {
          if (activeContext === browser) {
            contextPromise = null;
            contextMode = null;
            activeContext = null;
          }
        });
        return browser;
      }).catch((error) => {
        contextPromise = null;
        throw new Error(`无法启动 Microsoft Edge：${error instanceof Error ? error.message : "请确认 Edge 已安装"}`);
      });
    }
    return contextPromise;
  };
  return {
    async openLogin(url: string) {
      const browser = await context("login");
      const page = browser.pages()[0] || await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.bringToFront();
    },
    async render(url: string) {
      const browser = await context("background");
      const page = await browser.newPage();
      try {
        const douyinPayloads: unknown[] = [];
        const bilibiliPayloads: unknown[] = [];
        const responseTasks: Promise<void>[] = [];
        const isDouyinProfile = new URL(url).hostname.endsWith("douyin.com") && new URL(url).pathname.startsWith("/user/");
        const isPostResponse = (response: any) => { try { return new URL(response.url()).pathname === "/aweme/v1/web/aweme/post/" && response.status() === 200; } catch { return false; } };
        const captureDouyinPayload = (response: any) => response.json().then((payload: unknown) => { douyinPayloads.push(payload); }).catch(() => undefined);
        page.on?.("response", (response) => {
          if (isPostResponse(response)) { responseTasks.push(captureDouyinPayload(response)); return; }
          try { if (new URL(response.url()).pathname === "/x/space/wbi/arc/search" && response.status() === 200) responseTasks.push(response.json().then((payload: unknown) => { bilibiliPayloads.push(payload); }).catch(() => undefined)); } catch { /* ignore unrelated responses */ }
        });
        const awaitedDouyinPosts = isDouyinProfile
          ? page.waitForResponse?.(isPostResponse, { timeout: 8_000 }).then(captureDouyinPayload).catch(() => undefined)
          : undefined;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await page.waitForTimeout?.(1_500);
        await awaitedDouyinPosts;
        await Promise.all(responseTasks);
        if (isDouyinProfile && douyinPayloads.length === 0 && page.reload) {
          const retryResponse = page.waitForResponse?.(isPostResponse, { timeout: 8_000 }).then(captureDouyinPayload).catch(() => undefined);
          await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
          await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
          await page.waitForTimeout?.(1_500);
          await retryResponse;
          await Promise.all(responseTasks);
        }
        const html = await page.content();
        const captured = douyinPayloads.map((payload) => `<script type="application/json" data-memo-douyin-posts>${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`).join("");
        const bilibiliCaptured = bilibiliPayloads.map((payload) => `<script type="application/json" data-memo-bilibili-posts>${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`).join("");
        return `${html}${captured}${bilibiliCaptured}`;
      } finally {
        await page.close?.();
      }
    },
    async close() {
      await closeContext();
    },
  };
}
