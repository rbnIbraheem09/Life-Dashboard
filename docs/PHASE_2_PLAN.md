# Phase 2 — Tauri Shell + ARC Sidebar

> **Project root:** `~/Desktop/Life-Dashboard/`
> **Goal:** Wrap the existing Phase 1 web app in a Tauri 2.0 desktop shell, replace the top-nav page switcher with an ARC-style vertical sidebar, add a native macOS menu bar, and ship a runnable `.app` bundle. **Zero changes to the existing pullup page logic.**
> **Status of Phase 1:** 12 commits, 17 source files, working web app at `localhost:5173`. The pullup page (Hero + Sets + Stats + ActivityGrid + DayDrawer + HelpOverlay + TopNav export/import) is feature-complete. **Do not touch any of it except where this plan explicitly says to.**

---

## 1. Why Tauri (not Electron)

| | Tauri 2.0 | Electron |
|---|---|---|
| Bundle size | ~5-10MB | ~150MB+ |
| RAM at idle | ~30MB | ~150MB |
| Backend language | Rust (already installed on user's machine) | Node |
| Renderer | System WebView (WebKit on macOS) | Bundled Chromium |
| Permissions model | `tauri.conf.json` capabilities, fine-grained | `webPreferences` + IPC |
| localStorage | Works (WebView) | Works (Chromium profile) |

Tauri's WebView preserves the entire Phase 1 web app as-is. `localStorage`, IndexedDB, the Google Fonts, the React tree — all the same. The desktop wrap is a shell, not a rewrite.

---

## 2. Visual design concept

### Layout change: from top-nav to sidebar

```
BEFORE (Phase 1)                          AFTER (Phase 2)
┌──────────────────────────────────┐      ┌─────┬──────────────────────────────┐
│ ● ACTIVE  Life-Dashboard  [tabs] │      │  ●  │  Life-Dashboard       ↻ ⚙   │ ← thin topbar (32px)
├──────────────────────────────────┤      │ ACT │                              │
│                                  │      │ IV  │  ┌────────────────────────┐  │
│  Hero card                       │      │     │  │  Hero card             │  │
│  Today's Sets                    │      ├─────┤  │                        │  │
│  Stats    ActivityGrid           │      │ PULL│  │                        │  │
│                                  │      │ UPS │  ├────────────────────────┤  │
│                                  │      │ WATR│  │  Today's Sets          │  │
│                                  │      │ SLEP│  │                        │  │
│                                  │      │ ─── │  │                        │  │
│                                  │      │ +   │  │  Stats | Activity      │  │
│                                  │      │ AD  │  │                        │  │
│                                  │      │ PAG │  └────────────────────────┘  │
│                                  │      │     │                              │
│                                  │      │     │  [Export ↓]  [Import ↑]     │ ← bottom of sidebar
└──────────────────────────────────┘      └─────┴──────────────────────────────┘
                                          240px         flex-1
```

### Sidebar anatomy

```
┌────────────────────────┐
│ ●  ACTIVE              │  ← status dot + "ACTIVE" eyebrow (matches existing TopNav)
│                        │
│  Life-Dashboard        │  ← .iz-display text-base, the app name
│                        │
│  ── PAGES ──────────   │  ← .iz-label, divider line right
│                        │
│  ◉ Pullups         9d  │  ← active page: bg-white/[0.04], border-l-2 accent
│  ○ Water               │  ← inactive: dim text
│  ○ Sleep               │
│  ○ Reading             │
│  + Add page            │  ← teal/dim, "Add" affordance
│                        │
│  ─────────────────     │
│                        │
│  [Export ↓]            │  ← bottom: export/import (moved from top nav)
│  [Import ↑]            │
└────────────────────────┘
```

- **240px wide**, full height, `bg-[var(--surface)]` with a right border `var(--border)`
- **Active page:** `bg-white/[0.04]` surface, 2px `var(--accent-1)` left border, `text-[var(--text)]`
- **Inactive page:** `text-[var(--text-muted)]`, hover lifts to `text-[var(--text-dim)]` + `bg-white/[0.02]`
- **Page icon:** 16px, 1.5px stroke, line-icon style. Use Heroicons-style inline SVGs (no icon library dep — bundle ~6 SVG strings)
- **"Add page" affordance:** dimmed `+ Add page` row at the bottom of the list. v1 click behavior: opens a tiny inline menu ("New built-in page" / "Import page JSON"). For Phase 2, just leave it visible but non-functional (disabled state with "Coming in Phase 3" tooltip). Don't build the import UI yet — that's a Phase 3 feature with security implications.

### Top ribbon (replaces 64px header)

A 32px-tall **window drag region** that hosts:
- **Left:** nothing (the sidebar takes over the brand presence)
- **Right:** `↻` (refresh data — calls a `tauri::command` to reload `data.db`) and `⚙` (placeholder settings, disabled in v1, tooltip "Coming in Phase 3")
- Both icons are 14px, dim, hover lifts to accent

This is also where the **native macOS menu bar** lives (see section 5).

### Spacing/typography inheritance

Every existing CSS variable, font, spacing rule from Phase 1 carries over unchanged. The new components (Sidebar, Ribbon) use the same `var(--*)` tokens, same `iz-display` / `iz-label` / `iz-mono` classes, same `bg-white/[0.0X]` patterns. **No new design tokens.** This is a layout rearrangement, not a visual refresh.

---

## 3. Architecture

### Project structure (after Phase 2)

```
~/Desktop/Life-Dashboard/
├── docs/
│   └── PHASE_2_PLAN.md                     # this file
├── src-tauri/                              # NEW — Tauri 2.0 native shell
│   ├── Cargo.toml                          # Rust manifest
│   ├── tauri.conf.json                     # window config, identifier, bundle
│   ├── build.rs                            # Tauri build script
│   ├── icons/                              # app icons (use placeholders for v1)
│   └── src/
│       ├── main.rs                         # entry point
│       └── lib.rs                          # tauri::Builder, commands
├── src/                                    # UNTOUCHED (except where this plan says so)
│   ├── components/
│   │   ├── Sidebar.tsx                     # NEW — replaces page tabs in TopNav
│   │   ├── Ribbon.tsx                      # NEW — replaces full TopNav
│   │   ├── TopNav.tsx                      # DEPRECATED — delete in 2.5
│   │   ├── (everything else unchanged)
│   ├── pages/
│   │   └── PullupPage.tsx                  # UNTOUCHED
│   ├── App.tsx                             # UNTOUCHED (sidebar slots in via Sidebar)
│   └── ...                                 # rest unchanged
├── package.json                            # adds @tauri-apps/cli + api deps
├── vite.config.ts                          # adds Tauri-aware server config
└── IMPLEMENTATION_PLAN.md                  # Phase 1 plan, preserved
```

### Tauri config (`src-tauri/tauri.conf.json`)

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "productName": "Life-Dashboard",
  "version": "0.2.0",
  "identifier": "com.iznic.lifedashboard",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Life-Dashboard",
        "width": 1280,
        "height": 800,
        "minWidth": 960,
        "minHeight": 600,
        "decorations": true,
        "transparent": false,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg"],
    "category": "Productivity",
    "shortDescription": "Local-first personal challenge tracker",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns"
    ]
  }
}
```

`titleBarStyle: "Overlay"` + `hiddenTitle: true` gives us a frameless look with traffic lights floating over the ribbon — the modern macOS look. The 32px topbar is a `-webkit-app-region: drag` region so the user can drag the window by it.

### Rust commands (in `src-tauri/src/lib.rs`)

For v1, we need just **one** Rust command:

```rust
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
```

Plus the default `greet` and `close` from the Tauri template are not needed — remove them.

We'll add more commands in Phase 3 (data persistence to `~/Library/Application Support/`, theme file loading, etc.). For Phase 2, the shell is the goal.

### Page routing (frontend, unchanged)

The existing `react-router-dom` setup in `App.tsx` stays exactly as is. The Sidebar component reads the route list from a hardcoded constant for v1:

```tsx
// src/components/Sidebar.tsx (in-file constant)
const BUILT_IN_PAGES = [
  { id: 'pullups', path: '/pullups', label: 'Pullups', icon: <PullupsIcon /> },
  { id: 'water',   path: '/water',   label: 'Water',   icon: <WaterIcon /> },
  { id: 'sleep',   path: '/sleep',   label: 'Sleep',   icon: <SleepIcon /> },  // stub
  { id: 'reading', path: '/reading', label: 'Reading', icon: <ReadingIcon /> }, // stub
] as const
```

The "Add page" affordance appears below the list, dim, disabled in v1.

**Phase 2 does NOT introduce user-defined pages.** That's a Phase 3 feature (page JSON schema, signed imports, gallery). For now, the sidebar is hardcoded with 4 entries; 2 of them (Pullups, Water) have real pages, 2 (Sleep, Reading) are `ComingSoon` stubs.

### Why no SQLite / filesystem in Phase 2

We keep `localStorage` exactly as Phase 1 ships it. WebView's `localStorage` is per-app-data-folder, persists across app launches (Tauri's WebView is not the same as Chrome's profile — it lives at `~/Library/Application Support/com.iznic.lifedashboard/EBWebView/`). So the user's data persists between launches in the desktop app, same as in the web browser, with **zero code changes**.

Phase 3 introduces `tauri-plugin-fs` and SQLite for the export/import page JSON flow and the future sync feature.

---

## 4. Component specifications

### `src/components/Sidebar.tsx`

**Props:** none (reads routes from internal constant)

**Layout:**
```tsx
<aside className="w-[240px] shrink-0 h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
  {/* Brand block (48px) */}
  <div className="px-5 pt-5 pb-4 flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-[var(--accent-1)]" style={{boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)'}} />
    <span className="iz-label" style={{color: 'var(--accent-1)'}}>Active</span>
  </div>
  <div className="px-5 pb-5">
    <span className="iz-display text-lg text-[var(--text)]">Life-Dashboard</span>
  </div>

  {/* Pages section */}
  <div className="px-3 flex-1 overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-2 px-2 mb-2">
      <span className="iz-label">Pages</span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
    <nav className="flex flex-col gap-0.5">
      {BUILT_IN_PAGES.map((page) => (
        <NavLink key={page.id} to={page.path}
          className={({isActive}) => cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] relative",
            "border-l-2 transition-colors duration-[var(--motion-fast)]",
            isActive
              ? "bg-white/[0.04] border-l-[var(--accent-1)] text-[var(--text)]"
              : "border-l-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/[0.02]"
          )}>
          <span className="w-4 h-4 shrink-0">{page.icon}</span>
          <span>{page.label}</span>
        </NavLink>
      ))}
      <button disabled title="Coming in Phase 3"
        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[var(--text-muted)] opacity-50 cursor-default border-l-2 border-l-transparent">
        <span className="w-4 h-4 shrink-0"><PlusIcon /></span>
        <span>Add page</span>
      </button>
    </nav>
  </div>

  {/* Export/Import at bottom */}
  <div className="px-3 py-3 border-t border-[var(--border)] flex flex-col gap-1">
    <button onClick={handleExport}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors">
      <span className="iz-mono">↓</span> Export data
    </button>
    <button onClick={() => fileRef.current?.click()}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors">
      <span className="iz-mono">↑</span> Import data
    </button>
    <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
  </div>
