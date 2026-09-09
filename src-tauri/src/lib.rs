use std::{
  collections::{HashSet, VecDeque},
  fs,
  path::{Path, PathBuf},
  sync::Mutex,
  time::{Duration, SystemTime},
};

use chrono::Local;
use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Size};

const WIDGET_LABEL: &str = "desktop-widget";
const MAIN_LABEL: &str = "main";
const REMINDER_LABEL: &str = "desktop-reminder";
const REMINDER_EVENT: &str = "todo-reminder";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReminderTodo {
  id: String,
  content: String,
  reminder_time: String,
}

impl ReminderTodo {
  fn new(id: impl Into<String>, content: impl Into<String>, reminder_time: impl Into<String>) -> Self {
    Self {
      id: id.into(),
      content: content.into(),
      reminder_time: reminder_time.into(),
    }
  }
}

struct NativeReminderState {
  inner: Mutex<NativeReminderQueue>,
}

struct NativeReminderQueue {
  day: String,
  triggered: HashSet<String>,
  todos: VecDeque<ReminderTodo>,
}

impl Default for NativeReminderState {
  fn default() -> Self {
    Self {
      inner: Mutex::new(NativeReminderQueue {
        day: String::new(),
        triggered: HashSet::new(),
        todos: VecDeque::new(),
      }),
    }
  }
}

struct LaunchMode {
  widget_only: bool,
  user_id: Option<String>,
  website_origin: String,
}

fn is_valid_reminder_time(value: &str) -> bool {
  let bytes = value.as_bytes();
  bytes.len() == 5
    && bytes[2] == b':'
    && bytes.iter().enumerate().all(|(index, byte)| index == 2 || byte.is_ascii_digit())
    && value[0..2].parse::<u8>().is_ok_and(|hour| hour < 24)
    && value[3..5].parse::<u8>().is_ok_and(|minute| minute < 60)
}

fn due_reminders(
  todos: &[serde_json::Value],
  current_hhmm: &str,
  triggered: &HashSet<String>,
) -> Vec<ReminderTodo> {
  if !is_valid_reminder_time(current_hhmm) {
    return Vec::new();
  }

  let mut seen = triggered.clone();
  todos.iter().filter_map(|todo| {
    if todo.get("completed").and_then(serde_json::Value::as_bool) == Some(true) {
      return None;
    }
    let id = todo.get("id")?.as_str()?;
    let content = todo.get("content")?.as_str()?;
    let reminder_time = todo.get("reminderTime")?.as_str()?;
    if id.is_empty() || !is_valid_reminder_time(reminder_time)
      || reminder_time != current_hhmm || !seen.insert(id.to_string()) {
      return None;
    }
    Some(ReminderTodo::new(id, content, reminder_time))
  }).collect()
}

fn emit_reminder(app: &AppHandle, todo: &ReminderTodo) {
  let Some(window) = app.get_webview_window(REMINDER_LABEL) else {
    return;
  };
  let _ = window.emit(REMINDER_EVENT, todo);
  let _ = window.show();
}

fn schedule_due_reminders(app: &AppHandle) {
  let mode = app.state::<LaunchMode>();
  let Ok(workspace_path) = current_workspace_path(mode.user_id.as_deref()) else {
    return;
  };
  let Ok(content) = fs::read_to_string(workspace_path) else {
    return;
  };
  let Ok(workspace) = serde_json::from_str::<serde_json::Value>(&content) else {
    return;
  };
  let Some(todos) = workspace.get("todayTodos").and_then(serde_json::Value::as_array) else {
    return;
  };

  let now = Local::now();
  let day = now.format("%F").to_string();
  let current_hhmm = now.format("%H:%M").to_string();
  let state = app.state::<NativeReminderState>();
  let Ok(mut queue) = state.inner.lock() else {
    return;
  };
  if queue.day != day {
    queue.day = day;
    queue.triggered.clear();
  }
  let queue_was_empty = queue.todos.is_empty();
  let due = due_reminders(todos, &current_hhmm, &queue.triggered);
  for todo in due {
    queue.triggered.insert(todo.id.clone());
    queue.todos.push_back(todo);
  }
  let next = queue_was_empty.then(|| queue.todos.front().cloned()).flatten();
  drop(queue);
  if let Some(todo) = next {
    emit_reminder(app, &todo);
  }
}

