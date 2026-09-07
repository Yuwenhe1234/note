export type ServerNewsPlatform = "douyin" | "bilibili" | "xiaohongshu" | "youtube" | "website";
export type NewsContentBasis = "视频字幕" | "语音转写" | "视频简介" | "网页正文";
export type NewsSummary = { summary: string; coreContent?: string[]; highlights: string[]; whyItMatters?: string; contentBasis?: NewsContentBasis };
export type RefreshSource = { id: string; url: string; name: string; platform: ServerNewsPlatform; subscribedAt: string; cursor?: string; lastSuccessfulRefreshAt?: string };
export type CollectedContent = { id: string; url: string; title: string; sourceName: string; platform: ServerNewsPlatform; publishedAt: string; thumbnailUrl?: string; text?: string; transcript?: string };
export type CompletedNewsItem = CollectedContent & { sourceId: string; savedAt: string } & NewsSummary;
