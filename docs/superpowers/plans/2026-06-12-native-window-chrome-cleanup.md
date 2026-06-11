# Native Window-Chrome & Scroll Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake macOS window chrome (fake traffic lights, fake drag, fake scroll) with native behavior, with zero change to how the app looks.

**Architecture:** Stop fighting the OS. (1) Un-hide the real macOS traffic lights and reposition them into the floating panel's corner. (2) Rewrite `ScrollArea`'s internals to use *native* scrolling with a custom-drawn thumb, keeping its public API so the frozen `ActivityGrid` is never touched. (3) Drag the window with a minimal `mousedown→startDragging` hook scoped to the top strip. (4) Lock the document and disable text selection in CSS. (5) Hide-on-close + dock-reopen in Rust. Net effect: ~700 fewer lines.

**Tech Stack:** Tauri 2.0 (Rust), React 18 + TypeScript, Tailwind v3, Vite 5.

**Testing approach:** This project's rule #7 is "no tests for v1 unless something risky emerges," and these are desktop-chrome/visual behaviors that unit tests can't meaningfully cover. So each task's gate is `npx tsc --noEmit` + `npm run build` (frontend) or `cargo check` (Rust), and the final task is a manual behavioral checklist in the running Tauri window.

**Spec:** `docs/superpowers/specs/2026-06-12-native-window-chrome-cleanup-design.md`

---

## File summary

| File | Action |
|---|---|
| `src/index.css` | Edit @layer base only: lock document, `overscroll-behavior`, `user-select:none` default; add `.iz-noscroll` utility |
| `src/components/ScrollArea.tsx` | Full rewrite of internals (same public API) |
| `src/components/WindowChrome.tsx` | Full rewrite — host only the toggle |
| `src/hooks/useWindowDrag.ts` | Full rewrite — minimal top-strip drag |
| `src/components/TrafficLights.tsx` | Delete |
| `src-tauri/tauri.conf.json` | Reposition native traffic lights |
| `src-tauri/src/lib.rs` | Hide-on-close + dock-reopen |
| `src-tauri/capabilities/default.json` | Trim window permissions |
| `App.tsx`, `Sidebar.tsx`, `PanelToggle.tsx`, all Phase-1 files | **Untouched** — verified, not edited |

---

## Task 1: Global CSS — lock the document, kill selection, hide native bars

**Files:**
- Modify: `src/index.css` (the `@layer base` block, lines ~31–65, and the trailing scrollbar comment, lines ~112–123)

Touch **only** the `@layer base` block and the trailing comment. Do NOT touch `:root` tokens, the `@layer components` font classes, or the `iz-pulse` animation.

- [ ] **Step 1: Replace the `@layer base` block**

Find the current `@layer base { … }` block and replace it in full with:

```css
@layer base {
  html,
  body,
  #root {
    height: 100%;
  }

  /* Desktop shell: the document itself never scrolls or bounces. All
     scrolling happens inside <ScrollArea> (overflow:auto) surfaces.
     This is what kills the whole-window rubber-band. */
  html,
  body {
    overflow: hidden;
    overscroll-behavior: none;
  }

  body {
    margin: 0;
    background-color: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Tame the default focus ring into the accent palette */
  :focus-visible {
    outline: 1px solid var(--border-active);
    outline-offset: 2px;
  }

  /* Native-app text selection: nothing is selectable by default, so you
     can't drag-select the window and hovering text shows the arrow
     cursor (not the I-beam). Only real input fields opt back in. */
  body {
    user-select: none;
    -webkit-user-select: none;
  }

  input,
  textarea,
  [contenteditable="true"] {
    user-select: text;
    -webkit-user-select: text;
  }
}
```

- [ ] **Step 2: Replace the trailing scrollbar comment block with the `.iz-noscroll` utility**

Find the comment block that starts with `/* ── Scrollbars: handled by <ScrollArea>` at the end of the file and replace it in full with:

```css
/* ── Custom scroll surfaces ──
   <ScrollArea> applies .iz-noscroll to its native overflow container.
   We draw our own thin thumb, so the native bar must never show. This
   is the primary hide path; ScrollArea also measures any reserved native
   bar width at runtime and clips it as a deterministic fallback (so even
   if a WebView ignores the rule below, no grey bar is ever visible). */
.iz-noscroll {
  scrollbar-width: none; /* Firefox */
}
.iz-noscroll::-webkit-scrollbar {
  display: none; /* WebKit / Chromium */
  width: 0;
  height: 0;
}
```

- [ ] **Step 3: Verify type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0; build prints `✓ built in …`.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "fix: lock document + disable text selection to kill bounce/I-beam

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Rewrite `ScrollArea` to native scroll + custom thumb