</aside>
```

**The `handleExport` and `handleImportFile` functions are copy-pasted from the existing `TopNav.tsx`** — same logic, same `useDashboard.getState().exportJSON()` / `importJSON()` calls. Move the code, keep the behavior.

### `src/components/Ribbon.tsx`

The thin 32px topbar. Window-drag region with a couple of action icons on the right.

```tsx
<header
  className="h-8 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm flex items-center justify-end px-3 gap-1"
  style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
>
  {/* Action buttons (no-drag, so they're clickable) */}
  <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1">
    <button disabled title="Coming in Phase 3"
      className="w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.04] flex items-center justify-center text-[14px] transition-colors disabled:opacity-40 disabled:cursor-default">
      ↻
    </button>
    <button disabled title="Coming in Phase 3"
      className="w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.04] flex items-center justify-center text-[14px] transition-colors disabled:opacity-40 disabled:cursor-default">
      ⚙
    </button>
  </div>
</header>
```

**The `WebkitAppRegion` cast** — TypeScript doesn't know about Tauri-specific CSS properties. Cast through `as React.CSSProperties`. This is the standard pattern. (Alternative: add a global declaration in `src/globals.d.ts`, which is cleaner. Use that.)

### `src/globals.d.ts` (new file, ~10 lines)

```ts
import 'react'

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}
```

### Page icons (inline SVGs in Sidebar.tsx)

Six icons, all 16×16, 1.5px stroke, `currentColor` so they inherit text color. Heroicons-outline style. Inline as JSX, no library:

- `PullupsIcon` — figure climbing a bar
- `WaterIcon` — water drop
- `SleepIcon` — moon
- `ReadingIcon` — book
- `PlusIcon` — plus (for "Add page")

Keep them in the same file as the Sidebar constant. ~80 lines total. Trivial.

### `App.tsx` changes

Replace the `<TopNav />` import and usage with `<Ribbon />` + `<Sidebar />`. Layout becomes:

```tsx
<div className="h-full flex flex-col">
  <Ribbon />
  <div className="flex-1 flex overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">
      <Routes>...</Routes>
    </main>
  </div>