#[tauri::command]
fn acknowledge_todo_reminder(app: AppHandle) -> Result<Option<ReminderTodo>, String> {
  let state = app.state::<NativeReminderState>();
  let mut queue = state.inner.lock().map_err(|_| "提醒队列不可用".to_string())?;
  queue.todos.pop_front();
  let next = queue.todos.front().cloned();
  drop(queue);
  if let Some(todo) = &next {
    emit_reminder(&app, todo);
  } else if let Some(window) = app.get_webview_window(REMINDER_LABEL) {
    let _ = window.hide();
  }
  Ok(next)
}

fn is_widget_request<I, S>(args: I) -> bool
where
  I: IntoIterator<Item = S>,
  S: AsRef<str>,
{
  args.into_iter().any(|arg| {
    let value = arg.as_ref();
    value == "--widget"
      || value
        .trim_end_matches('/')
        .eq_ignore_ascii_case("memoagent://widget")
  })
}

fn widget_user_id<I, S>(args: I) -> Option<String>
where
  I: IntoIterator<Item = S>,
  S: AsRef<str>,
{
  args.into_iter().find_map(|arg| {
    let value = arg.as_ref().strip_prefix("--widget-user=")?;
    if !value.is_empty()
      && value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "-_".contains(character))
    {
      Some(value.to_string())
    } else {
      None
    }
  })
}

fn widget_website_origin<I, S>(args: I) -> Option<String>
where
  I: IntoIterator<Item = S>,
  S: AsRef<str>,
{
  args.into_iter().find_map(|arg| {
    let value = arg.as_ref().strip_prefix("--widget-origin=")?;
    let port = value
      .strip_prefix("http://127.0.0.1:")
      .or_else(|| value.strip_prefix("http://localhost:"))?;
    if !port.is_empty() && port.chars().all(|character| character.is_ascii_digit()) {
      Some(value.to_string())
    } else {
      None
    }
  })
}

fn latest_workspace_in(root: &Path) -> Result<PathBuf, String> {
  let entries = fs::read_dir(root).map_err(|e| format!("无法读取账户目录: {e}"))?;
  let mut candidates = Vec::new();
  for entry in entries.flatten() {
    let path = entry.path().join("workspace-data.json");
    if !path.is_file() {
      continue;
    }
    let modified = path
      .metadata()
      .and_then(|metadata| metadata.modified())
      .unwrap_or(SystemTime::UNIX_EPOCH);
    candidates.push((modified, path));
  }
  candidates
    .into_iter()
    .max_by_key(|(modified, _)| *modified)
    .map(|(_, path)| path)
    .ok_or_else(|| "没有找到可用的工作区数据".to_string())
}

fn current_workspace_path(user_id: Option<&str>) -> Result<PathBuf, String> {
  let project_root = Path::new(env!("CARGO_MANIFEST_DIR"))
    .parent()
    .ok_or_else(|| "无法定位项目目录".to_string())?;
  let users_root = project_root.join(".local").join("users");
  if let Some(user_id) = user_id {
    let path = users_root.join(user_id).join("workspace-data.json");
    if path.is_file() {
      return Ok(path);
    }
    return Err("当前账户的工作区数据不存在".to_string());
  }
  latest_workspace_in(&users_root)
}

fn complete_today_todo_value(
  workspace: &mut serde_json::Value,
  todo_id: &str,
) -> Result<(), String> {
  let todos = workspace
    .get_mut("todayTodos")
    .and_then(serde_json::Value::as_array_mut)
    .ok_or_else(|| "工作区缺少今日待办数据".to_string())?;
  let todo = todos
    .iter_mut()
    .find(|todo| todo.get("id").and_then(serde_json::Value::as_str) == Some(todo_id))
    .ok_or_else(|| "没有找到对应待办".to_string())?;
  todo["completed"] = serde_json::Value::Bool(true);
  Ok(())
}