**Files:**
- Modify (full rewrite, same public API): `src/components/ScrollArea.tsx`

The public API (`children`, `className`, `direction`) is unchanged, so `App.tsx`, `Sidebar.tsx`, and the frozen `ActivityGrid.tsx` keep working without edits.

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

type Direction = 'vertical' | 'horizontal'

type ScrollAreaProps = {
  children: ReactNode
  /** ClassName for the outer (clipping) container — carries layout sizing. */
  className?: string
  /** Scroll direction. Defaults to 'vertical'. */
  direction?: Direction
}

/**
 * ScrollArea — NATIVE scrolling with a thin custom thumb.
 *
 * The OS does the actual scrolling (overflow:auto → real trackpad
 * momentum + inertia). We only DRAW a thin thumb, positioned from the
 * element's real scrollTop/scrollLeft on the native `scroll` event. No
 * wheel hijacking, no transform — the inversion that made the old
 * version janky.
 *
 * Hiding the native bar is self-adjusting and cannot leak the grey bar:
 *   1. `.iz-noscroll` sets `::-webkit-scrollbar { display: none }`.
 *   2. We measure the bar's reserved size (offset − client). If the
 *      WebView ignored (1) and still reserves space, we widen the
 *      scroller by exactly that much; the outer `overflow:hidden`
 *      clips the native bar out of the visible region. Pure geometry.
 *
 * `overscroll-behavior: contain` stops a scroll from chaining out to
 * the document — no whole-window rubber-band.
 */