</div>
```

The `PullupPage` and all child components are untouched — they still live inside `<main>`. The page's `max-w-[1180px] mx-auto px-9 py-9` container will naturally reflow to be slightly narrower (sidebar is 240px) and that's fine.

### Tauri 2.0 detection (avoid double-sidebar in browser dev mode)

When you `npm run dev` and open the browser, you don't want the sidebar layout — the existing web build should still work as a single-page app. The cleanest solution: detect Tauri via `window.__TAURI_INTERNALS__` and conditionally render the chrome.

```tsx
// In App.tsx
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
```

If `isTauri`, render `<Ribbon />` + `<Sidebar />` + main. Otherwise, render just main (or keep the old TopNav). **For v1 of Phase 2, just always render the new layout.** The user runs the Tauri app via `npm run tauri dev`, not the browser. The web build is dev-only.

Actually — keep TopNav as a fallback for `npm run dev` browser preview. When `isTauri`, use the new sidebar layout. When not, fall back to the existing TopNav. This is one `if` branch in App.tsx. Don't delete TopNav until Phase 2.5.

### Native macOS menu bar (Tauri feature)

Tauri 2.0 lets you define a native menu via `tauri::menu::Menu`. In `src-tauri/src/lib.rs`:

```rust
use tauri::menu::{Menu, MenuItem, Submenu};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let file_menu = Submenu::new(app, "File", true)?;
            let new_page = MenuItem::with_id(app, "new_page", "New Page", true, None::<&str>)?;
            let export = MenuItem::with_id(app, "export", "Export Data…", true, Some("CmdOrCtrl+E"))?;
            let import = MenuItem::with_id(app, "import", "Import Data…", true, Some("CmdOrCtrl+I"))?;
            let quit = MenuItem::with_id(app, "quit", "Quit Life-Dashboard", true, Some("CmdOrCtrl+Q"))?;
            file_menu.append_items(&[&new_page, &export, &import, &quit])?;

            let edit_menu = Submenu::new(app, "Edit", true)?;
            let undo = MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
            let redo = MenuItem::with_id(app, "redo", "Redo", true, Some("Shift+CmdOrCtrl+Z"))?;
            edit_menu.append_items(&[&undo, &redo])?;

            let view_menu = Submenu::new(app, "View", true)?;
            let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
            let devtools = MenuItem::with_id(app, "devtools", "Toggle DevTools", true, Some("Alt+CmdOrCtrl+I"))?;
            view_menu.append_items(&[&reload, &devtools])?;

            let window_menu = Submenu::new(app, "Window", true)?;
            let minimize = MenuItem::with_id(app, "minimize", "Minimize", true, Some("CmdOrCtrl+M"))?;
            window_menu.append_items(&[&minimize])?;

            let menu = Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &window_menu])?;
            app.set_menu(menu)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

