# Widget Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and edit workspace items inside the desktop widget and make top-bar dragging reliable.

**Architecture:** Add narrow Rust JSON mutation helpers and Tauri commands that return the updated workspace. Keep modal state and validation in a focused React component, update widget state from command results, and invoke a Rust drag command from the top bar.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri 2, CSS

---

### Task 1: Native workspace mutations

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`

- [ ] Add failing Rust tests for adding a todo and editing a task.
- [ ] Implement JSON helpers and atomic workspace writes.
- [ ] Expose `add_desktop_widget_todo` and `update_desktop_widget_task` commands.
- [ ] Add failing then passing frontend service tests.

### Task 2: Inline editor UI

**Files:**
- Create: `src/L1-ui/features/desktop/widget-inline-editor.tsx`
- Create: `src/L1-ui/features/desktop/widget-inline-editor.test.tsx`
- Modify: `src/L1-ui/features/desktop/desktop-widget-window.tsx`
- Modify: `src/index.css`

- [ ] Add failing tests for add, edit, validation, cancel, and save.
- [ ] Implement the overlay editor and wire it to widget actions.
- [ ] Replace local hidden-ID state with returned workspace state.
- [ ] Increase adaptive height while an editor is open.

### Task 3: Reliable native dragging

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`

- [ ] Add a frontend test asserting the Rust drag command is invoked.
- [ ] Add `start_widget_dragging` and remove the JS window dragging dependency.
- [ ] Make the widget focusable in config and runtime.
- [ ] Run focused tests and `cargo check`.

### Task 4: Release verification

- [ ] Run desktop-related tests, type checking, Rust tests, and build.
- [ ] Rebuild the release helper.
- [ ] Verify the widget is movable and both inline editors persist data.
