import { Heart, ShieldCheck, Sparkles } from "lucide-react";

export function CompanionWindow() {
  return <section className="feature-window simple-feature-window"><header className="feature-window-header"><div><small>AI COMPANION</small><h1>AI 陪伴</h1><p>把熟悉的形象带到桌面，在日常工作中陪伴你。</p></div><Heart /></header><section className="coming-soon-card"><Sparkles /><div><small>后续开放</small><h2>桌面宠物生成与陪伴</h2><p>后续将支持使用你有权使用的照片和声音，生成可互动的桌面伙伴。当前阶段不开放上传和训练。</p></div></section><section className="privacy-card"><ShieldCheck /><div><h2>隐私优先</h2><p>照片与声音素材默认保存在本机；如需云端模型处理，会在上传前明确说明范围，并提供彻底删除能力。</p></div></section></section>;
}
