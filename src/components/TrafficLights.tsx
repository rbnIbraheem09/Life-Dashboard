/**
 * TrafficLights — the macOS close / minimize / maximize buttons drawn
 * as React buttons instead of OS chrome. Required because the window
 * uses `titleBarStyle: "Transparent"` (see tauri.conf.json), which
 * tells macOS not to draw its own traffic lights.
 *
 * Why custom:
 *   With a transparent title bar, the WebView is responsible for
 *   rendering the traffic lights. This is what lets the lights sit
 *   visually inside a floating panel that has margin from the
 *   window's top-left corner — impossible with `titleBarStyle:
 *   "Overlay"` because the OS always draws the lights at fixed
 *   window coordinates (0, 0).
 *
 * Wiring:
 *   Each button calls a Tauri command via `getCurrentWindow()`:
 *     - close  → appWindow.close()
 *     - min    → appWindow.minimize()
 *     - max    → appWindow.toggleMaximize()
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
  // We call the Tauri commands at click time (not on mount) so a
  // browser `npm run dev` doesn't crash if the Tauri APIs are missing.
  function safe(fn: () => Promise<unknown>) {
    return () => {
      try {
        fn().catch(() => {})
      } catch {
        /* browser dev — no-op */
      }
    }
  }

  let appWindow: ReturnType<typeof getCurrentWindow> | null = null
  try {
    appWindow = getCurrentWindow()
  } catch {
    /* browser dev */
  }

  return (
    <div className="flex items-center gap-[8px]" data-no-drag>
      <Light
        color="#FF5F57"
        glyph={<CloseGlyph />}
        label="Close"
        onClick={safe(() => appWindow!.close())}
      />
      <Light
        color="#FEBC2E"
        glyph={<MinGlyph />}
        label="Minimize"
        onClick={safe(() => appWindow!.minimize())}
      />
      <Light
        color="#28C840"
        glyph={<MaxGlyph />}
        label="Maximize"
        onClick={safe(() => appWindow!.toggleMaximize())}
      />
    </div>
  )
}
