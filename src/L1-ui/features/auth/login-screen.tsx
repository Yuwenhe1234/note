import { useEffect, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { enterAccount, listAccounts, type LocalUser } from "../../../L4-data/auth-repository";

export function LoginScreen({ onLogin }: { onLogin: (user: LocalUser) => void }) {
  const [username, setUsername] = useState(""); const [accounts, setAccounts] = useState<LocalUser[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { listAccounts().then(setAccounts).catch(() => {}); }, []);
  const submit = async () => { setBusy(true); setError(""); try { const user = await enterAccount(username); localStorage.setItem("memo-agent-last-account", user.username); onLogin(user); } catch (e) { setError(e instanceof Error ? e.message : "账户进入失败"); } finally { setBusy(false); } };
  return <main className="login-screen"><section className="login-intro"><i><Check /></i><em>PERSONAL AGENT WORKSPACE</em><h1>东非大裂谷</h1><p>每个本机账户拥有独立的任务、今日待办、设置与 AI 配置。</p></section><section className="login-card"><em>LOCAL ACCOUNT</em><h2>选择或创建账户</h2>{accounts.length > 0 && <div className="account-list">{accounts.map((account) => <button key={account.id} onClick={() => { setUsername(account.username); }}>{account.username}</button>)}</div>}<label><UserRound /> 账户名称<input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus /></label>{error && <p className="login-error">{error}</p>}<button className="primary" disabled={busy} onClick={submit}>{busy ? "处理中…" : "进入账户"}</button></section></main>;
}
