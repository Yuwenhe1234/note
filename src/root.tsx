import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { enterAccount, getSession, logout, type LocalUser } from "./L4-data/auth-repository";
import { LoginScreen } from "./L1-ui/features/auth/login-screen";
import { WidgetWindowRoot } from "./L1-ui/features/desktop/desktop-widget-window";
import { runtimeCapabilities } from "./L5-services/runtime-capabilities";

function isWidgetWindow(): boolean {
  try {
    return getCurrentWindow().label === "desktop-widget" || new URLSearchParams(window.location.search).get("window") === "widget";
  } catch {
    return new URLSearchParams(window.location.search).get("window") === "widget";
  }
}

export function Root() {
  const [user, setUser] = useState<LocalUser | null | undefined>(undefined);
  const isWidget = isWidgetWindow();
  useEffect(() => {
    if (isWidget || runtimeCapabilities.staticWeb) return;
    getSession().then(async (session) => {
      if (session) return setUser(session);
      const last = localStorage.getItem("memo-agent-last-account");
      setUser(last ? await enterAccount(last).catch(() => null) : null);
    }).catch(() => setUser(null));
  }, [isWidget]);
  if (isWidget) return <WidgetWindowRoot />;
  if (runtimeCapabilities.staticWeb) return <App />;
  if (user === undefined) return <div className="app-loading">正在加载本机工作区…</div>;
  return user ? <><button className="account-logout" onClick={async () => { await logout(); localStorage.removeItem("memo-agent-last-account"); setUser(null); }}>{user.username} · 退出账户</button><App /></> : <LoginScreen onLogin={setUser} />;
}
