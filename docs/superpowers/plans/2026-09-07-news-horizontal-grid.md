# News Horizontal Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized news refresh action and long feed cards with a compact left-column refresh control, a three-row horizontally scrolling card rail, and one accessible structured-detail panel.

**Architecture:** Keep refresh, persistence, crawling, and retention behavior intact. Extend the news summary payload with optional structured fields while preserving existing `summary` and `highlights`, then render compact selectable cards from repository state and derive one detail panel from the selected item.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, CSS

---

## File map

- Modify `server/news-types.ts`: define the structured AI summary fields returned with completed items.
- Modify `server/news-service.ts`: preserve structured summary fields when refresh results are assembled.
- Modify `server/news-routes.ts`: request and validate the approved summary structure and label its actual source basis.
- Modify `server/news-service.test.ts`: verify structured fields survive the refresh pipeline.
- Modify `src/L4-data/news-model.ts`: expose optional structured fields to the UI while keeping stored legacy items valid.
- Modify `src/L1-ui/features/news/news-window.tsx`: move refresh, render the three-row rail, and implement one selected detail panel.
- Modify `src/L1-ui/features/news/news-window.test.tsx`: verify compact-card content, refresh placement, and open/switch/close interaction.
- Modify `src/index.css`: style the left refresh action, horizontal rail, compact cards, detail panel, and responsive layout.

### Task 1: Preserve the approved structured AI result

**Files:**
- Modify: `server/news-types.ts`
- Modify: `server/news-service.ts`
- Modify: `server/news-service.test.ts`
- Modify: `server/news-routes.ts`
- Modify: `src/L4-data/news-model.ts`

- [ ] **Step 1: Write the failing service test**

Add a test where `summarize` returns:

```ts
{
  summary: "一句话总结",
  coreContent: ["核心一", "核心二"],
  highlights: ["重点一"],
  whyItMatters: "值得关注的原因",
  contentBasis: "视频简介"
}
```

Assert that the first returned item contains all five fields unchanged.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run server/news-service.test.ts`

Expected: FAIL because `coreContent`, `whyItMatters`, and `contentBasis` are not part of the service summary result.

- [ ] **Step 3: Add compatible structured types and propagation**

Define this shared shape in the server types and mirror the optional fields in `NewsItem`:

```ts
export type NewsSummary = {
  summary: string;
  coreContent?: string[];
  highlights: string[];
  whyItMatters?: string;
  contentBasis?: "视频字幕" | "语音转写" | "视频简介" | "网页正文";
};
```

Use `NewsSummary` for the summarizer return type and spread the optional fields into `CompletedNewsItem`. Keep them optional so previously stored `memo-agent-news-v1` data remains readable.

- [ ] **Step 4: Update the AI prompt and response validation**

Request strict JSON in this form:

```json
{"summary":"一句话总结","coreContent":["核心内容"],"highlights":["重点信息"],"whyItMatters":"值得关注"}
```

The system message must require source-only claims and 3–5 entries for `coreContent` and `highlights`. Validate strings and arrays, cap both arrays at five items, and assign `contentBasis` server-side from the actual input: transcript → `视频字幕`, website text → `网页正文`, other platform text → `视频简介`.

- [ ] **Step 5: Run focused server tests and verify GREEN**

Run: `npm test -- --run server/news-service.test.ts server/news-adapters.test.ts`

Expected: both files pass with zero failures.

### Task 2: Implement the card rail and detail interaction

**Files:**
- Modify: `src/L1-ui/features/news/news-window.test.tsx`
- Modify: `src/L1-ui/features/news/news-window.tsx`

- [ ] **Step 1: Write failing UI tests**

Use refresh results containing two items. Assert:

```ts
expect(screen.getByTestId("news-sidebar")).toContainElement(screen.getByRole("button", { name: "刷新" }));
expect(screen.getByTestId("news-card-rail")).toHaveAttribute("aria-label", "今日消息列表");
expect(screen.queryByText("一句话总结")).not.toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: /Example：新视频/ }));
expect(screen.getByRole("region", { name: "消息详情" })).toHaveTextContent("一句话总结");
```

Also click the active card again and assert the detail region closes, then open a second card and assert its title replaces the first.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: FAIL because the refresh button is still in the header and cards are not selectable.

- [ ] **Step 3: Implement minimal accessible markup**

Add `selectedItemId` state. Move the existing refresh button below the source list inside a wrapper marked `data-testid="news-sidebar"`. Sort items once, render each compact item as a `<button>` with `aria-expanded`, and use `data-testid="news-card-rail"` on the scrolling rail.

Render one `<section role="region" aria-label="消息详情">` after the rail when an item is selected. Show the approved section order, use `coreContent ?? highlights` for legacy items, and keep the original-content link at the bottom.

- [ ] **Step 4: Run focused UI tests and verify GREEN**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: all `NewsWindow` tests pass.

### Task 3: Apply the approved visual layout

**Files:**
- Modify: `src/index.css`
- Test: `src/L1-ui/features/news/news-window.test.tsx`

- [ ] **Step 1: Add a failing structural assertion**

Assert that the cards are inside `.news-card-grid` and the selected card receives `.is-active`. Run the focused test and confirm it fails before the CSS-oriented markup class is present.

- [ ] **Step 2: Add focused layout styles**

Use a left column wrapper with a full-width but compact refresh button. Make `.news-card-rail` horizontally scrollable and `.news-card-grid` use:

```css
display: grid;
grid-template-rows: repeat(3, minmax(112px, 1fr));
grid-auto-flow: column;
grid-auto-columns: 240px;
```

Style cards as dark bordered buttons with two-line title truncation, active/focus states, and no summary text. Style `.news-detail` as a separate panel under the rail, with readable section spacing and the original link last. On narrow screens, stack the sidebar above the feed and retain horizontal scrolling.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: all focused UI tests pass.

### Task 4: Verify the complete change

**Files:**
- Verify all modified files above.

- [ ] **Step 1: Run all automated tests**

Run: `npm test -- --run`

Expected: all test files pass with zero failures.

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and Vite reports a successful production build.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and `git diff -- src/L1-ui/features/news/news-window.tsx src/L1-ui/features/news/news-window.test.tsx src/L4-data/news-model.ts server/news-types.ts server/news-service.ts server/news-service.test.ts server/news-routes.ts src/index.css`

Expected: no whitespace errors and only the approved news UI and structured-summary changes.
