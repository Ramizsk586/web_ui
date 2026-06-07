use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{MenuBuilder, MenuEvent},
    Emitter, Manager, PhysicalPosition, WebviewWindow,
};

// ── Embedded loading HTML ──────────────────────────────────────────────
const LOADING_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Lumina</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#09090b;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none}
.logo{width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(59,130,246,0.25);margin-bottom:24px}
.spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,0.06);border-top-color:#3b82f6;border-radius:50%;animation:spin .7s linear infinite;margin-bottom:24px}
@keyframes spin{to{transform:rotate(360deg)}}
.title{color:#fafafa;font-size:20px;font-weight:600;margin-bottom:4px;letter-spacing:.2px}
#status{color:#52525b;font-size:12px;min-height:18px;transition:color .2s}
</style></head><body>
<div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="28" height="28"><path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/><path d="M12 8v4l3 3" stroke-width="1.8"/></svg></div>
<div class="spinner"></div>
<div class="title">Lumina</div>
<div id="status">Starting server...</div>
</body></html>"#;

fn resolve_loading_template_path() -> Option<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let candidates = [
        manifest_dir.join("..").join("loading.html"),
        PathBuf::from("loading.html"),
        exe_dir.join("loading.html"),
        exe_dir.join("_up_").join("loading.html"),
    ];

    candidates.into_iter().find(|path| Path::new(path).exists())
}

// ── Managed state ──────────────────────────────────────────────────────
struct ServerProcess(Mutex<Option<Child>>);
struct WindowZoom(Mutex<f64>);

const CONTEXT_MENU_INSPECT_ID: &str = "context_inspect";

fn stop_server_process(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ServerProcess>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(child) = guard.take() {
                #[cfg(target_os = "windows")]
                {
                    let _ = Command::new("taskkill")
                        .args(["/pid", &child.id().to_string(), "/f", "/t"])
                        .spawn();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = child.kill();
                }
            }
        }
    }
}

// ── Zoom helpers ───────────────────────────────────────────────────────
fn clamp_zoom(factor: f64) -> f64 {
    factor.clamp(0.3, 3.0)
}

fn current_zoom(app: &tauri::AppHandle) -> f64 {
    app.try_state::<WindowZoom>()
        .map(|z| *z.0.lock().unwrap())
        .unwrap_or(1.0)
}

fn set_window_zoom(window: &tauri::WebviewWindow, factor: f64) {
    let clamped = clamp_zoom(factor);
    if let Some(state) = window.app_handle().try_state::<WindowZoom>() {
        *state.0.lock().unwrap() = clamped;
    }
    let _ = window.set_zoom(clamped);
}

// ── Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn minimize_window(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.minimize();
    }
}

#[tauri::command]
fn maximize_window(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_maximized().unwrap_or(false) {
            let _ = w.unmaximize();
        } else {
            let _ = w.maximize();
        }
    }
}

#[tauri::command]
fn close_window(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.close();
    }
}

#[tauri::command]
fn is_window_maximized(app: tauri::AppHandle) -> bool {
    app.get_webview_window("main")
        .and_then(|w| w.is_maximized().ok())
        .unwrap_or(false)
}

#[tauri::command]
fn zoom_in(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let current = current_zoom(&app);
        set_window_zoom(&w, current + 0.1);
    }
}

#[tauri::command]
fn zoom_out(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let current = current_zoom(&app);
        set_window_zoom(&w, current - 0.1);
    }
}

#[tauri::command]
fn zoom_reset(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        set_window_zoom(&w, 1.0);
    }
}

#[tauri::command]
fn reload(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.reload();
    }
}

#[tauri::command]
fn get_stored_state(app: tauri::AppHandle) -> serde_json::Value {
    let state_path = app_state_path(&app);
    if state_path.exists() {
        std::fs::read_to_string(&state_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    }
}

#[tauri::command]
fn set_stored_state(app: tauri::AppHandle, state: serde_json::Value) -> bool {
    let state_path = app_state_path(&app);
    if let Some(parent) = state_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&state_path, serde_json::to_string_pretty(&state).unwrap_or_default()).is_ok()
}

#[tauri::command]
async fn open_folder_dialog(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });
    rx.await.ok().flatten()
}

#[tauri::command]
async fn show_alert(app: tauri::AppHandle, message: String) {
    use tauri_plugin_dialog::DialogExt;
    let _ = app.dialog().message(&message).blocking_show();
}

#[tauri::command]
async fn show_prompt(
    _app: tauri::AppHandle,
    _message: String,
    default_value: String,
) -> Option<String> {
    // Tauri dialog doesn't have a built-in text prompt.
    // Frontend bridge provides a React-based prompt modal as fallback.
    Some(default_value)
}

