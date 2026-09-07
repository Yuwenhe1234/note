import type { CollectedContent, CompletedNewsItem, NewsSummary, RefreshSource } from "./news-types.js";

type Options = { sources: RefreshSource[]; knownKeys: string[]; collect: (source: RefreshSource) => Promise<CollectedContent[]>; summarize: (content: CollectedContent) => Promise<NewsSummary>; now?: () => Date };

const normalized = (value: string) => { const url = new URL(value); url.hash = ""; [...url.searchParams.keys()].filter((key) => key.startsWith("utm_")).forEach((key) => url.searchParams.delete(key)); return url.toString().replace(/\/$/, ""); };

export async function refreshNewsSources({ sources, knownKeys, collect, summarize, now = () => new Date() }: Options) {
  const seen = new Set(knownKeys);
  const items: CompletedNewsItem[] = [];
  const errors: { sourceId: string; message: string }[] = [];
  const refreshed = await Promise.all(sources.map(async (source) => {
    try {
      const found = await collect(source);
      const sourceSeen = new Set<string>();
      const available = found.filter((content) => {
        const keys = [content.id, normalized(content.url)];
        if (keys.some((key) => seen.has(key) || sourceSeen.has(key))) return false;
        keys.forEach((key) => sourceSeen.add(key));
        return true;
      });
      const cutoff = source.lastSuccessfulRefreshAt || source.cursor;
      const eligible = cutoff
        ? available.filter((content) => new Date(content.publishedAt).getTime() > new Date(cutoff).getTime())
        : available.slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 1);
      for (const content of eligible) {
        const keys = [content.id, normalized(content.url)];
        const result = await summarize(content);
        keys.forEach((key) => seen.add(key));
        items.push({ ...content, sourceId: source.id, savedAt: now().toISOString(), ...result, coreContent: result.coreContent?.slice(0, 5), highlights: result.highlights.slice(0, 5) });
      }
      const refreshedAt = now().toISOString();
      return { ...source, cursor: refreshedAt, lastSuccessfulRefreshAt: refreshedAt };
    } catch (error) {
      errors.push({ sourceId: source.id, message: error instanceof Error ? error.message : "刷新失败" });
      return source;
    }
  }));
  return { items, errors, sources: refreshed };
}
