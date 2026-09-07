# ============================================================
# Tauri 桌面挂件 一键诊断脚本
# 用法:在 PowerShell 里跑 .\scripts\verify-desktop-widget.ps1
# 作用:
#   1) 列出所有 Tauri WebView2 子窗口(label / 标题 / 位置 / 是否可见)
#   2) 把屏幕右下角区域截图保存到 .workbuddy\verify\ 给你看
# ============================================================

Add-Type @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class W {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

# Microsoft.Web.WebView2 / Tauri 用 WebView2 子窗口承载 UI,label 写到 window class 里。
# 我们枚举所有属于"东非大裂谷"进程的窗口,找出"任务组件"那个原生窗口。
$product = "东非大裂谷"
$proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $product -or $_.ProcessName -match "EastAfricanRift" -or $_.ProcessName -match "memo-agent" -or $_.ProcessName -match "note" } | Select-Object -First 1

if (-not $proc) {
  Write-Host "[!] 没找到 Tauri 主进程。先在另一个 PowerShell 跑: npm run tauri dev" -ForegroundColor Yellow
  exit 1
}

Write-Host "[i] Tauri 主进程: PID=$($proc.Id) Name=$($proc.ProcessName) Title=$($proc.MainWindowTitle)" -ForegroundColor Cyan

$results = New-Object System.Collections.Generic.List[object]

$cb = [W+EnumWindowsProc]{
  param($hWnd, $lParam)
  $pid = 0
  [void][W]::GetWindowThreadProcessId($hWnd, [ref]$pid)
  if ($pid -ne $proc.Id) { return $true }
  $sb = New-Object System.Text.StringBuilder 256
  [void][W]::GetWindowTextW($hWnd, $sb, 256)
  $title = $sb.ToString()
  $rect = New-Object W+RECT
  [void][W]::GetWindowRect($hWnd, [ref]$rect)
  $visible = [W]::IsWindowVisible($hWnd)
  $iconic = [W]::IsIconic($hWnd)
  $w = $rect.R - $rect.L; $h = $rect.B - $rect.T
  if ($w -le 0 -or $h -le 0) { return $true }
  $results.Add([pscustomobject]@{ HWnd = $hWnd; Title = $title; Visible = $visible; Minimized = $iconic; X = $rect.L; Y = $rect.T; W = $w; H = $h }) | Out-Null
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)

Write-Host ""
Write-Host "[i] 属于该 PID 的所有顶层窗口(按面积排序):" -ForegroundColor Cyan
$results | Sort-Object -Property @{Expression={ $_.W * $_.H }} -Descending | Format-Table -AutoSize HWnd, Title, Visible, Minimized, X, Y, W, H | Out-Host

$widgetWin = $results | Where-Object { $_.Title -match "任务组件" -or $_.Title -match "桌面" } | Select-Object -First 1
if (-not $widgetWin) {
  Write-Host ""
  Write-Host "[!] 没找到『任务组件』窗口。" -ForegroundColor Yellow
  Write-Host "    这意味着 open_desktop_widget 命令尚未被调用或 Rust 代码路径出 bug。" -ForegroundColor Yellow
  Write-Host "    接下来请:在主应用里点『其他功能 → 放入桌面』卡片 → 然后再跑一次本脚本。" -ForegroundColor Yellow
} else {
  Write-Host ""
  Write-Host "[OK] 找到桌面组件窗口:" -ForegroundColor Green
  Write-Host "     Title=$($widgetWin.Title) Visible=$($widgetWin.Visible) X=$($widgetWin.X) Y=$($widgetWin.Y) W=$($widgetWin.W) H=$($widgetWin.H)" -ForegroundColor Green
}

# 截图右下角 600x600 区域(为了截图 Tauri 桌面挂件是否真出现)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$outDir = Join-Path $PSScriptRoot "verify"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
$cropX = [Math]::Max($vs.X, $vs.Right - 600)
$cropY = [Math]::Max($vs.Y, $vs.Bottom - 600)
$bmp = New-Object System.Drawing.Bitmap 600, 600
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($cropX, $cropY, 0, 0, $bmp.Size)
$shotPath = Join-Path $outDir ("desktop-bottomright-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")
$bmp.Save($shotPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

Write-Host ""
Write-Host "[i] 已截图屏幕右下角 600x600 → $shotPath" -ForegroundColor Cyan
Write-Host "    把这张图发给我,我就能判断组件窗口是否真的可见。" -ForegroundColor Cyan