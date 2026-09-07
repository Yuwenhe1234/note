import { describe, expect, it, vi } from "vitest";
import { createNewsBrowser } from "./news-browser";

describe("persistent news browser", () => {
  it("reuses one persistent Edge profile and returns rendered HTML", async () => {
    const page = { goto: vi.fn(), waitForLoadState: vi.fn().mockResolvedValue(undefined), content: vi.fn().mockResolvedValue("<a href='/video/1'>作品</a>"), bringToFront: vi.fn() };
    const context = { newPage: vi.fn().mockResolvedValue(page), pages: vi.fn().mockReturnValue([]), close: vi.fn() };
    const launch = vi.fn().mockResolvedValue(context);
    const browser = createNewsBrowser({ launchPersistentContext: launch as any, profileDir: "D:/profile" });
    await expect(browser.render("https://www.douyin.com/user/abc")).resolves.toContain("作品");
    await browser.render("https://www.douyin.com/user/abc");
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith("D:/profile", expect.objectContaining({ channel: "msedge", headless: true }));
  });

  it("opens an official login page without exposing cookies", async () => {
    const page = { goto: vi.fn(), bringToFront: vi.fn() };
    const context = { newPage: vi.fn().mockResolvedValue(page), pages: vi.fn().mockReturnValue([]), close: vi.fn() };
    const browser = createNewsBrowser({ launchPersistentContext: vi.fn().mockResolvedValue(context) as any, profileDir: "D:/profile" });
    await browser.openLogin("https://www.douyin.com/user/abc");
    expect(page.goto).toHaveBeenCalledWith("https://www.douyin.com/user/abc", expect.any(Object));
    expect((browser as any)).toBeTruthy();
  });

  it("closes the visible login context before background collection", async () => {
    const loginPage = { goto: vi.fn(), bringToFront: vi.fn() };
    const hiddenPage = { goto: vi.fn(), waitForLoadState: vi.fn().mockResolvedValue(undefined), content: vi.fn().mockResolvedValue("<html></html>"), close: vi.fn() };
    const visible = { newPage: vi.fn().mockResolvedValue(loginPage), pages: vi.fn().mockReturnValue([]), on: vi.fn(), close: vi.fn().mockResolvedValue(undefined) };
    const hidden = { newPage: vi.fn().mockResolvedValue(hiddenPage), on: vi.fn(), close: vi.fn() };
    const launch = vi.fn().mockResolvedValueOnce(visible).mockResolvedValueOnce(hidden);
    const browser = createNewsBrowser({ launchPersistentContext: launch as any, profileDir: "D:/profile" });
    await browser.openLogin("https://www.douyin.com/user/abc");
    await browser.render("https://www.douyin.com/user/abc");
    expect(visible.close).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0][1]).toMatchObject({ headless: false });
    expect(launch.mock.calls[1][1]).toMatchObject({ headless: true });
  });

  it("recreates the persistent context after Edge is closed", async () => {
    let onClose: (() => void) | undefined;
    const page = () => ({ goto: vi.fn(), waitForLoadState: vi.fn().mockResolvedValue(undefined), content: vi.fn().mockResolvedValue("<html></html>"), close: vi.fn() });
    const first = { newPage: vi.fn().mockImplementation(async () => page()), on: vi.fn((_event, callback) => { onClose = callback; }), close: vi.fn() };
    const second = { newPage: vi.fn().mockImplementation(async () => page()), on: vi.fn(), close: vi.fn() };
    const launch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const browser = createNewsBrowser({ launchPersistentContext: launch as any, profileDir: "D:/profile" });
    await browser.render("https://example.com");
    onClose?.();
    await browser.render("https://example.com");
    expect(launch).toHaveBeenCalledTimes(2);
  });
});
