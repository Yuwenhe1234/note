# News Modal and Source Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open news details in an accessible centered in-page modal and constrain the source list to four visible cards with internal vertical scrolling.

**Architecture:** Keep selection state inside `NewsWindow`, but move detail markup into a modal overlay rendered by the same component. Use refs and an effect for Escape handling, scroll locking, initial focus, and focus restoration; implement the source limit through a dedicated scroll-container class so source data behavior remains unchanged.

**Tech Stack:** React, TypeScript, Testing Library, Vitest, CSS

---

### Task 1: Convert the detail region into a modal dialog

**Files:**
- Modify: `src/L1-ui/features/news/news-window.test.tsx`
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing modal interaction tests**

After opening a news card, assert:

```ts
const dialog = screen.getByRole("dialog", { name: "新视频" });
expect(dialog).toHaveAttribute("aria-modal", "true");
expect(screen.getByRole("button", { name: "关闭消息详情" })).toHaveFocus();
expect(document.body).toHaveClass("news-modal-open");
```

Test three close paths separately: click the close button, press Escape, and click the overlay. Verify clicking the dialog body does not close it. For every close path, assert the dialog is removed; for the close button path, also assert focus returns to the triggering card.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: FAIL because the current detail uses `role="region"` and has no overlay, close button, Escape handler, or focus management.

- [ ] **Step 3: Implement the modal behavior**

Add a trigger-card ref and close-button ref. When a card opens, remember its button; use an effect keyed by `selectedItemId` to add `news-modal-open` to `document.body`, listen for Escape, focus the close button, and clean up the class and listener. Use one `closeDetail()` function to clear selection and restore trigger focus.

Render the existing detail content in this structure:

```tsx
<div className="news-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeDetail()}>
  <section className="news-detail-modal" role="dialog" aria-modal="true" aria-labelledby="news-detail-title">
    <button ref={closeButtonRef} aria-label="关闭消息详情" onClick={closeDetail}><X /></button>
    <h2 id="news-detail-title">{selectedItem.title}</h2>
  </section>
</div>
```

Keep the existing approved summary sections and bottom source link inside the dialog. Card activation always opens the selected item; it no longer toggles a persistent inline detail or adds `.is-active`.

- [ ] **Step 4: Style the modal**

Use a fixed full-viewport overlay with a dark translucent blurred background and a centered modal sized `min(760px, calc(100vw - 40px))`. Set `max-height: 85vh` and `overflow-y: auto` on the modal. Position the close control at the top right and add `body.news-modal-open { overflow: hidden; }`. Remove inline-detail spacing assumptions and the active-card style.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: all `NewsWindow` tests pass.

### Task 2: Limit the source list to four visible cards

**Files:**
- Modify: `src/L1-ui/features/news/news-window.test.tsx`
- Modify: `src/L1-ui/features/news/news-window.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing source-list structure test**

Add five valid website sources through the form and assert:

```ts
const list = screen.getByRole("list", { name: "订阅来源列表" });
expect(within(list).getAllByRole("listitem")).toHaveLength(5);
expect(list).toHaveClass("news-source-scroll");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: FAIL because the current source list has no list semantics or dedicated constrained-scroll class.

- [ ] **Step 3: Add list semantics and constrained scrolling**

Render the source container with `role="list"`, `aria-label="订阅来源列表"`, and class `news-source-list news-source-scroll`; give each source article `role="listitem"`.

Set a stable source-card block size and use:

```css
.news-source-scroll {
  max-height: 316px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
```

The height fits four source cards plus their three gaps. The input, add button, and refresh button remain outside this scrolling element.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- --run src/L1-ui/features/news/news-window.test.tsx`

Expected: all focused tests pass.

### Task 3: Complete verification

**Files:**
- Verify: `src/L1-ui/features/news/news-window.tsx`
- Verify: `src/L1-ui/features/news/news-window.test.tsx`
- Verify: `src/index.css`

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`

Expected: all test files pass with zero failures.

- [ ] **Step 2: Run type checking and production build**

Run: `npm run typecheck` and `npm run build`

Expected: both exit with code 0.

- [ ] **Step 3: Review the scoped diff**

Run: `git diff --check -- src/L1-ui/features/news/news-window.tsx src/L1-ui/features/news/news-window.test.tsx src/index.css` and inspect the full diff.

Expected: no whitespace errors and no changes to refresh, crawling, persistence, or retention logic.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/L1-ui/features/news/news-window.tsx src/L1-ui/features/news/news-window.test.tsx src/index.css
git commit -m "feat: open news details in modal"
```
