# Browser-to-Widget Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the local browser website to open the Windows desktop widget with one click, without compiling or browsing the project folder.

**Architecture:** Register a per-user `memoagent://` Windows protocol pointing at a prebuilt Tauri executable. Browser mode navigates to `memoagent://widget`; the Tauri process detects that argument, hides the main window, shows the preloaded widget after page load, and exits when the widget is closed.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri 2, Windows Registry

---

### Task 1: Browser protocol request

**Files:**
- Modify: `src/L5-services/widget-window.ts`
- Modify: `src/L5-services/widget-window.test.ts`
- Modify: `src/App.tsx`

- [ ] Add a failing test asserting browser mode navigates to `memoagent://widget` and returns `requested`.
- [ ] Run the focused Vitest test and confirm the expected failure.
- [ ] Add `requested` to `DesktopWidgetResult` and implement browser protocol navigation.
- [ ] Update the website toast to report that Windows is opening the widget.
- [ ] Run focused tests and type checking.

### Task 2: Widget-only Tauri process

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] Add testable argument detection for `memoagent://widget` and `--widget`.
- [ ] Run `cargo test` and confirm the new test fails before implementation.
- [ ] Add widget-only startup state, hide the main window, and show the widget after its page loads.
- [ ] Exit the widget-only process when its close button invokes `hide_desktop_widget`.
- [ ] Run `cargo test` and `cargo check`.

### Task 3: Release build and protocol registration

**Files:**
- Create: `scripts/register-widget-protocol.ps1`

- [ ] Build the Tauri release executable once with the configured MSVC environment.
- [ ] Add a registration script that writes only `HKCU:\Software\Classes\memoagent` and points its command to the release executable.
- [ ] Register the protocol for the current Windows user.
- [ ] Read back the registry command and verify the executable exists.
- [ ] Invoke `memoagent://widget` and verify a visible `任务组件` window appears while the main window stays hidden.

### Task 4: Regression verification

**Files:**
- Test: `src/L5-services/widget-window.test.ts`
- Test: `src/L1-ui/features/desktop/desktop-widget-window.test.tsx`

- [ ] Run desktop-focused Vitest tests.
- [ ] Run TypeScript type checking and production frontend build.
- [ ] Run Rust tests and checks.
- [ ] Verify website click behavior through the registered Windows protocol.
