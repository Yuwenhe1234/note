# Local Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add offline local accounts, login UI, sessions, and per-user workspace/AI configuration isolation.

**Architecture:** A Node auth store writes salted password hashes to `.local/users.json`; Vite middleware issues HttpOnly sessions. Workspace and AI stores resolve their paths from the authenticated user id; React gates the app behind `/api/auth/session`.

**Tech Stack:** Node crypto, filesystem APIs, Vite middleware, React, Vitest.

---

### Task 1: Local auth store and session routes

- [ ] Create `server/auth-store.ts` and tests for first-user creation, scrypt password verification, duplicate usernames, and invalid passwords.
- [ ] Create `server/auth-routes.ts` with `GET /api/auth/session`, `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout`.
- [ ] Use `HttpOnly; SameSite=Lax` session cookies and return 401 from protected workspace and AI routes.

### Task 2: Per-user data paths and migration

- [ ] Move workspace path resolution to `.local/users/<id>/workspace-data.json`.
- [ ] Move AI configuration path resolution to `.local/users/<id>/ai-config.json`.
- [ ] On first account creation, copy legacy `.local/workspace-data.json` and `.local/ai-config.json` into the user directory if present.

### Task 3: Login interface and app gate

- [ ] Create `src/L1-ui/features/auth/login-screen.tsx` with login and create-account modes.
- [ ] Add `src/L4-data/auth-repository.ts` for session, login, register, and logout requests.
- [ ] Hydrate current session before rendering `App`; render the login screen while unauthenticated.
- [ ] Add a header account action with current username and logout.

### Task 4: Verification

- [ ] Add tests for auth routes and login UI states.
- [ ] Run full tests, typecheck, build, and diff check.
