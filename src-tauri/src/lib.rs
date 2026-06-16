use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

/// Returns the app version baked in at compile time (from Cargo.toml).
/// The only Rust command Phase 2 needs; more arrive in Phase 3.
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Native macOS menu bar. For Phase 2 the structure is the
            // deliverable: standard items use PredefinedMenuItem so they work
            // out of the box; Phase-3 items (New Page / Export / Import /
            // Reload / DevTools) are scaffolded as inert MenuItems and get
            // wired to frontend events in Phase 3.

            // App menu — on macOS the first submenu is the bold app menu.
            let app_menu = Submenu::new(app, "Life-Dashboard", true)?;
            app_menu.append_items(&[
                &PredefinedMenuItem::about(app, Some("About Life-Dashboard"), None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some("Quit Life-Dashboard"))?,
            ])?;

            let file_menu = Submenu::new(app, "File", true)?;
            let new_page = MenuItem::with_id(app, "new_page", "New Page", false, None::<&str>)?;
            let export =
                MenuItem::with_id(app, "export", "Export Data…", true, Some("CmdOrCtrl+E"))?;
            let import =
                MenuItem::with_id(app, "import", "Import Data…", true, Some("CmdOrCtrl+I"))?;
            file_menu.append_items(&[
                &new_page,
                &PredefinedMenuItem::separator(app)?,
                &export,
                &import,
            ])?;

            let edit_menu = Submenu::new(app, "Edit", true)?;
            edit_menu.append_items(&[
                &PredefinedMenuItem::undo(app, None)?,
                &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &PredefinedMenuItem::select_all(app, None)?,
            ])?;

            let view_menu = Submenu::new(app, "View", true)?;
            let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
            let devtools = MenuItem::with_id(
                app,
                "devtools",
                "Toggle DevTools",
                true,
                Some("Alt+CmdOrCtrl+I"),
            )?;
            view_menu.append_items(&[
                &reload,
                &devtools,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::fullscreen(app, None)?,
            ])?;

            let window_menu = Submenu::new(app, "Window", true)?;
            window_menu.append_items(&[
                &PredefinedMenuItem::minimize(app, None)?,
                &PredefinedMenuItem::maximize(app, None)?,
            ])?;

            let help_menu = Submenu::new(app, "Help", true)?;
            let help_docs =
                MenuItem::with_id(app, "help_docs", "Life-Dashboard Help", false, None::<&str>)?;
            help_menu.append_items(&[&help_docs])?;

            let menu = Menu::with_items(
                app,
                &[
                    &app_menu,
                    &file_menu,
                    &edit_menu,
                    &view_menu,
                    &window_menu,
                    &help_menu,
                ],
            )?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_window_event(|_window, _event| {
            // Real-macOS red-button behavior: hide the window instead of
            // quitting the process. The dock icon stays; RunEvent::Reopen
            // (below) re-shows the window when the dock icon is clicked.
            // ⌘Q / menu → Quit still fully quits.
            //
            // macOS-only: Windows/Linux have no dock or Reopen event, so a
            // hidden-on-close window would be unrecoverable. There, the
            // default (close → window closes → app exits) is the right thing.
            #[cfg(target_os = "macos")]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                let _ = _window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![app_version])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            // macOS-only: clicking the dock icon after the window was hidden
            // on close re-shows and focuses it. RunEvent::Reopen and the
            // dock paradigm only exist on macOS.
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let tauri::RunEvent::Reopen { .. } = _event {
                    if let Some(window) = _app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
}
