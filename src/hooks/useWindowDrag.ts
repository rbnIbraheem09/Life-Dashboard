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
