# Design: Native Window-Chrome & Scroll Cleanup

> **Date:** 2026-06-12
> **Scope:** Replace the fake macOS window chrome (traffic lights, drag, scroll) with native behavior, **without changing how the app looks.** Phase-1 pullup components and the visual DNA stay untouched.
> **Out of scope:** The larger "easy page authoring / export / community-sharing" vision. That is a separate later project.

---

## 1. Root cause

The previous implementation abandoned native macOS chrome and rebuilt fake versions of everything:

- `tauri.conf.json` pushes the **real** traffic lights off-screen (`trafficLightPosition: { x: -100, y: -100 }`) and `TrafficLights.tsx` draws fake React buttons that call Tauri window commands.
- `useWindowDrag.ts` is a 120-line capture-phase `pointerdown` hook instead of a native drag region.
- `ScrollArea.tsx` (600 lines) **fakes scrolling** with `transform: translate3d` + a hand-written wheel handler, instead of letting the OS scroll.

Fake chrome cannot match native behavior. Every reported symptom traces to this:

| Symptom | Cause |
|---|---|
| Green button maximizes instead of true fullscreen | Fake `<button>` calling `toggleMaximize()`; native fullscreen-into-a-Space is OS-only |
| Close button does nothing / feels broken | Fake button calls `hide()`, nothing re-shows it (no Rust reopen handler) |
| I-beam cursor while dragging | Drag strip is bare text with no `cursor` rule |
| Whole app is text-selectable | `index.css` re-enables `user-select: text` on all text elements |
| Rubber-band: whole window bounces on scroll | Document not locked; no `overscroll-behavior`; wheel events bounce the page under the fake scroller |
| Janky resize | Fake scroller re-measures + re-applies a transform on every resize tick |
| Toggle/lights vanish when sidebar collapses (historical) | Chrome was a child of the collapsing panel |

**Fix philosophy: stop fighting the OS. Let macOS do macOS's job; only style what is genuinely ours (the thumb we draw).** Net result is ~700 fewer lines.

---

## 2. What stays exactly the same

The look is **not** changing. Confirmed against the user's screenshots:

- Floating-panel sidebar — rounded corners, ~10px margin all around, soft depth shadow.
- Traffic lights tucked into the panel's top-left corner, toggle button beside them.
- No visible title bar; content-forward, seamless.
- The thin on-brand scrollbar look (current "Image #3" thumb).
- All design tokens, the three fonts, the `iz-*` utility classes, every Phase-1 pullup component.

---

## 3. Key technical decisions

### 3.1 Native traffic lights inside the floating panel

- Keep `titleBarStyle: "Overlay"`, `hiddenTitle: true`, `decorations: true` (rounded corners + shadow + native lights all require this combination).
- **Remove the off-screen offset.** Set `trafficLightPosition` to land the *native* lights inside the floating panel's top-left corner (~`{ x: 18, y: 20 }`, tuned visually against the screenshot in the real window).
- Native lights are drawn by macOS over the webview → real fullscreen, hover glyphs, Option-click zoom, real minimize — all free, all correct.
- **Delete `TrafficLights.tsx`.**

### 3.2 Toggle reachability (the "vanishing chrome" bug)

- Native lights are OS-drawn, outside the React tree → a collapsing `<div>` cannot hide them. Guaranteed.
- The **sidebar toggle becomes a window-level element** anchored to the root container (`position: absolute`), NOT a child of the collapsing sidebar wrapper. It stays put when the panel collapses. `⌘\` still toggles.
- `WindowChrome.tsx` is slimmed to host only the toggle (no fake lights). `PanelToggle.tsx` is kept largely as-is.

### 3.3 Red button → hide to dock, reopen on dock click

In `src-tauri/src/lib.rs`:

- `.on_window_event` → on `WindowEvent::CloseRequested { api, .. }`: `window.hide()` then `api.prevent_close()`.
- Switch `.run(generate_context!())` to `.build(generate_context!())?.run(|app, event| …)` and handle `RunEvent::Reopen` (macOS dock click) → `get_webview_window("main")` → `.show()` + `.set_focus()`.
- Requires `use tauri::{Manager, WindowEvent, RunEvent};`.
- `⌘Q` / menu → Quit still fully quits (unchanged).

### 3.4 Native scrolling + custom thumb (the scrollbar)

**Rewrite `ScrollArea.tsx`'s internals; keep its public API (`children`, `className`, `direction`) identical.** This is mandatory because `ActivityGrid.tsx` (a **frozen** Phase-1 component) imports and uses `ScrollArea direction="horizontal"`. Rewriting internals fixes `ActivityGrid`, `Sidebar`, and `App` at once **without editing the frozen component.**

New internals:
- Real native scroll: the scroller is `overflow-{y|x}: auto` → real trackpad momentum/inertia from the OS.
- A thin custom thumb, positioned from the element's **real** `scrollTop`/`scrollLeft` (read on the native `scroll` event). We only *draw* the indicator; we never hijack the wheel. No `transform`, no wheel handler, no keyboard/touch reimplementation.
- `overscroll-behavior: contain` on the scroller so a scroll can't chain out to the document.

**Hiding the native bar — the guarantee (not an assumption):**
1. **Primary:** `::-webkit-scrollbar { display: none }`. Cleanest; usually honored by modern WKWebView.
2. **Deterministic fallback (used if any grey shows in the real build):** the **geometric clip** — the scrolling element is made ~16px larger than its clipping parent and pulled over with a negative margin; the parent is `overflow: hidden`. The native bar still renders, but in the clipped-away strip, so it is **never in the visible region**. This is pure geometry — it does not depend on WebKit honoring any scrollbar CSS, so the "ugly on hover" failure cannot recur.

Both paths yield the identical visible result: only the thin custom thumb is ever seen. Which hide-method is needed will be **verified empirically in the real Tauri window** before the work is called done.

### 3.5 Seamless invisible drag region (NO ribbon)

- **No visible chrome element.** A transparent, invisible strip (`absolute top-0 left-0 right-0`, height ~36px, `cursor: default`) across the top of the window carries `data-tauri-drag-region` → macOS handles the drag at the window-server level on mousedown (instant, native feel).
- The strip has **no interactive children** (this is what broke the previous AI's nested drag/no-drag handling). Native lights (OS-drawn) and the toggle button (sibling layer, higher z-index) sit on top and are naturally excluded.
- **Fallback** if `data-tauri-drag-region` is flaky in this build: a one-line `getCurrentWindow().startDragging()` on the strip's `mousedown`. Same native handoff.
- **Delete `useWindowDrag.ts`** (or reduce to the one-line fallback hook if needed).
- The grey stacked ribbon from the user's "Image #4" must never be created.

### 3.6 Text selection + cursor

In `index.css`:
- `user-select: none` as the **app-wide default** (it's a dashboard; nothing needs selecting). Opt back in only on form fields (`input`, `textarea`) if any exist.
- Remove the existing rule that re-enables `user-select: text` on all `p/h1–h6/.iz-*` elements.
- Drag region forces `cursor: default`.

### 3.7 Document lock (no rubber-band)

In `index.css`:
- `html, body, #root { height: 100%; overflow: hidden; }` — the document itself is never scrollable, so it can never elastic-bounce. (Primary, deterministic.)
- `html, body { overscroll-behavior: none; }` — secondary belt-and-suspenders.
- All actual scrolling happens inside `ScrollArea`'s `overflow: auto` containers.

