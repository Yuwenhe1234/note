import { useState } from "react";
import { Blocks, Shield } from "lucide-react";
import { parsePluginManifest, pluginPermissionLabels, type PluginManifest } from "../../../L3-plugins/plugin-manifest";

export function PluginCenterWindow({ manifests = [] }: { manifests?: PluginManifest[] }) {
  const plugins = manifests.map(parsePluginManifest);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem("memo-agent-enabled-plugins") || "{}"); } catch { return {}; } });
  const toggle = (id: string) => setEnabled((current) => { const next = { ...current, [id]: !current[id] }; localStorage.setItem("memo-agent-enabled-plugins", JSON.stringify(next)); return next; });
  return <section className="feature-window simple-feature-window"><header className="feature-window-header"><div><small>EXTENSIONS</small><h1>拓展功能</h1><p>通过明确的权限边界，为应用接入更多能力。</p></div><Blocks /></header>{plugins.length === 0 ? <section className="plugin-empty"><Blocks /><h2>插件接口已经预留</h2><p>当前没有安装插件。后续开发者可以按照统一清单和权限接口接入功能。</p></section> : <section className="plugin-grid">{plugins.map((plugin) => <article key={plugin.id}><div className="plugin-title"><Shield /><div><h2>{plugin.name}</h2><small>{plugin.developer} · {plugin.version}</small></div></div><p>{plugin.description}</p><div className="plugin-permissions">{plugin.permissions.map((permission) => <span key={permission}>{pluginPermissionLabels[permission]}</span>)}</div><button className="primary" onClick={() => toggle(plugin.id)} aria-label={`${enabled[plugin.id] ? "停用" : "启用"} ${plugin.name}`}>{enabled[plugin.id] ? "停用" : "启用"}</button></article>)}</section>}</section>;
}
