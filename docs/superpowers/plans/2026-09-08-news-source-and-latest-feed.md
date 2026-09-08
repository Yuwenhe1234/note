# News Source Profiles and Latest Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show verified, editable creator profiles and exactly one latest message per source in a three-column, nine-card viewport.

**Architecture:** Persist optional source-profile fields. Collection returns public profile data with verified content; refresh replaces, instead of appending, the latest message keyed by source ID. The UI renders a bounded grid and hides unsupported summary sections.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Playwright Core, CSS

---

### Task 1: Persist source profiles and replace latest items

**Files:**
- Modify: `src/L4-data/news-model.ts`
- Modify: `src/L4-data/news-repository.ts`
- Test: `src/L4-data/news-model.test.ts`
- Test: `src/L4-data/news-repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Test a source profile with `displayName`, a 25-character-or-shorter `profileDescription`, two tags, and `profileEdited: true`. Test `replaceLatestItems` with two old items from one source and assert one incoming newest item replaces both; assert a second source remains represented by exactly one item.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/L4-data/news-model.test.ts src/L4-data/news-repository.test.ts`

Expected: FAIL because source profiles and source-keyed replacement do not exist.

- [ ] **Step 3: Implement minimal repository API**

Extend `NewsSource` with optional `displayName`, `profileDescription`, `tags`, and `profileEdited`. Add `normalizeSourceProfile` to trim name, cap description at 25 characters, and keep at most two unique non-empty tags. Add:

```ts
updateSourceProfile(id, profile) // profileEdited: true
applyExtractedProfile(id, profile) // no-op when profileEdited
replaceLatestItems(incoming) // one item for each incoming sourceId
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/L4-data/news-model.test.ts src/L4-data/news-repository.test.ts`

Expected: all focused tests pass.

### Task 2: Return verified profiles and one latest item per source

**Files:**
- Modify: `server/news-types.ts`
- Modify: `server/news-adapters.ts`
- Modify: `server/news-browser.ts`
- Modify: `server/news-service.ts`
- Modify: `server/news-routes.ts`
- Test: `server/news-adapters.test.ts`
- Test: `server/news-browser.test.ts`
- Test: `server/news-service.test.ts`

- [ ] **Step 1: Write failing server tests**

Provide public page/API fixtures with explicit nickname, description, and two keywords. Assert extraction returns `{ displayName, profileDescription, tags }`; fixture without those fields returns an empty profile. Provide two verified items from one source and assert refresh returns only the newest one and one profile update per source. Assert polluted platform DOM without a verified API payload fails rather than returning a recommended item.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run server/news-adapters.test.ts server/news-browser.test.ts server/news-service.test.ts`

Expected: FAIL because collection returns content arrays only and refresh may retain multiple entries per source.

- [ ] **Step 3: Implement verified collection and sparse summaries**

Make collection return `{ items, profile }`. Derive profile fields only from public metadata, platform-native nickname fields, or captured first-party API responses. Map tags only when explicit keywords occur in public descriptions. Return no placeholder name, description, or tag.

Refresh sorts each source result by `publishedAt`, summarizes the first item only, returns source-profile updates, and never uses a low-quality DOM fallback for a platform when verified data is unavailable. AI JSON allows empty fields; it must not repeat titles, invent facts, or return `coreContent` unless it has 3–5 supported points.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run server/news-adapters.test.ts server/news-browser.test.ts server/news-service.test.ts`

Expected: all focused server tests pass.

### Task 3: Render source cards, grid, and sparse modal

**Files:**
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/L1-ui/features/news/news-window.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing UI tests**

Assert a source card shows display name, short description, two tags, weak platform label, homepage/edit/delete actions. Save the edit dialog and assert the manual values persist. Refresh ten sources and assert one card per source, a grid marked `news-latest-grid`, and an internal vertical scroll container. Assert a source returning two items displays only its newest title and a blank summary is not rendered.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: FAIL because existing cards show domain names and append item history.

- [ ] **Step 3: Implement source editor and replacement refresh**

Add a small dialog with fields `UP 主名称`, `一句话定位`, and `分类标签（最多2个，逗号分隔）`. Source cards use `displayName`, then verified item name, then `待补充资料`; domain remains weak platform information only. Apply extracted profiles only when not manually edited. On refresh call `replaceLatestItems`, not `mergeItems`.

- [ ] **Step 4: Implement grid and modal sparsity**

Desktop cards use `grid-template-columns: repeat(3, minmax(0, 1fr))`; the scroll viewport holds exactly three rows. Cards show source name, platform, two-line title, optional two-line summary, and time. The modal shows basic information, optional summary, core content only when length is 3–5, optional worthwhile section, and original link last; remove content-basis copy and highlight filler.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: all focused UI tests pass.

### Task 4: Complete verification

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`

Expected: zero failures.

- [ ] **Step 2: Type-check and build**

Run: `npm run typecheck` then `npm run build`

Expected: both exit with code 0.

- [ ] **Step 3: Review and commit**

Run: `git diff --check`, inspect that no synthetic content is introduced, then commit only source, server, repository, UI, CSS, and test files with message `feat: show latest verified source messages`.