For v1, the menu items are scaffolded but not all wired to frontend events. `Quit` works by default. `Reload` and `DevTools` work by default (Tauri handles them). `Export/Import/New Page` emit a Tauri event that the frontend listens for — but wiring that up is Phase 3 work. For Phase 2, the menu just needs to **exist and look right** in the macOS menu bar.

**The `tauri::generate_context!()` macro reads `tauri.conf.json` at compile time** — so the window config, identifier, and bundle settings from section 3 are wired in automatically.

### Bundle

`npm run tauri build` produces `Life-Dashboard.app` and `Life-Dashboard.dmg` in `src-tauri/target/release/bundle/`. For icons, use the included Tauri default icons (a placeholder) — Phase 2 ships with no custom icon. v1.5 can add a proper icon.

---

## 5. Native macOS menu bar

The user sees this at the top of their screen, system-wide:

```
Life-Dashboard   File   Edit   View   Window   Help
```

- **Life-Dashboard** (app menu) — About, Settings… (disabled), Hide, Quit
- **File** — New Page (disabled, Phase 3), Export Data… (⌘E), Import Data… (⌘I), Quit (⌘Q)
- **Edit** — Undo (⌘Z), Redo (⇧⌘Z), Cut, Copy, Paste, Select All (system defaults)
- **View** — Reload (⌘R), Toggle DevTools (⌥⌘I), Enter Full Screen (^⌘F)
- **Window** — Minimize (⌘M), Zoom
- **Help** — link to docs (disabled in v1)

