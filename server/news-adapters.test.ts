import { describe, expect, it, vi } from "vitest";
import { collectSourcePage, discoverContentUrls, extractPageContent, validateRemoteUrl } from "./news-adapters";

describe("news adapters", () => {
  it("extracts Open Graph and JSON-LD article metadata", () => {
    const html = `<meta property="og:title" content="新文章"><meta property="og:image" content="https://cdn.example.com/a.jpg"><script type="application/ld+json">{"@type":"Article","datePublished":"2026-09-05T10:00:00Z","articleBody":"这是正文内容"}</script>`;
    expect(extractPageContent("https://example.com/a", html)).toMatchObject({ title: "新文章", thumbnailUrl: "https://cdn.example.com/a.jpg", publishedAt: "2026-09-05T10:00:00Z", text: "这是正文内容" });
  });

  it("recognizes supported platform URLs", () => {
    expect(extractPageContent("https://www.bilibili.com/video/BV1", `<title>视频标题</title>`).platform).toBe("bilibili");
    expect(extractPageContent("https://www.youtube.com/watch?v=1", `<title>Video</title>`).platform).toBe("youtube");
  });

  it("blocks local and non-http targets", () => {
    expect(() => validateRemoteUrl("file:///etc/passwd")).toThrow("仅支持 HTTP");
    expect(() => validateRemoteUrl("http://127.0.0.1/private")).toThrow("不允许访问本地网络");
    expect(() => validateRemoteUrl("http://192.168.1.2/private")).toThrow("不允许访问本地网络");
  });

  it("discovers actual platform posts instead of returning the creator page", () => {
    const html = `<a href="/video/BV1ABC">视频一</a><a href="https://www.bilibili.com/video/BV2DEF?spm_id_from=333">视频二</a>`;
    expect(discoverContentUrls("https://space.bilibili.com/123", html)).toEqual([
      "https://www.bilibili.com/video/BV1ABC",
      "https://www.bilibili.com/video/BV2DEF?spm_id_from=333",
    ]);
  });

  it.each([
    ["https://space.bilibili.com/123/video", `{"bvid":"BV1ABC123"}`, "https://www.bilibili.com/video/BV1ABC123"],
    ["https://www.youtube.com/@demo/videos", `{"videoId":"abc-123"}`, "https://www.youtube.com/watch?v=abc-123"],
    ["https://www.douyin.com/user/abc", `{"aweme_id":"751234567890"}`, "https://www.douyin.com/video/751234567890"],
    ["https://www.xiaohongshu.com/user/profile/abc", `{"noteId":"abcdef1234567890"}`, "https://www.xiaohongshu.com/explore/abcdef1234567890"],
  ])("discovers embedded post ids for %s", (source, html, expected) => {
    expect(discoverContentUrls(source, html)).toContain(expected);
  });

  it("fetches discovered post pages and returns their original links", async () => {
    const pages: Record<string, string> = {
      "https://www.youtube.com/@demo": `<a href="/watch?v=abc">new</a>`,
      "https://www.youtube.com/watch?v=abc": `<meta property="og:title" content="真正的视频"><meta property="og:url" content="https://www.youtube.com/watch?v=abc"><meta itemprop="datePublished" content="2026-09-05T12:00:00Z"><meta name="description" content="视频正文">`,
    };
    const fetcher = async (url: string | URL | Request) => new Response(pages[String(url)], { status: 200, headers: { "content-type": "text/html" } });
    const result = await collectSourcePage({ url: "https://www.youtube.com/@demo", name: "Demo" }, fetcher as typeof fetch);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "真正的视频", url: "https://www.youtube.com/watch?v=abc", sourceName: "Demo" });
  });

  it("never turns a platform source page into a message card", async () => {
    const fetcher = async () => new Response("<title>抖音官网</title>", { status: 200, headers: { "content-type": "text/html" } });
    await expect(collectSourcePage({ url: "https://www.douyin.com/user/abc", name: "Demo" }, fetcher as typeof fetch)).rejects.toThrow("没有发现真实作品");
  });

  it("rejects a platform homepage before launching collection", async () => {
    const fetcher = vi.fn();
    await expect(collectSourcePage({ url: "https://www.bilibili.com/", name: "B站" }, fetcher as typeof fetch)).rejects.toThrow("具体账号");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
