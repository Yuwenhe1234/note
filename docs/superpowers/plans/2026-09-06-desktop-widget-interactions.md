# Desktop Widget Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove widget scrollbars, add top-bar dragging and content-based sizing, and connect widget actions to the real website workspace.

**Architecture:** Keep rendering in React, use small pure helpers for height and deep-link parsing, and use narrowly scoped Tauri commands for native window sizing, workspace mutation, and opening the local website. The release-only main window is never shown from widget actions.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri 2, CSS

---

### Task 1: Window layout and adaptive height

**Files:**
- Modify: `src/L1-ui/features/desktop/desktop-widget-window.tsx`
- Create: `src/L1-ui/features/desktop/widget-window-layout.ts`
- Create: `src/L1-ui/features/desktop/widget-window-layout.test.ts`
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/index.css`
- Modify: `src-tauri/src/lib.rs`

- [ ] Add failing tests for height calculation from enabled sections and visible items.
- [ ] Implement bounded height calculation and call a new native resize command after data changes.
- [ ] Mark both `html` and `body` as widget mode and disable their scrollbars.
- [ ] Add a full-width top drag surface while keeping controls clickable.
- [ ] Run focused tests, type checking, and `cargo check`.

### Task 2: Complete TODAY items

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`
- Modify: `src/L1-ui/features/desktop/desktop-widget-window.tsx`
- Modify: `src/L1-ui/features/desktop/desktop-widget-window.test.tsx`

- [ ] Add failing Rust tests for completing an existing todo and rejecting an unknown ID.
- [ ] Implement an atomic, path-restricted workspace update command.
- [ ] Add a typed frontend service and failing service test.
- [ ] Update widget state only after native success so the item disappears immediately.
- [ ] Add a component test and run all focused tests.

### Task 3: Website deep links for add and task open

**Files:**
- Create: `src/L5-services/widget-navigation.ts`
- Create: `src/L5-services/widget-navigation.test.ts`
- Modify: `src/L1-ui/features/desktop/desktop-widget-window.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src-tauri/src/lib.rs`

- [ ] Add failing tests for encoded add-today and task URLs.
- [ ] Implement a native command that opens only the fixed local website origin.
- [ ] Replace widget focus-main actions with website navigation services.
- [ ] Add failing App tests for query-driven view/editor opening and URL cleanup.
- [ ] Implement query consumption after workspace loading.
- [ ] Run focused frontend and Rust tests.

### Task 4: Release and end-to-end verification

**Files:**
- Verify: `src-tauri/target/release/app.exe`

- [ ] Run all desktop-related Vitest tests, type checking, and frontend build.
- [ ] Run `cargo test` and `cargo check`.
- [ ] Rebuild the release helper.
- [ ] Launch through `/api/desktop-widget/open` and verify no scrollbars, adaptive size, and visible drag bar.
- [ ] Verify TODAY completion persists and website deep links open the expected screens.
