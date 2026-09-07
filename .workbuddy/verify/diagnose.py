"""
端到端诊断:Tauri 桌面挂件是否存在
- 枚举 Windows 上所有顶级窗口,找标题含"东非大裂谷"或"任务组件"的
- 截图右下角 800x800
- 截图整屏(如果分辨率大就缩放)
- 全程用 PIL + win32api,不需要 Add-Type/PowerShell
"""
import os
import sys
import json
from datetime import datetime
from PIL import ImageGrab
import ctypes
from ctypes import wintypes

OUT_DIR = r"D:\桌面\项目\note\.workbuddy\verify"
os.makedirs(OUT_DIR, exist_ok=True)

# --- Win32 EnumWindows 枚举所有顶级窗口 ---
EnumWindows = ctypes.windll.user32.EnumWindows
GetWindowTextW = ctypes.windll.user32.GetWindowTextW
GetWindowTextLengthW = ctypes.windll.user32.GetWindowTextLengthW
IsWindowVisible = ctypes.windll.user32.IsWindowVisible
GetWindowRect = ctypes.windll.user32.GetWindowRect
GetWindowThreadProcessId = ctypes.windll.user32.GetWindowThreadProcessId
GetClassNameW = ctypes.windll.user32.GetClassNameW

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

results = []

def foreach_window(hwnd, lParam):
    length = GetWindowTextLengthW(hwnd)
    if length == 0:
        return True
    buff = ctypes.create_unicode_buffer(length + 1)
    GetWindowTextW(hwnd, buff, length + 1)
    title = buff.value
    if not title.strip():
        return True
    # 过滤出"东非大裂谷" / "任务组件" / Tauri 相关
    if not any(k in title for k in ["东非大裂谷", "任务组件", "MemoAgent", "memo-agent", "Tauri"]):
        return True
    pid = wintypes.DWORD()
    GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    rect = RECT()
    GetWindowRect(hwnd, ctypes.byref(rect))
    visible = bool(IsWindowVisible(hwnd))
    w = rect.right - rect.left
    h = rect.bottom - rect.top
    if w <= 0 or h <= 0:
        return True
    cls = ctypes.create_unicode_buffer(256)
    GetClassNameW(hwnd, cls, 256)
    results.append({
        "hwnd": int(hwnd),
        "pid": pid.value,
        "title": title,
        "class": cls.value,
        "x": rect.left, "y": rect.top, "w": w, "h": h,
        "visible": visible,
    })
    return True

cb = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(foreach_window)
EnumWindows(cb, 0)

# 全部进程里找标题含"东非大裂谷"的,确认 Tauri 是不是活着
import subprocess
ps_out = subprocess.run(
    ["tasklist", "/FI", "IMAGENAME eq note.exe", "/FO", "CSV", "/NH"],
    capture_output=True, text=True, encoding="gbk", errors="ignore"
)
tauri_procs = subprocess.run(
    ["powershell", "-Command", "Get-Process | Where-Object { $_.MainWindowTitle -like '*东非大裂谷*' -or $_.ProcessName -like '*note*' } | Select-Object Id,ProcessName,MainWindowTitle | ConvertTo-Json -Compress"],
    capture_output=True, text=True, encoding="utf-8"
)

report = {
    "timestamp": datetime.now().isoformat(),
    "windows": sorted(results, key=lambda r: -(r["w"] * r["h"])),
    "tauri_powershell_query": (tauri_procs.stdout or "").strip(),
    "tauri_note_tasklist": (ps_out.stdout or "").strip(),
    "verdict": "",
}

# 截图整屏(为效率只截右下角 1200x800 区域)
screen = ImageGrab.grab()
sw, sh = screen.size
print(f"[i] Screen: {sw}x{sh}")
crop_x = max(0, sw - 1200)
crop_y = max(0, sh - 800)
crop = screen.crop((crop_x, crop_y, sw, sh))
crop_path = os.path.join(OUT_DIR, f"desktop-bottomright-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png")
crop.save(crop_path)
report["screenshot_bottomright"] = crop_path

# 整屏缩小截图
thumb = screen.resize((min(1280, sw), int(sh * min(1280, sw) / sw)))
full_path = os.path.join(OUT_DIR, f"desktop-full-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png")
thumb.save(full_path)
report["screenshot_full"] = full_path

# 判断
widget = [w for w in results if "任务组件" in w["title"]]
if not widget:
    main_only = [w for w in results if "东非大裂谷" in w["title"]]
    if not main_only:
        report["verdict"] = "[!] 没找到 Tauri 主窗口,也没找到组件窗口。Tauri 没在跑 — 请在 PowerShell 执行 npm run tauri dev。"
    else:
        report["verdict"] = "[!] 找到主窗口但没找到组件窗口。Rust 的 open_desktop_widget 命令没被调用,或被调用了但失败。"
else:
    report["verdict"] = f"[OK] 找到组件窗口。位置=({widget[0]['x']},{widget[0]['y']}) 尺寸={widget[0]['w']}x{widget[0]['h']} 可见={widget[0]['visible']}"

report_path = os.path.join(OUT_DIR, "diagnostic.json")
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print(json.dumps(report, ensure_ascii=False, indent=2))
print(f"\nReport: {report_path}")