### 3.8 Capabilities cleanup

`src-tauri/capabilities/default.json`:
- Keep `core:default` and `core:window:allow-start-dragging` (needed by `data-tauri-drag-region`).
- Drop `allow-close`, `allow-minimize`, `allow-toggle-maximize` (no JS calls them anymore — native lights + Rust handle window actions).

---

## 4. File-by-file plan

| File | Action |
|---|---|
| `src-tauri/tauri.conf.json` | Reposition native lights (remove off-screen offset) |
| `src-tauri/src/lib.rs` | Add `on_window_event` (hide-on-close) + `RunEvent::Reopen` (dock reopen) |
| `src-tauri/capabilities/default.json` | Trim window-command permissions |
| `src/index.css` | `user-select: none` default; lock document; `overscroll-behavior`; scrollbar/cursor rules. **Touch only chrome-level rules — tokens and `iz-*` classes untouched.** |
| `src/components/ScrollArea.tsx` | **Rewrite internals**, keep public API |
| `src/components/WindowChrome.tsx` | Slim to host only the toggle + the invisible drag strip |
| `src/components/PanelToggle.tsx` | Keep (minor tweaks at most) |
| `src/App.tsx` | Simplify layout; native scroll via rewritten `ScrollArea`; window-level toggle/drag |
| `src/components/Sidebar.tsx` | Keep using `ScrollArea` (now native); no visual change |
| `src/components/TrafficLights.tsx` | **Delete** |
| `src/hooks/useWindowDrag.ts` | **Delete** (or reduce to one-line `startDragging` fallback) |
| `src/components/ActivityGrid.tsx` and all other Phase-1 files | **Untouched (frozen)** |

---

## 5. Hard constraints

1. **No visual change.** The app must look identical to the user's current screenshot.
2. **Frozen Phase-1 files stay untouched**, including `ActivityGrid.tsx` — achieved by rewriting `ScrollArea` internals behind its existing API.
3. **`index.css` exception:** the user explicitly asked to fix the selection/scroll bugs that live there. Touch only chrome-level rules (selection, document lock, scrollbar, cursor). Do **not** alter design tokens or the `iz-display/iz-label/iz-mono` classes.
4. No hardcoded colors, no Tailwind color classes, three fonts only (existing project rules).
5. No new dependencies.

---

## 6. Verification

Per the project's existing gates, plus behavioral checks in the real window:

```bash
npx tsc --noEmit                                   # exit 0
npm run build                                      # exit 0
cargo check --manifest-path src-tauri/Cargo.toml   # exit 0
npm run tauri dev                                  # real window
```

In the running Tauri window, confirm each grievance is gone:
- [ ] Green light → real macOS fullscreen; hover shows glyphs; Option-click zooms
- [ ] Red light → window hides; clicking the dock icon brings it back; ⌘Q quits
- [ ] Dragging the top region moves the window instantly; cursor stays the arrow (no I-beam)
- [ ] Cannot drag-select the app body
- [ ] Scrolling the sidebar or main does NOT bounce the whole window
- [ ] Only the thin custom scrollbar is visible — never the grey native bar (check both the main list and the Activity grid year-view horizontal scroll, on hover)
- [ ] Collapsing the sidebar never hides the lights or the toggle
- [ ] No grey ribbon / header bar anywhere

---

## 7. Why this won't repeat the previous flailing

The previous attempt thrashed because it kept inventing fake chrome and then fighting the side effects. This design removes the fakes and defers to native behavior, so there are no side effects to chase. The one genuine WKWebView uncertainty (scrollbar hiding) is backed by a fallback that is deterministic geometry, not a bet on WebKit's cooperation.
