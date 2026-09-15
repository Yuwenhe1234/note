import { invoke, isTauri } from "@tauri-apps/api/core";

export async function sendTestSystemNotification() {
  window.dispatchEvent(new CustomEvent("memo-agent-test-reminder", { detail: { content: "系统通知已经可以正常工作。", reminderTime: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) } }));
  if (isTauri()) {
    await invoke("show_test_system_notification");
    return;
  }
}
