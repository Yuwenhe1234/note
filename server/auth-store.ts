import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
type User = { id: string; username: string; salt: string; passwordHash: string; createdAt: string };

export function createAuthStore(path: string) {
  const load = async (): Promise<{ users: User[] }> => { try { return JSON.parse(await readFile(path, "utf8")); } catch { return { users: [] }; } };
  const hash = async (password: string, salt: string) => Buffer.from(await scrypt(password, salt, 64) as ArrayBuffer).toString("hex");
  async function register(username: string, password: string) { const clean = username.trim(); if (clean.length < 2 || password.length < 6) throw new Error("用户名至少 2 个字符，密码至少 6 个字符"); const data = await load(); if (data.users.some((u) => u.username.toLowerCase() === clean.toLowerCase())) throw new Error("用户名已存在"); const salt = randomBytes(16).toString("hex"); const user: User = { id: randomBytes(16).toString("hex"), username: clean, salt, passwordHash: await hash(password, salt), createdAt: new Date().toISOString() }; await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify({ users: [...data.users, user] }, null, 2), "utf8"); return { id: user.id, username: user.username }; }
  async function login(username: string, password: string) { const user = (await load()).users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase()); if (!user) throw new Error("用户名或密码不正确"); const a = Buffer.from(await hash(password, user.salt), "hex"), b = Buffer.from(user.passwordHash, "hex"); if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("用户名或密码不正确"); return { id: user.id, username: user.username }; }
  const accounts = async () => (await load()).users.map(({ id, username }) => ({ id, username }));
  async function enter(username: string) { const clean = username.trim(); if (clean.length < 2) throw new Error("账户名称至少 2 个字符"); const existing = (await load()).users.find((user) => user.username.toLowerCase() === clean.toLowerCase()); if (existing) return { id: existing.id, username: existing.username }; return register(clean, randomBytes(12).toString("hex")); }
  return { load, register, login, accounts, enter };
}
