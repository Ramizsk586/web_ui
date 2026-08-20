use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuEvent},
    Emitter, Manager, PhysicalPosition, WebviewWindow,
};

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
fn normalized_windows_path_buf(path: &Path) -> PathBuf {
    PathBuf::from(displayable_windows_path(path))
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
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|err| format!("Failed to resolve app resource directory: {err}"))?;
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()));

    let mut server_candidates = vec![
        resource_dir.join("dist").join("server.cjs"),
        resource_dir.join("server.cjs"),
        resource_dir.join("dist").join("server.mjs"),
        resource_dir.join("server.mjs"),
        resource_dir.join("_up_").join("dist").join("server.cjs"),
        resource_dir.join("_up_").join("server.cjs"),
        resource_dir.join("_up_").join("dist").join("server.mjs"),
        resource_dir.join("_up_").join("server.mjs"),
    ];
    if let Some(ref exe_dir) = exe_dir {
        server_candidates.extend([
            exe_dir.join("dist").join("server.cjs"),
            exe_dir.join("server.cjs"),
            exe_dir.join("dist").join("server.mjs"),
            exe_dir.join("server.mjs"),
            exe_dir.join("_up_").join("dist").join("server.cjs"),
            exe_dir.join("_up_").join("server.cjs"),
            exe_dir.join("_up_").join("dist").join("server.mjs"),
            exe_dir.join("_up_").join("server.mjs"),
            exe_dir.join("resources").join("dist").join("server.cjs"),
            exe_dir.join("resources").join("dist").join("server.mjs"),
        ]);
    }
    let server_path = server_candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Bundled server file was not found in the installed app resources.".to_string())?;

    let mut node_candidates = vec![
        resource_dir.join("runtime").join("node.exe"),
        resource_dir.join("node.exe"),
        resource_dir.join("_up_").join("resources").join("runtime").join("node.exe"),
        resource_dir.join("_up_").join("runtime").join("node.exe"),
    ];
    if let Some(ref exe_dir) = exe_dir {
        node_candidates.extend([
            exe_dir.join("resources").join("runtime").join("node.exe"),
            exe_dir.join("runtime").join("node.exe"),
            exe_dir.join("_up_").join("resources").join("runtime").join("node.exe"),
            exe_dir.join("_up_").join("runtime").join("node.exe"),
        ]);
    }
    let node_path = node_candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Bundled Node runtime was not found in the installed app resources.".to_string())?;

    let server_workdir = server_path
        .parent()
        .and_then(|parent| parent.parent())
        .map(PathBuf::from)
        .unwrap_or_else(|| resource_dir.clone());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let node_path = normalized_windows_path_buf(&node_path);
        let server_path = normalized_windows_path_buf(&server_path);
        let server_workdir = normalized_windows_path_buf(&server_workdir);

        let log_dir = app
            .path()
            .app_log_dir()
            .or_else(|_| app.path().app_data_dir())
            .unwrap_or_else(|_| server_workdir.clone());
        let _ = std::fs::create_dir_all(&log_dir);
        let stdout_log = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_dir.join("lumina-server.stdout.log"))
            .map_err(|err| format!("Failed to open server stdout log: {err}"))?;
        let stderr_log = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_dir.join("lumina-server.stderr.log"))
            .map_err(|err| format!("Failed to open server stderr log: {err}"))?;

        return Command::new(node_path)
            .arg(&server_path)
            .env("PORT", "3000")
            .env("NODE_ENV", "production")
            .current_dir(&server_workdir)
            .stdin(Stdio::null())
            .stdout(Stdio::from(stdout_log))
            .stderr(Stdio::from(stderr_log))
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|err| err.to_string());
    }

    #[cfg(not(target_os = "windows"))]
    Command::new(node_path)
        .arg(&server_path)
        .env("PORT", "3000")
        .env("NODE_ENV", "production")
        .current_dir(server_workdir)
        .spawn()
        .map_err(|err| err.to_string())
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
                    if let Ok(child) = start_server_process_with_error(&handle) {
                        handle.manage(ServerProcess(Mutex::new(Some(child))));
                    }
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
