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
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await page.waitForTimeout?.(1_500);
        return await page.content();
      } finally {
        await page.close?.();
      }
    },
    async close() {
      await closeContext();
    },
  };
}
