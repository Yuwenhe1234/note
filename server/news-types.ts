export type ServerNewsPlatform = "douyin" | "bilibili" | "xiaohongshu" | "youtube" | "website";
export type RefreshSource = { id: string; url: string; name: string; platform: ServerNewsPlatform; subscribedAt: string; cursor?: string; lastSuccessfulRefreshAt?: string };
export type CollectedContent = { id: string; url: string; title: string; sourceName: string; platform: ServerNewsPlatform; publishedAt: string; thumbnailUrl?: string; text?: string; transcript?: string };
export type CompletedNewsItem = CollectedContent & { sourceId: string; savedAt: string; summary: string; highlights: string[] };
