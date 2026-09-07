# Widget List and Resize Implementation Plan

**Goal:** Limit TODAY to five items, separate completion from editing, and add proportional manual resizing.

### Task 1: Five-item TODAY behavior

- [ ] Add failing preview tests for a hard five-item cap, circle completion, and double-click editing.
- [ ] Update widget model limits and preview interaction markup.
- [ ] Run focused tests.

### Task 2: Resizable widget

- [ ] Add failing service tests for preserving width and explicit resize dimensions.
- [ ] Add Rust resize command with bounded width and height.
- [ ] Add a pointer-driven corner resize handle and relative CSS sizing.
- [ ] Run frontend and Rust checks.

### Task 3: Verification

- [ ] Rebuild release helper.
- [ ] Run full desktop test suite and manually validate dragging/resizing.