fn add_today_todo_value(
  workspace: &mut serde_json::Value,
  id: &str,
  content: &str,
  reminder_time: &str,
) -> Result<(), String> {
  let clean_content = content.trim();
  if clean_content.is_empty() {
    return Err("待办内容不能为空".to_string());
  }
  let todos = workspace
    .get_mut("todayTodos")
    .and_then(serde_json::Value::as_array_mut)
    .ok_or_else(|| "工作区缺少今日待办数据".to_string())?;
  todos.push(serde_json::json!({
    "id": id,
    "content": clean_content,
    "reminderTime": reminder_time.trim(),
    "completed": false
  }));
  Ok(())
}

fn update_today_todo_value(
  workspace: &mut serde_json::Value,
  todo_id: &str,
  content: &str,
  reminder_time: &str,
) -> Result<(), String> {
  let clean_content = content.trim();
  if clean_content.is_empty() {
    return Err("待办内容不能为空".to_string());
  }
  let todos = workspace
    .get_mut("todayTodos")
    .and_then(serde_json::Value::as_array_mut)
    .ok_or_else(|| "工作区缺少今日待办数据".to_string())?;
  let todo = todos
    .iter_mut()
    .find(|todo| todo.get("id").and_then(serde_json::Value::as_str) == Some(todo_id))
    .ok_or_else(|| "没有找到对应待办".to_string())?;
  todo["content"] = serde_json::Value::String(clean_content.to_string());
  todo["reminderTime"] = serde_json::Value::String(reminder_time.trim().to_string());
  Ok(())
}

fn update_task_value(
  workspace: &mut serde_json::Value,
  task_id: &str,
  title: &str,
  description: &str,
  goal: &str,
) -> Result<(), String> {
  let clean_title = title.trim();
  if clean_title.is_empty() {
    return Err("任务标题不能为空".to_string());
  }
  let tasks = workspace
    .get_mut("tasks")
    .and_then(serde_json::Value::as_array_mut)
    .ok_or_else(|| "工作区缺少任务数据".to_string())?;
  let task = tasks
    .iter_mut()
    .find(|task| task.get("id").and_then(serde_json::Value::as_str) == Some(task_id))
    .ok_or_else(|| "没有找到对应任务".to_string())?;
  task["title"] = serde_json::Value::String(clean_title.to_string());
  task["description"] = serde_json::Value::String(description.trim().to_string());
  task["goal"] = serde_json::Value::String(goal.trim().to_string());
  Ok(())
}

fn write_workspace_value(
  workspace_path: &Path,
  workspace: &serde_json::Value,
) -> Result<(), String> {
  let temporary_path = workspace_path.with_extension("json.tmp");
  let serialized = serde_json::to_string_pretty(workspace)
    .map_err(|e| format!("无法序列化工作区数据: {e}"))?;
  fs::write(&temporary_path, serialized)
    .map_err(|e| format!("无法写入临时工作区: {e}"))?;
  let backup_path = PathBuf::from(format!("{}.backup", workspace_path.display()));
  let _ = fs::copy(workspace_path, backup_path);
  fs::remove_file(workspace_path)
    .map_err(|e| format!("无法替换工作区数据: {e}"))?;
  fs::rename(&temporary_path, workspace_path)
    .map_err(|e| format!("无法完成工作区写入: {e}"))
}

fn local_website_url(origin: &str, route: &str) -> Result<String, String> {
  if widget_website_origin([format!("--widget-origin={origin}")]).is_none() {
    return Err("不支持的网站地址".to_string());
  }
  let supported = if route == "/?widgetAction=add-today" {
    true
  } else if let Some(task_id) = route.strip_prefix("/?widgetTask=") {
    !task_id.is_empty()
      && task_id
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "-_.%".contains(character))
  } else {
    false
  };
  if !supported {
    return Err("不支持的网站跳转地址".to_string());
  }
  Ok(format!("{origin}{route}"))
}

