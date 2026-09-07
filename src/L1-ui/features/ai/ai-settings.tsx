import { useEffect, useState } from "react";
import { PageBackButton } from "../../components/page-back-button";

type Config = {
  provider: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
};
type Profile = { id: string; label: string; baseUrl: string; model: string };
const CUSTOM_PROFILES_KEY = "memo-agent-custom-ai-profiles";
const providers: Record<string, Profile> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  qwen: {
    id: "qwen",
    label: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  zhipu: {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
  },
  custom: { id: "custom", label: "自定义兼容接口", baseUrl: "", model: "" },
};
const providerModels: Record<string, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4.1", "gpt-5-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  qwen: ["qwen-turbo", "qwen-plus", "qwen-max"],
  zhipu: ["glm-4-flash", "glm-4-plus"],
};
const empty: Config = {
  provider: "openai",
  baseUrl: providers.openai.baseUrl,
  model: providers.openai.model,
  enabled: false,
  hasApiKey: false,
};

export function AiSettings() {
  const [config, setConfig] = useState<Config>(empty);
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [customProfiles, setCustomProfiles] = useState<Profile[]>(() =>
    JSON.parse(localStorage.getItem(CUSTOM_PROFILES_KEY) || "[]"),
  );
  const [selected, setSelected] = useState("openai");
  const [activeProvider, setActiveProvider] = useState("openai");
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [page, setPage] = useState<"list" | "custom">("list");
  const choices = [...Object.values(providers), ...customProfiles];
  useEffect(() => {
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then((r) => {
        if (r.ok) {
          setConfig(r.data);
          setSelected(r.data.provider);
          setActiveProvider(r.data.provider);
        }
      })
      .catch(() => setMessage("本地 AI 服务未启动"));
  }, []);
  const select = (id: string) => {
    const profile = choices.find((item) => item.id === id)!;
    setSelected(id);
    setConfig({
      ...config,
      provider: id.startsWith("custom-") ? "custom" : id,
      baseUrl: profile.baseUrl,
      model: profile.model,
    });
  };
  const save = async () => {
    const response = await fetch("/api/ai/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, enabled: true, apiKey: key }),
    });
    const result = await response.json();
    if (result.ok) {
      setConfig(result.data);
      setActiveProvider(selected);
      setKey("");
      setMessage("配置已保存，API Key 不会显示在页面中");
    } else setMessage(result.error);
  };
  const test = async () => {
    setMessage("正在测试连接…");
    const result = await fetch("/api/ai/test", { method: "POST" }).then((r) =>
      r.json(),
    );
    setMessage(result.ok ? "连接成功" : result.error);
  };
  const addProfile = () => {
    if (!customName.trim() || !customUrl.trim() || !customModel.trim())
      return setMessage("请填写名称、Base URL 和模型");
    const profile = {
      id: `custom-${Date.now()}`,
      label: customName.trim(),
      baseUrl: customUrl.trim(),
      model: customModel.trim(),
    };
    const next = [...customProfiles, profile];
    setCustomProfiles(next);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(next));
    setSelected(profile.id);
    setConfig({
      ...config,
      provider: "custom",
      baseUrl: profile.baseUrl,
      model: profile.model,
    });
    setCustomName("");
    setCustomUrl("");
    setCustomModel("");
    setMessage("自定义 API 已添加");
    setPage("list");
  };
  const removeProfile = () => {
    if (!selected.startsWith("custom-")) return;
    const next = customProfiles.filter((profile) => profile.id !== selected);
    setCustomProfiles(next);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(next));
    select("custom");
    setMessage("自定义 API 已删除");
  };
  if (page === "custom")
    return (
      <section className="ai-settings custom-api-page">
        <PageBackButton label="返回 AI 与 API" onClick={() => setPage("list")} />
        <h2>添加自定义 API</h2>
        <p>填写一个兼容 OpenAI Chat Completions 的服务地址。</p>
        <div className="custom-api">
          <label>
            自定义名称
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
          <label>
            自定义 Base URL
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
          </label>
          <label>
            自定义模型
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
            />
          </label>
          <div className="ai-actions">
            <button className="btn-secondary" onClick={() => setPage("list")}>
              取消
            </button>
            <button className="new" onClick={addProfile}>
              添加 API
            </button>
          </div>
        </div>
        {message && <p className="ai-message">{message}</p>}
      </section>
    );
  return (
    <section className="ai-settings">
      <p className="eyebrow">AI 与 API</p>
      <h2>任务 AI 分析</h2>
      <p className="current-provider">
        当前服务商：
        {choices.find((item) => item.id === activeProvider)?.label || "未选择"}
      </p>
      <div className="provider-grid">
        {choices.map((profile) => (
          <button
            key={profile.id}
            aria-label={profile.label}
            className={selected === profile.id ? "active" : ""}
            onClick={() =>
              profile.id === "custom" ? setPage("custom") : select(profile.id)
            }
          >
            {profile.label}
            <small>{profile.model || "自定义模型"}</small>
          </button>
        ))}
      </div>
      {selected.startsWith("custom-") && (
        <button className="btn-secondary" onClick={removeProfile}>
          删除当前 API
        </button>
      )}
      <label>
        模型名称
        {config.provider === "custom" ? (
          <input
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
          />
        ) : (
          <select
            aria-label="模型名称"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
          >
            {(providerModels[config.provider] || [config.model]).map(
              (model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ),
            )}
          </select>
        )}
      </label>
      <label>
        API Key
        <input
          aria-label="API Key"
          type="password"
          placeholder={
            config.hasApiKey ? "已配置（留空则不修改）" : "输入 API Key"
          }
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <details className="advanced-settings">
        <summary>高级设置</summary>
        <label>
          Base URL
          <input
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
          />
        </label>
      </details>
      <div className="ai-actions">
        <button className="btn-secondary" onClick={save}>
          保存并设为当前
        </button>
        <button className="new" onClick={test}>
          测试当前连接
        </button>
      </div>
      {message && <p className="ai-message">{message}</p>}
    </section>
  );
}
