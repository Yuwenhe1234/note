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

  it("parses only the newest discovered item instead of every historical post", async () => {
    const source = "https://www.youtube.com/@demo";
    const latest = "https://www.youtube.com/watch?v=latest";
    const render = vi.fn(async (url: string) => url === source
      ? `<a href="/watch?v=latest">latest</a><a href="/watch?v=older-1">old</a><a href="/watch?v=older-2">old</a>`
      : `<meta property="og:title" content="最新视频"><meta itemprop="datePublished" content="2026-09-08T10:00:00Z">`);

    const result = await collectSourcePage({ url: source, name: "Demo" }, fetch, render);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(latest);
    expect(render).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenLastCalledWith(latest);
  });

  it("collects the signed-in Douyin profile directly without opening captcha detail pages", async () => {
    const videoId = "7682306127576517898";
    const payload = { aweme_list: [{ aweme_id: videoId, desc: "当四川方言撞上英语", author: { nickname: "我的账号" } }] };
    const render = vi.fn().mockResolvedValue(`<script type="application/json" data-memo-douyin-posts>${JSON.stringify(payload)}</script>`);

    const result = await collectSourcePage({ url: "https://www.douyin.com/user/self?from_tab_name=main", name: "我的账号" }, fetch, render);

    expect(render).toHaveBeenCalledTimes(1);
    expect(result).toEqual([expect.objectContaining({
      id: videoId,
      url: `https://www.douyin.com/video/${videoId}`,
      title: "当四川方言撞上英语",
      sourceName: "我的账号",
      platform: "douyin",
      publishedAt: "2026-09-06T06:31:20.000Z",
      text: "当四川方言撞上英语",
    })]);
  });

  it("resolves a Douyin self alias through its canonical public profile", async () => {
    const videoId = "7682306127576517898";
    const publicProfile = "https://www.douyin.com/user/MS4wLjABAAAAstable";
    const render = vi.fn()
      .mockResolvedValueOnce(`<link rel="canonical" href="${publicProfile}"><a href="/video/7614471654759992617?source=Baiduspider">无关推荐</a>`)
      .mockResolvedValueOnce(`<script type="application/json" data-memo-douyin-posts>${JSON.stringify({ aweme_list: [{ aweme_id: videoId, desc: "当四川方言撞上英语" }] })}</script>`);

    const result = await collectSourcePage({ url: "https://www.douyin.com/user/self?from_tab_name=main", name: "我的账号" }, fetch, render);

    expect(render).toHaveBeenNthCalledWith(1, "https://www.douyin.com/user/self?from_tab_name=main");
    expect(render).toHaveBeenNthCalledWith(2, publicProfile);
    expect(result.map((item) => item.id)).toEqual([videoId]);
  });

  it("prefers captured Douyin post API data over polluted profile links", async () => {
    const payload = { aweme_list: [{
      aweme_id: "7682720407166959025",
      desc: "初中英语单词和语法归纳",
      create_time: 1788772738,
      share_url: "https://www.iesdouyin.com/share/video/7682720407166959025/?did=device-token&share_sign=tracking-token",
      author: { nickname: "科技观察站" },
      video: { cover: { url_list: ["https://cdn.example.com/cover.webp"] } },
    }] };
    const html = `<script type="application/json" data-memo-douyin-posts>${JSON.stringify(payload)}</script><a href="/video/7614471654759992617?source=Baiduspider">无关推荐</a>`;

    const result = await collectSourcePage({ url: "https://www.douyin.com/user/abc", name: "www.douyin.com" }, fetch, vi.fn().mockResolvedValue(html));

    expect(result).toEqual([expect.objectContaining({
      id: "7682720407166959025",
      url: "https://www.douyin.com/video/7682720407166959025",
      title: "初中英语单词和语法归纳",
      sourceName: "科技观察站",
      publishedAt: "2026-09-07T09:18:58.000Z",
      thumbnailUrl: "https://cdn.example.com/cover.webp",
    })]);
  });

  it("rejects polluted Douyin recommendations when the creator post API is unavailable", async () => {
    const html = `<a href="/video/7614471654759992617?source=Baiduspider">无关推荐</a><a href="/video/7682267468098841819">看似正常但无法验证归属的卡片</a>`;
    const render = vi.fn().mockResolvedValue(html);

    await expect(collectSourcePage({ url: "https://www.douyin.com/user/abc", name: "Demo" }, fetch, render)).rejects.toThrow("未返回本人作品");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("never turns a platform source page into a message card", async () => {
    const fetcher = async () => new Response("<title>抖音官网</title>", { status: 200, headers: { "content-type": "text/html" } });
    await expect(collectSourcePage({ url: "https://www.douyin.com/user/abc", name: "Demo" }, fetcher as typeof fetch)).rejects.toThrow("未返回本人作品");
  });

  it("rejects a platform homepage before launching collection", async () => {
    const fetcher = vi.fn();
    await expect(collectSourcePage({ url: "https://www.bilibili.com/", name: "B站" }, fetcher as typeof fetch)).rejects.toThrow("具体账号");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
