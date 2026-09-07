export type LocalUser = { id: string; username: string };
const request = async (path: string, body?: unknown) => {
  const response = await fetch(path, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json(); if (!result.ok) throw new Error(result.error || "认证失败"); return result;
};
export const getSession = async (): Promise<LocalUser | null> => (await request("/api/auth/session")).user;
export const login = async (username: string, password: string): Promise<LocalUser> => (await request("/api/auth/login", { username, password })).user;
export const register = async (username: string, password: string): Promise<LocalUser> => (await request("/api/auth/register", { username, password })).user;
export const logout = async () => { await request("/api/auth/logout", {}); };
export const enterAccount = async (username: string): Promise<LocalUser> => (await request("/api/auth/enter", { username })).user;
export const listAccounts = async (): Promise<LocalUser[]> => (await request("/api/auth/accounts")).accounts;