fn browser_open_command(url: &str) -> (&'static str, Vec<String>) {
  (
    "rundll32.exe",
    vec!["url.dll,FileProtocolHandler".to_string(), url.to_string()],
  )
}

#[tauri::command]
fn load_desktop_widget_data(app: AppHandle) -> Result<serde_json::Value, String> {
  let mode = app.state::<LaunchMode>();
  let workspace_path = current_workspace_path(mode.user_id.as_deref())?;
  let content = fs::read_to_string(&workspace_path)
    .map_err(|e| format!("无法读取工作区数据: {e}"))?;
  serde_json::from_str(&content).map_err(|e| format!("工作区数据格式错误: {e}"))
}

#[tauri::command]
fn complete_desktop_widget_todo(app: AppHandle, todo_id: String) -> Result<serde_json::Value, String> {
  let mode = app.state::<LaunchMode>();
  let workspace_path = current_workspace_path(mode.user_id.as_deref())?;
  let content = fs::read_to_string(&workspace_path)
    .map_err(|e| format!("无法读取工作区数据: {e}"))?;
  let mut workspace: serde_json::Value = serde_json::from_str(&content)
    .map_err(|e| format!("工作区数据格式错误: {e}"))?;
  complete_today_todo_value(&mut workspace, &todo_id)?;
  write_workspace_value(&workspace_path, &workspace)?;
  Ok(workspace)
}

#[tauri::command]
fn add_desktop_widget_todo(
  app: AppHandle,
  id: String,
  content: String,
  reminder_time: String,
) -> Result<serde_json::Value, String> {
  let mode = app.state::<LaunchMode>();
  let workspace_path = current_workspace_path(mode.user_id.as_deref())?;
  let mut workspace: serde_json::Value = serde_json::from_str(
    &fs::read_to_string(&workspace_path).map_err(|e| format!("无法读取工作区数据: {e}"))?,
  ).map_err(|e| format!("工作区数据格式错误: {e}"))?;
  add_today_todo_value(&mut workspace, &id, &content, &reminder_time)?;
  write_workspace_value(&workspace_path, &workspace)?;
  Ok(workspace)
}

#[tauri::command]
fn update_desktop_widget_todo(
  app: AppHandle,
  todo_id: String,
  content: String,
  reminder_time: String,
) -> Result<serde_json::Value, String> {
  let mode = app.state::<LaunchMode>();
  let workspace_path = current_workspace_path(mode.user_id.as_deref())?;
  let mut workspace: serde_json::Value = serde_json::from_str(
    &fs::read_to_string(&workspace_path).map_err(|e| format!("无法读取工作区数据: {e}"))?,
  ).map_err(|e| format!("工作区数据格式错误: {e}"))?;
  update_today_todo_value(&mut workspace, &todo_id, &content, &reminder_time)?;
  write_workspace_value(&workspace_path, &workspace)?;
  Ok(workspace)
}

#[tauri::command]
fn update_desktop_widget_task(
  app: AppHandle,
  task_id: String,
  title: String,
  description: String,
  goal: String,
) -> Result<serde_json::Value, String> {
  let mode = app.state::<LaunchMode>();
  let workspace_path = current_workspace_path(mode.user_id.as_deref())?;
  let mut workspace: serde_json::Value = serde_json::from_str(
    &fs::read_to_string(&workspace_path).map_err(|e| format!("无法读取工作区数据: {e}"))?,
  ).map_err(|e| format!("工作区数据格式错误: {e}"))?;
  update_task_value(&mut workspace, &task_id, &title, &description, &goal)?;
  write_workspace_value(&workspace_path, &workspace)?;
  Ok(workspace)
}

