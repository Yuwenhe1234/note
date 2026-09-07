# Desktop Widget Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the “放入桌面” card open a full-page configuration console where users preview settings and explicitly run the Windows widget.

**Architecture:** Reuse `DesktopConfigPage` and `WidgetPreview` as the single configuration/rendering path. Extend `DesktopWidgetSettings` with a normalized theme, persist it through the existing workspace flow, and launch the registered Windows protocol only from the console run button.

**Tech Stack:** React, TypeScript, Vitest, CSS, Tauri 2

---

### Task 1: Restore console navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] Add a failing test that clicking the “放入桌面” card opens the console and does not launch the widget.
- [ ] Restore `desktopConfigOpen` and render `DesktopConfigPage` as a full-page child view.
- [ ] Wire the card only to `setDesktopConfigOpen(true)`.
- [ ] Run the focused application test.

### Task 2: Add theme settings

**Files:**
- Modify: `src/L1-ui/features/desktop/widget-model.ts`
- Modify: `src/L1-ui/features/desktop/widget-model.test.ts`
- Modify: `src/L1-ui/features/desktop/desktop-config-page.tsx`
- Modify: `src/L1-ui/features/desktop/desktop-config-page.test.tsx`

- [ ] Add failing tests for the default `system` theme and legacy migration.
- [ ] Extend settings with `theme: "system" | "dark" | "light"` and normalize invalid values to `system`.
- [ ] Add a three-option theme selector to the console.
- [ ] Disable count fields when their content section is disabled.
- [ ] Run model and console tests.

### Task 3: Apply themes to preview and widget

**Files:**
- Modify: `src/L1-ui/features/desktop/widget-preview.tsx`
- Modify: `src/L1-ui/features/desktop/widget-preview.test.tsx`
- Modify: `src/index.css`

- [ ] Add a failing test asserting the preview exposes the selected theme class.
- [ ] Apply `widget-theme-system`, `widget-theme-dark`, or `widget-theme-light` to the shared preview.
- [ ] Add dark, light, and `prefers-color-scheme` styles while keeping text fully opaque.
- [ ] Run preview tests.

### Task 4: Launch only from console

**Files:**
- Modify: `src/L1-ui/features/desktop/desktop-config-page.tsx`
- Modify: `src/L1-ui/features/desktop/desktop-config-page.test.tsx`

- [ ] Add a failing test that the console exposes “运行桌面挂件” and invokes the window service.
- [ ] Rename the action and show created/shown/requested/error feedback inside the console.
- [ ] Run console and window-service tests.

### Task 5: Verify and rebuild helper

**Files:**
- Verify: `src-tauri/src/lib.rs`
- Verify: `scripts/register-widget-protocol.ps1`

- [ ] Run desktop-focused tests and type checking.
- [ ] Run the production frontend build and Rust tests/checks.
- [ ] Rebuild the release executable so it includes theme support.
- [ ] Re-register `memoagent://` and verify the command target.
- [ ] Manually verify console → preview → run → desktop widget → close.

### Task 6: Replace browser protocol with local launch API

**Files:**
- Create: `server/desktop-widget-routes.ts`
- Create: `server/desktop-widget-routes.test.ts`
- Modify: `vite.config.ts`
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`

- [ ] Add failing server tests for launching the release executable and reporting a missing executable.
- [ ] Implement a localhost-only `POST /api/desktop-widget/open` Vite route using a detached child process.
- [ ] Register the route before application API routes.
- [ ] Replace browser custom-protocol navigation with a fetch request to the local route.
- [ ] Add failing then passing browser service tests for success and server errors.
- [ ] Verify click-to-visible startup time and all desktop tests.
