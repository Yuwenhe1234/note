export type PluginPermission = "network" | "files:read" | "files:write" | "notifications" | "ai" | "window";
export type PluginManifest = { id: string; name: string; version: string; developer: string; description: string; permissions: PluginPermission[] };
const permissions = new Set<PluginPermission>(["network", "files:read", "files:write", "notifications", "ai", "window"]);

export function parsePluginManifest(value: unknown): PluginManifest {
  if (!value || typeof value !== "object") throw new Error("插件清单格式错误");
  const input = value as Record<string, unknown>;
  for (const field of ["id", "name", "version", "developer", "description"]) if (typeof input[field] !== "string" || !String(input[field]).trim()) throw new Error(`插件字段 ${field} 无效`);
  if (!Array.isArray(input.permissions) || input.permissions.some((entry) => !permissions.has(entry as PluginPermission))) throw new Error("未知插件权限");
  return input as PluginManifest;
}

export const pluginPermissionLabels: Record<PluginPermission, string> = { network: "网络访问", "files:read": "读取文件", "files:write": "写入文件", notifications: "系统通知", ai: "调用 AI", window: "创建窗口" };
