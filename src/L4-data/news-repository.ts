import { detectNewsPlatform, isExpiredNewsItem, normalizeContentUrl, validateNewsSourceUrl, type NewsItem, type NewsSource } from "./news-model";

type NewsState = { version: 1; sources: NewsSource[]; items: NewsItem[]; fingerprints: string[] };
const KEY = "memo-agent-news-v1";
const empty = (): NewsState => ({ version: 1, sources: [], items: [], fingerprints: [] });

export function createNewsRepository(storage: Storage, now: () => Date = () => new Date()) {
  const load = (): NewsState => {
    try {
      const value = JSON.parse(storage.getItem(KEY) || "null");
      if (value?.version !== 1) return empty();
      const state = { ...empty(), ...value } as NewsState;
      return { ...state, sources: state.sources.filter((source) => { try { validateNewsSourceUrl(source.url); return true; } catch { return false; } }) };
    } catch { return empty(); }
  };
  const save = (state: NewsState) => storage.setItem(KEY, JSON.stringify(state));
  return {
    load,
    addSource(urlValue: string, name?: string): NewsSource {
      validateNewsSourceUrl(urlValue);
      const url = normalizeContentUrl(urlValue);
      const state = load();
      const existing = state.sources.find((source) => source.url === url);
      if (existing) return existing;
      const source: NewsSource = { id: crypto.randomUUID(), url, name: name?.trim() || new URL(url).hostname, platform: detectNewsPlatform(url), subscribedAt: now().toISOString(), loginStatus: "unknown" };
      save({ ...state, sources: [...state.sources, source] });
      return source;
    },
    removeSource(id: string) { const state = load(); save({ ...state, sources: state.sources.filter((source) => source.id !== id), items: state.items.filter((item) => item.sourceId !== id) }); },
    updateSource(id: string, patch: Partial<NewsSource>) { const state = load(); save({ ...state, sources: state.sources.map((source) => source.id === id ? { ...source, ...patch, id: source.id } : source) }); },
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
    cleanup(at = now()) { const state = load(); const items = state.items.filter((entry) => !isExpiredNewsItem(entry.savedAt, at)); save({ ...state, items }); return state.items.length - items.length; },
  };
}

export const newsRepository = typeof localStorage === "undefined" ? null : createNewsRepository(localStorage);