For Phase 2, the **structure** is the deliverable. Wiring menu items to frontend events (so "Export Data…" actually triggers the export) is Phase 3.

---

## 6. Hard constraints

1. **No changes to any Phase 1 component except `App.tsx`.** Specifically, the following files MUST NOT be modified: `HeroChallengeCard.tsx`, `TodaysSetsCard.tsx`, `StatsCard.tsx`, `ActivityGrid.tsx`, `DayDrawer.tsx`, `HelpOverlay.tsx`, `PullupPage.tsx`, all files in `src/lib/`, `src/store/`, `src/types.ts`, `src/main.tsx`, `src/index.css`.
2. **The existing `localStorage` key (`life-dashboard:v1`) and the entire storage layer are untouched.** Tauri's WebView persists `localStorage` across app launches automatically.
3. **No new frontend dependencies beyond `@tauri-apps/cli`, `@tauri-apps/api`, and dev-only `@tauri-apps/cli`.** No icon library, no UI library, no animation library.
4. **No hardcoded colors, no Tailwind color classes, three fonts only** — same as Phase 1.
5. **Bundle must launch.** `npm run tauri build` must produce a working `.app` that opens, shows the dashboard, and persists data across launches.
6. **Commit per phase.** One commit per Phase (2.0 through 2.5).
7. **Do not refactor TopNav until Phase 2.5.** It's the browser-fallback. Keep it on disk.

---

## 7. Verification

### Per-phase

```bash
cd ~/Desktop/Life-Dashboard
npx tsc --noEmit                  # exit 0
npm run build                     # exit 0 (web build)
cargo check --manifest-path src-tauri/Cargo.toml   # exit 0 (rust check)
```

### Phase 2.4 — running Tauri dev

```bash
cd ~/Desktop/Life-Dashboard
npm run tauri dev
```

Expected: a window opens, the dashboard renders with the sidebar layout. Clicking a sidebar item navigates. Reloading the window preserves `localStorage` data. Quitting and relaunching still preserves data.

### Phase 2.5 — production build

```bash
cd ~/Desktop/Life-Dashboard
npm run tauri build
```

Expected: a `Life-Dashboard.app` at `src-tauri/target/release/bundle/macos/Life-Dashboard.app`. Open it from Finder, verify:
- Window opens with the sidebar layout
- All sidebar links work
- Add a set, quit the app, reopen, set is still there
- Native macOS menu bar shows "Life-Dashboard | File | Edit | View | Window | Help"
- The "Add page" item in the sidebar is dimmed/disabled

### Verification trap to avoid

**`npm run tauri dev` is a long-running process.** Don't wrap it in `npm run build` thinking you're done — `tauri dev` opens a window and watches for changes. To test the build artifact, use `npm run tauri build` which compiles a release binary and bundles it. Use the **dev** command during iteration, the **build** command for final verification.

**`cargo check` is fast but `cargo build` (via `tauri dev` or `tauri build`) is slow on first run** — 5-10 minutes the first time it compiles the Tauri runtime. Subsequent builds are 30s-2min. Don't panic if the first build is slow.

---

## 8. Implementation order

### Phase 2.0 — Initialize Tauri 2.0

- `npm install --save-dev @tauri-apps/cli@^2`
- `npm install @tauri-apps/api@^2`
- `npx tauri init` in the project root. Use these answers:
  - Identifier: `com.iznic.lifedashboard`
  - Window title: `Life-Dashboard`
  - Frontend dist: `../dist` (relative to `src-tauri/`)
  - Dev URL: `http://localhost:5173`
  - Use the existing `package.json` for beforeDevCommand/beforeBuildCommand detection (Vite detected)
  - Skip the TypeScript prompt by saying yes to the typegen
