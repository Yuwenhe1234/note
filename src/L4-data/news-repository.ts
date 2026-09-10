import { detectNewsPlatform, isExpiredNewsItem, normalizeContentUrl, normalizeRefreshSchedule, normalizeSourceProfile, validateNewsSourceUrl, type ManualNewsInput, type ManualNewsSummary, type NewsItem, type NewsRefreshSchedule, type NewsSource, type NewsSourceProfile } from "./news-model";

type NewsState = { version: 1; sources: NewsSource[]; items: NewsItem[]; fingerprints: string[]; schedule?: NewsRefreshSchedule };
export const NEWS_STORAGE_KEY = "memo-agent-news-v1";
const empty = (): NewsState => ({ version: 1, sources: [], items: [], fingerprints: [] });

export function createNewsRepository(storage: Storage, now: () => Date = () => new Date()) {
  const load = (): NewsState => {
    try {
      const value = JSON.parse(storage.getItem(NEWS_STORAGE_KEY) || "null");
      if (value?.version !== 1) return empty();
      const state = { ...empty(), ...value } as NewsState;
      return { ...state, sources: state.sources.filter((source) => { try { validateNewsSourceUrl(source.url); return true; } catch { return false; } }) };
    } catch { return empty(); }
  };
  const save = (state: NewsState) => storage.setItem(NEWS_STORAGE_KEY, JSON.stringify(state));
  return {
    load,
    getSchedule: () => normalizeRefreshSchedule(load().schedule || {}),
    saveSchedule(schedule: Partial<NewsRefreshSchedule>) { const state = load(); save({ ...state, schedule: normalizeRefreshSchedule(schedule) }); },
    addSource(urlValue: string, name?: string): NewsSource {
      validateNewsSourceUrl(urlValue);
      const url = normalizeContentUrl(urlValue);
      const state = load();
      const existing = state.sources.find((source) => source.url === url);
      if (existing) return existing;
      const source: NewsSource = { id: crypto.randomUUID(), url, name: name?.trim() || new URL(url).hostname, platform: detectNewsPlatform(url), subscribedAt: now().toISOString(), loginStatus: "unknown" };
      save({ ...state, sources: [source, ...state.sources] });
      return source;
    },
    removeSource(id: string) { const state = load(); save({ ...state, sources: state.sources.filter((source) => source.id !== id), items: state.items.filter((item) => item.sourceId !== id) }); },
    updateSource(id: string, patch: Partial<NewsSource>) { const state = load(); save({ ...state, sources: state.sources.map((source) => source.id === id ? { ...source, ...patch, id: source.id } : source) }); },
    updateSourceProfile(id: string, profile: NewsSourceProfile) { const state = load(); const normalized = normalizeSourceProfile(profile); save({ ...state, sources: state.sources.map((source) => source.id === id ? { ...source, ...normalized, profileEdited: true } : source) }); },
    applyExtractedProfile(id: string, profile: NewsSourceProfile) { const state = load(); const normalized = normalizeSourceProfile(profile); save({ ...state, sources: state.sources.map((source) => source.id === id && !source.profileEdited ? { ...source, ...normalized } : source) }); },
    mergeItems(incoming: NewsItem[]) {
      const state = load();
      const seen = new Set([...state.fingerprints, ...state.items.flatMap((entry) => [entry.id, normalizeContentUrl(entry.url)])]);
      const added = incoming.filter((entry) => {
        const keys = [entry.id, normalizeContentUrl(entry.url)];
        if (keys.some((key) => seen.has(key))) return false;
        keys.forEach((key) => seen.add(key));
        return true;
      });
      save({ ...state, items: [...added, ...state.items], fingerprints: [...seen] });
      return added.length;
    },
    replaceLatestItems(incoming: NewsItem[]) {
      const state = load();
      const newest = new Map<string, NewsItem>();
      incoming.forEach((entry) => { const current = newest.get(entry.sourceId); if (!current || entry.publishedAt > current.publishedAt) newest.set(entry.sourceId, entry); });
      const replaceIds = new Set(newest.keys());
      const items = [...state.items.filter((entry) => !replaceIds.has(entry.sourceId)), ...newest.values()];
      save({ ...state, items });
      return newest.size;
    },
    removeItemsForSources(sourceIds: string[]) { const ids = new Set(sourceIds); const state = load(); save({ ...state, items: state.items.filter((item) => !ids.has(item.sourceId)) }); },
    addManualItem(input: ManualNewsInput, summary?: ManualNewsSummary): NewsItem {
      const state = load();
      const source = state.sources.find((entry) => entry.id === input.sourceId);
      if (!source) throw new Error("请选择订阅来源");
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title && !body) throw new Error("请填写标题或正文");
      const id = crypto.randomUUID();
      let url: string;
      try {
        if (input.url.trim()) url = normalizeContentUrl(input.url.trim());
        else { const localUrl = new URL(source.url); localUrl.searchParams.set("memo_manual", id); url = localUrl.toString(); }
      } catch { throw new Error("请输入有效的内容链接"); }
      if (state.items.some((entry) => normalizeContentUrl(entry.url) === url) || state.fingerprints.includes(url)) throw new Error("这条消息已经添加过了");
      const timestamp = now().toISOString();
      const item: NewsItem = {
        id, sourceId: source.id, platform: detectNewsPlatform(url),
        title: title || body.slice(0, 40), url, sourceName: source.displayName || source.name,
        publishedAt: timestamp, savedAt: timestamp, summary: summary?.summary || "",
        coreContent: summary?.coreContent || [], highlights: summary?.highlights || [],
        whyItMatters: summary?.whyItMatters, contentBasis: "网页正文",
      };
      const seen = new Set([...state.fingerprints, item.id, url]);
      save({ ...state, items: [item, ...state.items], fingerprints: [...seen] });
      return item;
    },
    cleanup(at = now()) { const state = load(); const items = state.items.filter((entry) => !isExpiredNewsItem(entry.savedAt, at)); save({ ...state, items }); return state.items.length - items.length; },
  };
}

export const newsRepository = typeof localStorage === "undefined" ? null : createNewsRepository(localStorage);
