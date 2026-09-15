import { invoke, isTauri } from "@tauri-apps/api/core";

export async function sendTestSystemNotification() {
  if (isTauri()) {
    await invoke("show_test_system_notification");
    return;
  }
  if (typeof Notification === "undefined") throw new Error("当前环境不支持系统通知");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("系统通知权限未授权");
  new Notification("任务提醒测试", { body: "系统通知已经可以正常工作。" });
}