#[tauri::command]
fn resize_desktop_widget(app: AppHandle, height: f64) -> Result<(), String> {
  let window = app
    .get_webview_window(WIDGET_LABEL)
    .ok_or_else(|| "桌面挂件窗口未初始化".to_string())?;
  let bounded_height = height.clamp(220.0, 720.0);
  let scale = window.scale_factor().map_err(|e| e.to_string())?;
  let current_size = window.inner_size().map_err(|e| e.to_string())?;
  let current_width = current_size.width as f64 / scale;
  window
    .set_size(Size::Logical(LogicalSize::new(current_width, bounded_height)))
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_desktop_widget_to(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
  let window = app
    .get_webview_window(WIDGET_LABEL)
    .ok_or_else(|| "桌面挂件窗口未初始化".to_string())?;
  window
    .set_size(Size::Logical(LogicalSize::new(
      width.clamp(260.0, 720.0),
      height.clamp(220.0, 720.0),
    )))
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_widget_dragging(app: AppHandle) -> Result<(), String> {
  let window = app
    .get_webview_window(WIDGET_LABEL)
    .ok_or_else(|| "桌面挂件窗口未初始化".to_string())?;
  window.set_focus().map_err(|e| e.to_string())?;
  window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn open_widget_website(app: AppHandle, route: String) -> Result<(), String> {
  let mode = app.state::<LaunchMode>();
  let url = local_website_url(&mode.website_origin, &route)?;
  let (program, args) = browser_open_command(&url);
  std::process::Command::new(program)
    .args(args)
    .spawn()
    .map_err(|e| format!("无法打开网站: {e}"))?;
  Ok(())
}

/// 创建一个 **Windows 11 桌面小组件** —— 无边框、透明、始终置顶（保证你看得见）、
/// 跳过任务栏、不抢焦点、不带阴影。组件窗口里另有"📌 贴桌面"按钮可以切到 `always_on_bottom`
/// 让它真的贴在桌面图标上方。
///
/// 返回 `"created"` 表示新建了一个组件窗口，返回 `"shown"` 表示窗口已存在并被带到前台。
#[tauri::command]
fn open_desktop_widget(app: AppHandle) -> Result<String, String> {
  let window = app
    .get_webview_window(WIDGET_LABEL)
    .ok_or_else(|| "桌面挂件窗口未初始化".to_string())?;

  // 默认贴到屏幕右下角，预留 16px 边距，避开任务栏。
  if let Ok(Some(monitor)) = app.primary_monitor() {
    let monitor_size = monitor.size();
    let scale = monitor.scale_factor();
    let widget_w = (320.0_f64 * scale).round() as i32;
    let widget_h = (480.0_f64 * scale).round() as i32;
    let margin = (16.0_f64 * scale).round() as i32;
    let pos_x = (monitor_size.width as i32).saturating_sub(widget_w).saturating_sub(margin);
    let pos_y = (monitor_size.height as i32).saturating_sub(widget_h).saturating_sub(margin);
    let _ = window.set_position(PhysicalPosition::new(pos_x, pos_y));
  }

  window.show().map_err(|e| e.to_string())?;
  window.unminimize().ok();
  let _ = window.set_focusable(true);
  let _ = window.set_shadow(false);

  Ok("shown".to_string())
}

/// 切换桌面组件的"贴桌面" vs "始终顶部"模式（true = 贴在桌面图标上方，所有正常窗口之下）。
#[tauri::command]
fn set_widget_desktop_pinned(app: AppHandle, pinned: bool) -> Result<(), String> {
  let Some(window) = app.get_webview_window(WIDGET_LABEL) else {
    return Ok(());
  };
  if pinned {
    window.set_always_on_bottom(true).map_err(|e| e.to_string())?;
    let _ = window.set_always_on_top(false);
  } else {
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    let _ = window.set_always_on_bottom(false);
  }
  Ok(())
}

/// 隐藏并停用桌面组件窗口。
#[tauri::command]
fn hide_desktop_widget(app: AppHandle) -> Result<(), String> {
  if app.state::<LaunchMode>().widget_only {
    app.exit(0);
    return Ok(());
  }
  if let Some(window) = app.get_webview_window(WIDGET_LABEL) {
    window.hide().map_err(|e| e.to_string())?;
  }
  Ok(())
}

/// 将主窗口带到前台，供组件交互跳回主应用。
#[tauri::command]
fn focus_main_window(app: AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window(MAIN_LABEL) {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let widget_only = is_widget_request(std::env::args());
  let user_id = widget_user_id(std::env::args());
  let website_origin = widget_website_origin(std::env::args())
    .unwrap_or_else(|| "http://127.0.0.1:5173".to_string());
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, _| {
      if is_widget_request(args.iter().map(String::as_str)) {
        if let Some(widget) = app.get_webview_window(WIDGET_LABEL) {
          let _ = widget.show();
          let _ = widget.unminimize();
          let _ = widget.set_focus();
        }
      }
    }))
    .manage(LaunchMode { widget_only, user_id, website_origin })
    .manage(NativeReminderState::default())
    .setup(|app| {
      let widget_only = app.state::<LaunchMode>().widget_only;
      if widget_only {
        if let Some(main) = app.get_webview_window(MAIN_LABEL) {
          main.hide()?;
        }
        if let Some(widget) = app.get_webview_window(WIDGET_LABEL) {
          widget.show()?;
        }
      } else if let Some(widget) = app.get_webview_window(WIDGET_LABEL) {
        widget.hide()?;
      }
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let reminder_app = app.handle().clone();
      std::thread::spawn(move || loop {
        schedule_due_reminders(&reminder_app);
        std::thread::sleep(Duration::from_secs(30));
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_desktop_widget,
      hide_desktop_widget,
      focus_main_window,
      set_widget_desktop_pinned,
      load_desktop_widget_data,
      resize_desktop_widget,
      resize_desktop_widget_to,
      complete_desktop_widget_todo,
      open_widget_website,
      add_desktop_widget_todo,
      update_desktop_widget_todo,
      update_desktop_widget_task,
      start_widget_dragging,
      acknowledge_todo_reminder
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::{
    complete_today_todo_value,
    is_widget_request,
    latest_workspace_in,
    local_website_url,
    widget_website_origin,
    browser_open_command,
    add_today_todo_value,
    update_task_value,
    update_today_todo_value,
    widget_user_id,
    due_reminders,
    ReminderTodo,
  };
  use std::{collections::HashSet, fs, time::Duration};

  #[test]
  fn finds_uncompleted_todos_due_now_once_in_workspace_order() {
    let todos = serde_json::json!([
      { "id": "first", "content": "第一项", "reminderTime": "09:30", "completed": false },
      { "id": "done", "content": "完成项", "reminderTime": "09:30", "completed": true },
      { "id": "invalid", "content": "无效时间", "reminderTime": "9:30", "completed": false },
      { "id": "past", "content": "过去时间", "reminderTime": "09:29", "completed": false },
      { "id": "again", "content": "已触发", "reminderTime": "09:30", "completed": false },
      { "id": "second", "content": "第二项", "reminderTime": "09:30", "completed": false }
    ]);
    let triggered = HashSet::from(["again".to_string()]);

    assert_eq!(
      due_reminders(todos.as_array().unwrap(), "09:30", &triggered),
      vec![
        ReminderTodo::new("first", "第一项", "09:30"),
        ReminderTodo::new("second", "第二项", "09:30"),
      ],
    );
  }

  #[test]
  fn accepts_only_the_first_due_todo_for_a_duplicate_id() {
    let todos = serde_json::json!([
      { "id": "duplicate", "content": "第一项", "reminderTime": "09:30", "completed": false },
      { "id": "duplicate", "content": "第二项", "reminderTime": "09:30", "completed": false }
    ]);

    assert_eq!(
      due_reminders(todos.as_array().unwrap(), "09:30", &HashSet::new()),
      vec![ReminderTodo::new("duplicate", "第一项", "09:30")],
    );
  }

  #[test]
  fn detects_widget_protocol_and_flag() {
    assert!(is_widget_request(["app.exe", "memoagent://widget"]));
    assert!(is_widget_request(["app.exe", "memoagent://widget/"]));
    assert!(is_widget_request(["app.exe", "--widget"]));
    assert!(!is_widget_request(["app.exe"]));
    assert_eq!(
      widget_user_id(["app.exe", "--widget-user=user-1"]),
      Some("user-1".to_string()),
    );
    assert_eq!(
      widget_website_origin(["app.exe", "--widget-origin=http://127.0.0.1:5174"]),
      Some("http://127.0.0.1:5174".to_string()),
    );
  }

  #[test]
  fn selects_the_latest_workspace_file() {
    let root = std::env::temp_dir().join(format!("memo-widget-{}", std::process::id()));
    let first = root.join("first").join("workspace-data.json");
    let second = root.join("second").join("workspace-data.json");
    fs::create_dir_all(first.parent().unwrap()).unwrap();
    fs::create_dir_all(second.parent().unwrap()).unwrap();
    fs::write(&first, "{}").unwrap();
    std::thread::sleep(Duration::from_millis(20));
    fs::write(&second, "{}").unwrap();

    assert_eq!(latest_workspace_in(&root).unwrap(), second);
    fs::remove_dir_all(root).unwrap();
  }

  #[test]
  fn completes_a_today_todo_and_rejects_unknown_ids() {
    let mut workspace = serde_json::json!({
      "todayTodos": [
        { "id": "todo-1", "content": "写周报", "completed": false }
      ]
    });
    complete_today_todo_value(&mut workspace, "todo-1").unwrap();
    assert_eq!(workspace["todayTodos"][0]["completed"], true);
    assert!(complete_today_todo_value(&mut workspace, "missing").is_err());
  }

  #[test]
  fn accepts_only_supported_local_website_routes() {
    assert_eq!(
      local_website_url("http://127.0.0.1:5174", "/?widgetAction=add-today").unwrap(),
      "http://127.0.0.1:5174/?widgetAction=add-today",
    );
    assert!(local_website_url("http://127.0.0.1:5174", "/?widgetTask=task-1").is_ok());
    assert!(local_website_url("https://example.com", "/?widgetTask=task-1").is_err());
    assert!(local_website_url("http://127.0.0.1:5174", "/?widgetTask=x&bad=1").is_err());
  }

  #[test]
  fn opens_web_urls_with_the_windows_url_handler() {
    let (program, args) = browser_open_command("http://127.0.0.1:5174/?widgetAction=add-today");
    assert_eq!(program, "rundll32.exe");
    assert_eq!(args[0], "url.dll,FileProtocolHandler");
    assert_eq!(args[1], "http://127.0.0.1:5174/?widgetAction=add-today");
  }

  #[test]
  fn adds_a_today_todo_to_the_workspace() {
    let mut workspace = serde_json::json!({ "todayTodos": [] });
    add_today_todo_value(&mut workspace, "new-1", "买牛奶", "18:30").unwrap();
    assert_eq!(workspace["todayTodos"][0]["id"], "new-1");
    assert_eq!(workspace["todayTodos"][0]["content"], "买牛奶");
    assert_eq!(workspace["todayTodos"][0]["completed"], false);
  }

  #[test]
  fn updates_task_fields_and_rejects_unknown_ids() {
    let mut workspace = serde_json::json!({
      "tasks": [{ "id": "task-1", "title": "旧标题", "description": "", "goal": "" }]
    });
    update_task_value(&mut workspace, "task-1", "新标题", "新说明", "新目标").unwrap();
    assert_eq!(workspace["tasks"][0]["title"], "新标题");
    assert!(update_task_value(&mut workspace, "missing", "x", "", "").is_err());
  }

  #[test]
  fn updates_a_today_todo_and_rejects_unknown_ids() {
    let mut workspace = serde_json::json!({
      "todayTodos": [{ "id": "todo-1", "content": "旧待办", "reminderTime": "", "completed": false }]
    });
    update_today_todo_value(&mut workspace, "todo-1", "新待办", "09:00").unwrap();
    assert_eq!(workspace["todayTodos"][0]["content"], "新待办");
    assert!(update_today_todo_value(&mut workspace, "missing", "x", "").is_err());
  }
}
