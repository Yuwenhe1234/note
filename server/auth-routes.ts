import type { Plugin } from "vite";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createAuthStore } from "./auth-store.js";

const store = createAuthStore(join(process.cwd(), ".local", "users.json"));
const sessions = new Map<string, { id: string; username: string }>();
const body = (request: NodeJS.ReadableStream) => new Promise<string>((resolve, reject) => { let text = ""; request.on("data", (part) => text += part); request.on("end", () => resolve(text)); request.on("error", reject); });
const send = (response: any, status: number, value: unknown) => { response.statusCode = status; response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(value)); };
const token = (request: any) => String(request.headers.cookie || "").match(/memo_session=([^;]+)/)?.[1] || "";

export function authRoutes(): Plugin { return { name: "auth-routes", configureServer(server) { server.middlewares.use(async (request, response, next) => { const current = sessions.get(token(request)); (request as any).localUser = current; if (!request.url?.startsWith("/api/auth/")) return next(); try { if (request.url === "/api/auth/session" && request.method === "GET") return send(response, 200, { ok: true, user: current || null }); if (request.url === "/api/auth/accounts" && request.method === "GET") return send(response, 200, { ok: true, accounts: await store.accounts() }); if (request.url === "/api/auth/logout" && request.method === "POST") { sessions.delete(token(request)); response.setHeader("Set-Cookie", "memo_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"); return send(response, 200, { ok: true }); } const input = JSON.parse(await body(request)); const user = request.url === "/api/auth/enter" ? await store.enter(input.username) : request.url === "/api/auth/register" ? await store.register(input.username, input.password) : request.url === "/api/auth/login" ? await store.login(input.username, input.password) : null; if (!user) return send(response, 404, { ok: false }); const id = randomBytes(24).toString("hex"); sessions.set(id, user); response.setHeader("Set-Cookie", `memo_session=${id}; Path=/; HttpOnly; SameSite=Lax`); return send(response, 200, { ok: true, user }); } catch (error) { return send(response, 400, { ok: false, error: error instanceof Error ? error.message : "认证失败" }); } }); } }; }
