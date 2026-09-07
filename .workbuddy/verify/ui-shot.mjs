// 零依赖 CDP 截图脚本：验证"其他功能"页面 hover 绿色光圈与右上角箭头
// 用法: node ui-shot.mjs
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP_URL = "http://127.0.0.1:5199/";
const PORT = 9333;
const OUT_DIR = "D:\\桌面\\项目\\note\\.workbuddy\\verify";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "edge-cdp-"));
const edge = spawn(EDGE, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--window-size=1400,900",
  "--no-first-run",
  "about:blank",
], { stdio: "ignore" });

let ws;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getTargetWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    await sleep(300);
  }
  throw new Error("CDP endpoint not ready");
}

async function main() {
  const wsUrl = await getTargetWs();
  const loadFired = { value: false };
  await new Promise((resolve, reject) => {
    ws = new WebSocket(wsUrl);
    ws.onopen = resolve;
    ws.onerror = reject;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method === "Page.loadEventFired") {
        loadFired.value = true;
      }
    };
  });

  await send("Page.enable");
  await send("Runtime.enable");

  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("JS error: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };

  // 1. 打开应用并建立会话
  await send("Page.navigate", { url: APP_URL });
  await sleep(2500);
  await evalJs(`fetch('/api/auth/enter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'UI验证' }) }).then(r => r.json())`);
  await send("Page.navigate", { url: APP_URL });
  await sleep(2500);

  // 2. 进入"其他功能"页
  const clicked = await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button, a')].find(b => (b.textContent || '').includes('其他功能'));
    if (btn) { btn.click(); return true; }
    return false;
  })()`);
  console.log("nav clicked:", clicked);
  await sleep(800);

  const shot = async (name) => {
    const r = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT_DIR, name), Buffer.from(r.data, "base64"));
    console.log("saved:", name);
  };

  await shot("features-normal.png");

  // 3. 悬停"放入桌面"卡片
  const rect = await evalJs(`(() => {
    const card = [...document.querySelectorAll('.features button')].find(b => (b.textContent || '').includes('放入桌面'));
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  console.log("card rect:", JSON.stringify(rect));
  if (rect) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
    await sleep(600);
    await shot("features-hover.png");
  }

  // 4. 检查箭头定位是否符合预期（右上角）
  const arrowInfo = await evalJs(`(() => {
    return [...document.querySelectorAll('.features button')].map(b => {
      const svgs = b.querySelectorAll(':scope > svg');
      const arrow = svgs[svgs.length - 1];
      const br = b.getBoundingClientRect();
      const ar = arrow.getBoundingClientRect();
      return {
        name: (b.querySelector('h3') || {}).textContent,
        arrowTop: Math.round(ar.top - br.top),
        arrowRight: Math.round(br.right - ar.right),
      };
    });
  })()`);
  console.log("arrow positions:", JSON.stringify(arrowInfo));

  // 5. 检查 hover 样式是否含绿色光圈
  const hoverStyle = await evalJs(`(() => {
    const card = [...document.querySelectorAll('.features button')].find(b => (b.textContent || '').includes('放入桌面'));
    const cs = getComputedStyle(card);
    return { borderColor: cs.borderColor, boxShadow: cs.boxShadow.slice(0, 200) };
  })()`);
  console.log("hover style:", JSON.stringify(hoverStyle));
}

main()
  .catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} edge.kill(); });