export function ScrollArea({
  children,
  className,
  direction = 'vertical',
}: ScrollAreaProps) {
  const isVertical = direction === 'vertical'
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [thumb, setThumb] = useState<{ size: number; offset: number } | null>(
    null,
  )
  const [active, setActive] = useState(false)
  const fadeTimer = useRef<number | null>(null)

  // Recompute the thumb from the scroller's real scroll metrics.
  function recompute() {
    const el = scrollerRef.current
    if (!el) return
    const client = isVertical ? el.clientHeight : el.clientWidth
    const total = isVertical ? el.scrollHeight : el.scrollWidth
    const pos = isVertical ? el.scrollTop : el.scrollLeft
    if (total <= client + 1) {
      setThumb(null)
      return
    }
    const size = Math.max(24, (client / total) * client)
    const offset = (pos / (total - client)) * (client - size)
    setThumb({ size, offset })
  }

  // If the native bar reserves space (WebView ignored display:none),
  // widen the scroller by exactly that much so the outer overflow:hidden
  // clips the bar away. Guarded so it can't loop in the ResizeObserver.
  function fitNativeBar() {
    const el = scrollerRef.current
    if (!el) return
    if (isVertical) {
      const barW = el.offsetWidth - el.clientWidth
      const next = barW > 0 ? `calc(100% + ${barW}px)` : '100%'
      if (el.style.width !== next) el.style.width = next
    } else {
      const barH = el.offsetHeight - el.clientHeight
      const next = barH > 0 ? `calc(100% + ${barH}px)` : '100%'
      if (el.style.height !== next) el.style.height = next
    }
  }

  useEffect(() => {
    const el = scrollerRef.current
    const content = contentRef.current
    if (!el || !content) return
    fitNativeBar()
    recompute()
    const ro = new ResizeObserver(() => {
      fitNativeBar()
      recompute()
    })
    ro.observe(el)
    ro.observe(content)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVertical])

  function onScroll() {
    recompute()
    setActive(true)
    if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => setActive(false), 700)
  }

  useEffect(() => {
    return () => {
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current)
    }
  }, [])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className={cn(
          'iz-noscroll h-full w-full',
          isVertical
            ? 'overflow-y-auto overflow-x-hidden'
            : 'overflow-x-auto overflow-y-hidden',
        )}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div
          ref={contentRef}
          style={
            isVertical ? undefined : { width: 'max-content', minWidth: '100%' }
          }
        >
          {children}
        </div>
      </div>

      {thumb && (
        <div
          className={cn(
            'absolute rounded-full pointer-events-none z-10',
            'transition-opacity duration-[var(--motion-mid)] ease-out',
            isVertical ? 'right-[3px] w-[4px]' : 'bottom-[3px] h-[4px]',
            active
              ? 'opacity-100 bg-[color-mix(in_srgb,var(--text-dim)_70%,transparent)]'
              : 'opacity-50 bg-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]',
          )}
          style={
            isVertical
              ? {
                  top: 0,
                  height: `${thumb.size}px`,
                  transform: `translateY(${thumb.offset}px)`,
                }
              : {
                  left: 0,
                  width: `${thumb.size}px`,
                  transform: `translateX(${thumb.offset}px)`,
                }
          }
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0. (If tsc complains about an unused import, remove it — the code above imports only what it uses.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ScrollArea.tsx
git commit -m "fix: rewrite ScrollArea to native scroll + custom thumb

Same public API, so the frozen ActivityGrid is untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Native traffic lights + minimal drag + window-level toggle

**Files:**
- Modify: `src-tauri/tauri.conf.json` (the `trafficLightPosition` value)
- Modify (full rewrite): `src/components/WindowChrome.tsx`
- Modify (full rewrite): `src/hooks/useWindowDrag.ts`
- Delete: `src/components/TrafficLights.tsx`

- [ ] **Step 1: Reposition the native traffic lights in `tauri.conf.json`**

In the `app.windows[0]` object, change the `trafficLightPosition` from the off-screen `{ "x": -100, "y": -100 }` to an on-screen inset so the **real** lights land inside the floating panel's corner:

```json
        "trafficLightPosition": {
          "x": 18,
          "y": 22
        }
```

Leave `titleBarStyle: "Overlay"`, `hiddenTitle: true`, and `decorations: true` exactly as they are (these keep the rounded corners, shadow, and native lights). The `x/y` values get fine-tuned visually in Task 5.

- [ ] **Step 2: Rewrite `src/components/WindowChrome.tsx`**

```tsx
import { PanelToggle } from './PanelToggle'

/**
 * WindowChrome — the sidebar toggle, anchored to the WINDOW (not the
 * collapsing sidebar) so it is always reachable.
 *
 * The traffic lights are REAL macOS lights, drawn by the OS at
 * `trafficLightPosition` (see tauri.conf.json). They sit just to the
 * left of this toggle and can never be hidden by a collapsing panel.
 *
 * Window dragging is handled by useWindowDrag (the top strip of the
 * window) — there is no visible chrome bar here, by design.
 */
export function WindowChrome() {
  // left-[92px] parks the toggle just right of the three OS-drawn lights
  // (which start at trafficLightPosition x:18). top-[15px] vertically
  // aligns it with them. Both are fine-tuned visually in Task 5.
  return (
    <div className="absolute top-[15px] left-[92px] z-30">
      <PanelToggle />
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/hooks/useWindowDrag.ts`**

```ts
/**
 * useWindowDrag — drag the window by its top strip, the native way.
 *
 * A `mousedown` in the top DRAG_HEIGHT px (and not on an interactive
 * element) calls `getCurrentWindow().startDragging()`, which hands the
 * drag straight to the macOS window server — instant, native feel, same
 * as a real title bar.
 *
 * No overlay element is used (an overlay would eat wheel events over the
 * top strip). The arrow cursor during drag is guaranteed by the global
 * `user-select: none` in index.css (no selectable text → no I-beam).
 */
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

/** Title-bar-height grab strip at the top of the window. */
const DRAG_HEIGHT = 36

// Never start a drag from these — clicks must fire normally.
const NO_DRAG =
  'button, a, input, textarea, select, [role="button"], [role="dialog"], [data-no-drag]'

export function useWindowDrag() {
  useEffect(() => {
    let appWindow: ReturnType<typeof getCurrentWindow> | null = null
    try {
      appWindow = getCurrentWindow()
    } catch {
      return // browser dev — no Tauri runtime
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      if (e.clientY > DRAG_HEIGHT) return
      const target = e.target as Element | null
      if (target && target.closest(NO_DRAG)) return
      appWindow!.startDragging().catch(() => {
        /* browser dev or transient — ignore */
      })
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])
}
```

- [ ] **Step 4: Delete the fake traffic lights**

```bash
git rm src/components/TrafficLights.tsx
```

(Only `WindowChrome.tsx` imported it, and Step 2 removed that import. Confirm nothing else references it: `grep -rn "TrafficLights" src` should return no results.)

- [ ] **Step 5: Verify type-check + build**

Run: `grep -rn "TrafficLights" src; npx tsc --noEmit && npm run build`
Expected: grep prints nothing; tsc and build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/tauri.conf.json src/components/WindowChrome.tsx src/hooks/useWindowDrag.ts
git commit -m "fix: use native traffic lights + minimal native drag; drop fake chrome

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Rust — hide-on-close + dock-reopen, trim permissions

**Files:**
- Modify: `src-tauri/src/lib.rs` (imports + the builder tail)
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add imports to `src-tauri/src/lib.rs`**

Directly below the existing line `use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};`, add:

```rust
use tauri::{Manager, RunEvent, WindowEvent};
```

- [ ] **Step 2: Replace the builder tail in `src-tauri/src/lib.rs`**

The `.setup(|app| { … })` closure (the whole native-menu block) stays exactly as-is. Replace only the tail — the current lines:

```rust
        .invoke_handler(tauri::generate_handler![app_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

with:

```rust
        .on_window_event(|window, event| {
            // Real-macOS red-button behavior: hide the window instead of
            // quitting the process. The dock icon stays; RunEvent::Reopen
            // (below) re-shows the window when the dock icon is clicked.
            // ⌘Q / menu → Quit still fully quits.
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![app_version])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
```

- [ ] **Step 3: Trim `src-tauri/capabilities/default.json`**

Replace the `permissions` array (the fake buttons no longer call `close`/`minimize`/`toggle-maximize`; only the drag hook needs a window permission):

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": ["core:default", "core:window:allow-start-dragging"]
}
```

- [ ] **Step 4: Verify Rust compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: `Finished` with exit 0. (If it errors on `RunEvent::Reopen` being unknown, the toolchain is older than expected — stop and report; do not guess. It is a stable macOS variant in Tauri 2.)

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "fix: red button hides to dock + reopens on dock click; trim window perms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Run in the real window, verify every grievance, fine-tune positions

**Files:**
- Possibly modify (visual tuning only): `src-tauri/tauri.conf.json` (`trafficLightPosition`), `src/components/WindowChrome.tsx` (toggle `top`/`left`)

- [ ] **Step 1: Launch the dev window**

Run: `npm run tauri dev`
Expected: first build is slow (can be several minutes); then a window opens with the dashboard. Keep it open for the checks below.

- [ ] **Step 2: Verify the behavioral checklist** (each must pass)

- [ ] Green light → real macOS fullscreen (enters a new Space); hover reveals the ×/−/+ glyphs natively; Option-click the green light zooms.
- [ ] Red light → the window hides; clicking the app's dock icon brings it back focused; ⌘Q (or menu → Quit) fully quits.
- [ ] Yellow light → minimizes to dock.
- [ ] Dragging the top ~36px of the window moves it instantly; the cursor stays the arrow (no I-beam, no lag).
- [ ] Try to click-drag across body text/cards — nothing gets selected.
- [ ] Scroll the sidebar nav and the main content — the whole window does NOT bounce/shift; scroll stays inside the panel.
- [ ] Only the thin custom scrollbar is visible on the main list, at rest and on hover — never the grey native bar.
- [ ] Switch the Activity grid to **Year** and scroll it horizontally — again only the thin custom bar, never the grey native bar (this is the frozen `ActivityGrid` path).
- [ ] Collapse the sidebar (toggle or ⌘\) — the traffic lights and the toggle button stay visible and usable; reopen works.
- [ ] There is NO grey ribbon / header bar anywhere.

- [ ] **Step 3: Fine-tune light + toggle positions (if needed)**

If the native lights don't sit centered in the panel corner, adjust `trafficLightPosition` `x`/`y` in `tauri.conf.json` (e.g. try `x:16–22`, `y:18–24`) — config changes apply on the next `tauri dev` reload of the Rust side; restart `npm run tauri dev` if a change doesn't take. If the toggle isn't snug to the right of the lights, adjust `top`/`left` in `WindowChrome.tsx` (hot-reloads).

- [ ] **Step 4: Re-run the static gates**

Run: `npx tsc --noEmit && npm run build && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: all exit 0.

- [ ] **Step 5: Commit any tuning**

```bash
git add -A
git commit -m "fix: fine-tune native traffic-light + toggle positions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

(If nothing was tuned, skip the commit.)

---

## Self-review (done while writing)

**Spec coverage:** §3.1 native lights → Task 3 Step 1. §3.2 toggle reachability + no-vanish → Task 3 Step 2 (window-level toggle) + native lights are OS-drawn → Task 5 collapse check. §3.3 hide-on-close/reopen → Task 4. §3.4 native scroll + custom thumb + self-adjusting bar-hide → Task 2 + Task 1 `.iz-noscroll`. §3.5 seamless drag, no ribbon → Task 3 Step 3 (hook, no overlay). §3.6 selection + cursor → Task 1. §3.7 document lock → Task 1. §3.8 capabilities → Task 4 Step 3. Frozen-file constraint → ScrollArea keeps its API (Task 2), `ActivityGrid` untouched, verified in Task 5 year-view check.

**Placeholder scan:** none — every code step has complete content; the only deliberately deferred values are the pixel positions in Task 5, which are explicitly a visual-tuning step, not a code gap.

**Type/name consistency:** `ScrollArea` props (`children`/`className`/`direction`) match all call sites; `WindowChrome` exports a named `WindowChrome` (matches `App.tsx` import); `useWindowDrag` is a named export with no args (matches `App.tsx` usage); `PanelToggle` named export unchanged. Rust uses `Manager`/`RunEvent`/`WindowEvent`, `get_webview_window("main")`, `hide`/`show`/`set_focus`/`prevent_close` — all consistent.