- This creates `src-tauri/` with the Tauri scaffold.
- Verify: `cargo check --manifest-path src-tauri/Cargo.toml` exits 0.

### Phase 2.1 — Configure tauri.conf.json

- Replace the auto-generated `src-tauri/tauri.conf.json` with the version from section 3 of this plan.
- Set `titleBarStyle: "Overlay"`, `hiddenTitle: true`, and the dimensions from the spec.
- Set the bundle identifier and product name.
- Verify: `cargo check` still exits 0. Tauri re-reads the conf at compile time.

### Phase 2.2 — Add the native macOS menu bar

- Edit `src-tauri/src/lib.rs` with the menu setup code from section 4.
- Remove the default `greet` and `close` commands.
- Add the `app_version` command.
- Verify: `cargo build --manifest-path src-tauri/Cargo.toml` exits 0. (First build is slow.)

### Phase 2.3 — Frontend: globals.d.ts + Sidebar + Ribbon

- Create `src/globals.d.ts` with the `WebkitAppRegion` declaration.
- Create `src/components/Sidebar.tsx` with the full layout from section 4, including the 5 page icons (inline SVGs).
- Create `src/components/Ribbon.tsx` with the 32px topbar.
- Move the `handleExport` / `handleImportFile` logic from `TopNav.tsx` into `Sidebar.tsx` (cut-paste, not refactor).
- Update `src/App.tsx` to render `<Ribbon />` + `<Sidebar />` + `<main>` (no TopNav for now — Tauri-only for this phase). Use the `isTauri` detection from section 4 to fall back to the old TopNav in browser dev mode.
- Add `tauri` scripts to `package.json`:
  ```json
  "tauri": "tauri",
  "dev:tauri": "tauri dev",
  "build:tauri": "tauri build"
  ```
- Verify: `npx tsc --noEmit` and `npm run build` both exit 0. `npm run tauri dev` opens a window with the new layout.

### Phase 2.4 — Icons (placeholder) + run dev

- Generate or grab a 1024×1024 placeholder PNG for the app icon. Tauri 2.0 ships a default set in `src-tauri/icons/` — verify they exist. If not, run `npx tauri icon path/to/source.png` to generate the full icon set.
- `npm run tauri dev` — verify the dev cycle works, the window has the right title, the sidebar layout shows, the menu bar appears, and `localStorage` persists across app restarts.
- **Stop the dev process before continuing** to avoid file lock conflicts.

### Phase 2.5 — Build the bundle + remove TopNav fallback

- `npm run tauri build` — produces the `.app` and `.dmg`. Time the first build so the user knows what to expect.
- Open the resulting `.app` from Finder. Verify all the success criteria from section 7.
- Once verified, remove the old `TopNav` component and the `isTauri` branch in `App.tsx` (always render the sidebar layout).
- Final commit: `chore: phase 2.5 — clean up web fallback now that Tauri is the only target`.

---

## 9. Open questions for the user (resolve before Phase 2.4)

1. **Bundle identifier** — `com.iznic.lifedashboard` OK? Or do you have a personal domain we should use (e.g., `com.firaz.lifedashboard`)?
2. **App name in the macOS menu bar** — "Life-Dashboard" (with hyphen, matches the web app) or "Life Dashboard" (no hyphen, more "macOS-like")?
3. **Custom icon** — use Tauri's default placeholder for Phase 2 and ship without an icon, or do you have a logo PNG you want to use? If yes, where is it?

---

## 10. What is NOT in Phase 2 (intentionally deferred)

- User-defined pages, page JSON schema, signed imports — **Phase 3**
- Real filesystem storage (moving from `localStorage` to `~/Library/Application Support/data.db` via SQLite) — **Phase 3**
- PNG/PDF export with framing modal — **Phase 3**
- Sync folder support — **Phase 4**
- Theme marketplace / gallery — **Phase 4**
- Code signing / notarization for distribution — **Phase 4** (you'll need an Apple Developer account)

Phase 2 ships the **shell**. Phase 3 ships the **substance**. Don't conflate them.
