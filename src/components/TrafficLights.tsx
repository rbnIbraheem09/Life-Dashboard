/**
 * TrafficLights — the macOS close / minimize / maximize buttons drawn
 * as React buttons instead of OS chrome. Required because the window
 * uses `titleBarStyle: "Overlay"` (see tauri.conf.json) and we push
 * the OS-drawn traffic lights off-screen with
 * `trafficLightPosition: { x: -100, y: -100 }`. The WebView is
 * therefore responsible for rendering the lights.
 *
 * Why custom:
 *   The OS-drawn overlay lights, when not pushed off-screen, always
 *   render at fixed window coordinates (0, 0) — incompatible with
 *   a floating panel that has margin from the window's top-left.
 *   So we push them off-screen and render our own inside the
 *   panel. This is what Linear / Raycast / Arc do.
 *
 * Wiring (real macOS app behavior):
 *   Each button calls a Tauri command via `getCurrentWindow()`:
 *     - close  → appWindow.hide()  (NOT close())
 *     - min    → appWindow.minimize()
 *     - max    → appWindow.toggleMaximize()
 *
 * Why close is hide, not close:
 *   In a Tauri 2 single-window app, `appWindow.close()` actually
 *   quits the process on macOS — the app disappears from the dock
 *   and the menu bar vanishes. That is NOT how normal macOS apps
 *   behave when you click the red dot. Finder, Safari, Notes,
 *   Mail, etc. all keep running after the user closes the only
 *   window: the window disappears, but the dock icon and menu
 *   bar stay, and clicking the dock icon re-shows the window.
 *   The Tauri equivalent of that is `appWindow.hide()` — the
 *   window goes away, the process keeps running, the user can
 *   re-open via the dock or the menu bar.
 *
 * Why toggleMaximize (and not the explicit maximize/unmaximize
 * pair with isMaximized):
 *   An earlier iteration used `isMaximized() + maximize() /
 *   unmaximize()` for "more explicit semantics." The result was
 *   that the green button did nothing at all, because the
 *   Tauri capabilities allow `core:window:allow-toggle-maximize`
 *   but did NOT allow `core:window:allow-maximize` or
 *   `core:window:allow-unmaximize` — the permission system
 *   silently rejected the calls, and the `safe()` wrapper
 *   swallowed the errors. The result: no visible feedback,
 *   a confused user, and a wrong "fix" that masqueraded as
 *   progress. Reverting to `toggleMaximize()` (which IS in
 *   the capability list) and surfacing errors via
 *   console.warn instead of silently swallowing them is the
 *   honest fix. If the user wants fine-grained control over
 *   maximize vs fullscreen later, that's a separate
 *   permission grant + a separate decision.
 *
 *   In macOS Overlay mode, toggleMaximize gives the standard
 *   "fits the screen with title bar still visible" behavior
 *   that Finder/Safari/Notes use. (The earlier claim that it
 *   "drives the window into native fullscreen" was
 *   unverified — the real failure was permissions, not
 *   toggleMaximize.)
 *
 * Hover state (real macOS behavior):
 *   On hover, each light reveals its glyph (×, −, +) using the
 *   standard macOS colors:
 *     - close  → #FF5F57 (red)
 *     - min    → #FEBC2E (yellow)
 *     - max    → #28C840 (green)
 *   At rest, each light shows as a flat colored dot.
 *
 * data-no-drag:
 *   The buttons are clickable, so they opt out of the window drag
 *   zone via the `[data-no-drag]` attribute and the fact that
 *   they're <button> elements (the drag hook skips both).
 *
 * Error handling:
 *   Errors are surfaced via `console.warn` instead of being
 *   silently swallowed. If the Tauri command fails (e.g.
 *   permission missing, window already destroyed, etc.) the
 *   user and developer can see why. In a production desktop
 *   app, surface-level errors should be observable, not hidden.
 */

import { getCurrentWindow } from '@tauri-apps/api/window'
import { cn } from '../lib/cn'

function CloseGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="w-[8px] h-[8px]" aria-hidden="true">
      <path
        d="M3 3l6 6M9 3l-6 6"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MinGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="w-[8px] h-[8px]" aria-hidden="true">
      <path
        d="M3 6h6"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MaxGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="w-[8px] h-[8px]" aria-hidden="true">
      <path
        d="M3 3v6h6V3H3z"
        fill="none"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type LightProps = {
  color: string
  glyph: React.ReactNode
  label: string
  onClick: () => void
}

function Light({ color, glyph, label, onClick }: LightProps) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'group w-3 h-3 rounded-full flex items-center justify-center',
        'transition-all duration-[var(--motion-fast)]',
      )}
      style={{ backgroundColor: color }}
    >
      <span
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--motion-fast)]',
        )}
      >
        {glyph}
      </span>
    </button>
  )
}

export function TrafficLights() {
  // We resolve `appWindow` at click time (not on mount) so a
  // browser `npm run dev` doesn't crash if the Tauri APIs are
  // missing. In a Tauri build, getCurrentWindow() returns the
  // live window; in a browser, it throws and we no-op.
  let appWindow: ReturnType<typeof getCurrentWindow> | null = null
  try {
    appWindow = getCurrentWindow()
  } catch {
    /* browser dev — no Tauri runtime */
  }

  // Wraps a Tauri command so the click never throws. If the
  // command fails, we log the error via console.warn so the
  // developer can see what went wrong. We deliberately do NOT
  // show a UI toast for these — the user clicked a traffic
  // light, the action is atomic, and any failure is either
  // a bug (dev time) or a system-level condition (already-
  // closed window, etc.) that the user can't act on.
  function run(label: string, fn: () => Promise<unknown>) {
    return () => {
      if (!appWindow) return
      fn().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[TrafficLights] ${label} failed:`, err)
      })
    }
  }

  return (
    <div className="flex items-center gap-[8px]" data-no-drag>
      <Light
        color="#FF5F57"
        glyph={<CloseGlyph />}
        label="Close"
        // hide() instead of close(): in a single-window Tauri
        // app, close() quits the process on macOS. Normal macOS
        // apps (Finder, Safari, Notes) keep running after the
        // red dot — the window disappears, the dock icon and
        // menu bar stay, clicking the dock icon re-shows the
        // window. hide() gives us exactly that.
        onClick={run('hide', () => appWindow!.hide())}
      />
      <Light
        color="#FEBC2E"
        glyph={<MinGlyph />}
        label="Minimize"
        onClick={run('minimize', () => appWindow!.minimize())}
      />
      <Light
        color="#28C840"
        glyph={<MaxGlyph />}
        label="Maximize"
        onClick={run('toggleMaximize', () => appWindow!.toggleMaximize())}
      />
    </div>
  )
}