#[tauri::command]
fn show_context_menu(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    let menu = build_context_menu(&window).map_err(|err| err.to_string())?;
    window
        .popup_menu_at(&menu, PhysicalPosition::new(x, y))
        .map_err(|err| err.to_string())
}

// ── State file path ────────────────────────────────────────────────────
fn app_state_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    dir.join("lumina-state.json")
}

fn normalize_terminal_cwd(cwd: Option<String>) -> PathBuf {
    // If a valid absolute path was provided, use it directly.
    if let Some(ref c) = cwd {
        let p = PathBuf::from(c);
        if p.is_absolute() && p.is_dir() {
            return p.canonicalize().unwrap_or(p);
        }
    }

    // Default to the project root: the directory containing src-tauri/.
    // In production this resolves next to the executable; in dev it's the workspace root.
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let project_root = manifest_dir.parent().unwrap_or(&manifest_dir);

    project_root.to_path_buf()
}

#[cfg(target_os = "windows")]
fn displayable_windows_path(cwd: &Path) -> String {
    let raw = cwd.display().to_string();
    if let Some(stripped) = raw.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", stripped)
    } else if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        stripped.to_string()
    } else {
        raw
    }
}

#[cfg(target_os = "windows")]
fn try_spawn_windows_terminal(cwd: &Path) -> Result<(), String> {
    // Use `cmd /c start` to launch Windows Terminal as a fully detached process.
    // This avoids inheriting the parent's console (e.g. VS Code integrated terminal).
    let cwd_str = displayable_windows_path(cwd);
    Command::new("cmd")
        .args(["/c", "start", "wt", "-d", &cwd_str])
        .spawn()
        .map_err(|err| err.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn try_spawn_powershell_terminal(cwd: &Path) -> Result<(), String> {
    // Fallback: launch a standalone PowerShell window via `cmd /c start`.
    let cwd_str = displayable_windows_path(cwd).replace('\'', "''");
    Command::new("cmd")
        .args(["/c", "start", "powershell.exe", "-NoExit", "-Command", &format!("cd '{}'", cwd_str)])
        .spawn()
        .map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_native_terminal(cwd: Option<String>) -> Result<(), String> {
    let cwd = normalize_terminal_cwd(cwd);

    #[cfg(target_os = "windows")]
    {
        if try_spawn_windows_terminal(&cwd).is_ok() {
            return Ok(());
        }

        return try_spawn_powershell_terminal(&cwd);
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(cwd)
            .spawn()
            .map_err(|err| err.to_string())?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let launchers = [
            ("x-terminal-emulator", vec!["--working-directory"]),
            ("gnome-terminal", vec!["--working-directory"]),
            ("konsole", vec!["--workdir"]),
        ];

        for (program, args) in launchers {
            let mut command = Command::new(program);
            command.args(args).arg(&cwd);
            if command.spawn().is_ok() {
                return Ok(());
            }
        }

        return Err("No supported native terminal launcher was found.".into());
    }
}

// ── Server management ──────────────────────────────────────────────────

fn start_server_process_with_error(app: &tauri::AppHandle) -> Result<Child, String> {
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("dist").join("server.mjs"));
        candidates.push(resource_dir.join("server.mjs"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("dist").join("server.mjs"));
            candidates.push(exe_dir.join("server.mjs"));
            candidates.push(exe_dir.join("_up_").join("dist").join("server.mjs"));
            candidates.push(exe_dir.join("_up_").join("server.mjs"));
        }
    }

    candidates.push(PathBuf::from("dist").join("server.mjs"));
    candidates.push(PathBuf::from("server.mjs"));

    let server_path = candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Bundled server file was not found in the installed app.".to_string())?;

    Command::new("node")
        .arg(&server_path)
        .env("PORT", "3000")
        .env("NODE_ENV", "production")
        .spawn()
        .map_err(|err| err.to_string())
}

fn wait_for_server(timeout_secs: u64) -> bool {
    let start = std::time::Instant::now();
    let url = "http://localhost:3000/api/health";

    while start.elapsed() < Duration::from_secs(timeout_secs) {
        if let Ok(resp) = reqwest::blocking::get(url) {
            if resp.status().is_success() {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

fn write_loading_page() -> Option<PathBuf> {
    let temp_dir = std::env::temp_dir().join("lumina-tauri");
    std::fs::create_dir_all(&temp_dir).ok()?;
    let path = temp_dir.join("loading.html");
    let loading_html = resolve_loading_template_path()
        .and_then(|source| std::fs::read_to_string(source).ok())
        .unwrap_or_else(|| LOADING_HTML.to_string());
    std::fs::write(&path, loading_html).ok()?;
    Some(path)
}

fn navigate_to_loading(window: &tauri::WebviewWindow) {
    if let Some(loading_path) = write_loading_page() {
        let url = format!(
            "file:///{}",
            loading_path.display().to_string().replace('\\', "/")
        );
        let _ = window.navigate(url.parse().unwrap());
    }
}

fn update_loading_status(window: &tauri::WebviewWindow, status: &str, is_error: bool) {
    let escaped = status
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace('\n', "\\n")
        .replace('\r', "");
    let color = if is_error { "#f87171" } else { "#52525b" };
    let script = format!(
        "(() => {{ const el = document.getElementById('status'); if (el) {{ el.textContent = '{}'; el.style.color = '{}'; }} }})()",
        escaped, color
    );
    let _ = window.eval(&script);
}

fn context_menu_script() -> &'static str {
    r#"
(() => {
  if (window.__luminaNativeContextMenuBound) return;
  window.__luminaNativeContextMenuBound = true;
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const invoke = window.__TAURI__?.core?.invoke;
    if (typeof invoke === 'function') {
      invoke('show_context_menu', {
        x: Math.round(event.clientX || 0),
        y: Math.round(event.clientY || 0)
      }).catch(() => {});
    }
  }, true);
})();
"#
}

fn install_context_menu_bridge(window: &WebviewWindow) {
    let _ = window.eval(context_menu_script());
}

fn build_context_menu(window: &WebviewWindow) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    MenuBuilder::new(window)
        .copy_with_text("Copy")
        .paste_with_text("Paste")
        .cut_with_text("Cut")
        .separator()
        .text(CONTEXT_MENU_INSPECT_ID, "Inspect")
        .build()
}

fn handle_context_menu_event(window: &WebviewWindow, event: &MenuEvent) {
    let event_id = event.id().0.as_str();
    match event_id {
        "copy" => {
            let _ = window.eval("document.execCommand('copy');");
        }
        "paste" => {
            let _ = window.eval("document.execCommand('paste');");
        }
        "cut" => {
            let _ = window.eval("document.execCommand('cut');");
        }
        CONTEXT_MENU_INSPECT_ID => {
            #[cfg(debug_assertions)]
            window.open_devtools();
        }
        _ => {}
    }
}

// ── Entry point ────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.manage(WindowZoom(Mutex::new(0.7)));

            if let Some(window) = app.get_webview_window("main") {
                navigate_to_loading(&window);
                set_window_zoom(&window, 0.7);
                install_context_menu_bridge(&window);
                window.on_menu_event(|window, event| {
                    if let Some(webview_window) = window.app_handle().get_webview_window(window.label()) {
                        handle_context_menu_event(&webview_window, &event);
                    }
                });
            }

            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                if cfg!(not(debug_assertions)) {
                    if let Some(window) = handle.get_webview_window("main") {
                        update_loading_status(&window, "Starting bundled server...", false);
                    }

                    match start_server_process_with_error(&handle) {
                        Ok(child) => {
                            handle.manage(ServerProcess(Mutex::new(Some(child))));
                        }
                        Err(err) => {
                            if let Some(window) = handle.get_webview_window("main") {
                                update_loading_status(
                                    &window,
                                    &format!("Server failed to start: {}", err),
                                    true,
                                );
                            }
                            return;
                        }
                    }
                }

                if let Some(window) = handle.get_webview_window("main") {
                    update_loading_status(&window, "Waiting for server on http://localhost:3000...", false);
                }

                let ready = tokio::task::spawn_blocking(|| wait_for_server(60)).await;

                if let Ok(true) = ready {
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.navigate("http://localhost:3000".parse().unwrap());
                    }
                } else if let Some(window) = handle.get_webview_window("main") {
                    update_loading_status(
                        &window,
                        "Server did not respond on port 3000. Check whether Node.js is installed and restart the app.",
                        true,
                    );
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            let app = window.app_handle();
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    stop_server_process(&app);
                }
                tauri::WindowEvent::Resized(_) => {
                    if let Some(w) = app.get_webview_window("main") {
                        let maximized = w.is_maximized().unwrap_or(false);
                        let _ = w.emit("window:maximized", maximized);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            is_window_maximized,
            zoom_in,
            zoom_out,
            zoom_reset,
            reload,
            get_stored_state,
            set_stored_state,
            open_folder_dialog,
            show_alert,
            show_prompt,
            open_native_terminal,
            show_context_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
