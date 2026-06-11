/**
 * useWindowDrag — make specific elements of the app drag the window.
 *
 * Why a hook (not CSS `WebkitAppRegion: "drag"`):
 *   Tauri 2's macOS WKWebView handles the `data-tauri-drag-region`
 *   attribute unreliably, especially when nested inside elements
 *   that opt back in with `no-drag`. The official, bulletproof
 *   pattern (per https://v2.tauri.app/learn/window-customization/) is
 *   to call `getCurrentWindow().startDragging()` from a `mousedown`
 *   handler on the drag surface.
 *
 * Scope (not whole-window):
 *   We only start a drag when the pointerdown target lives inside an
 *   element marked with `data-window-drag-zone`. Marking is opt-in, so
 *   a card, a button, a nav link, or a scrollable region can NEVER
 *   accidentally start a drag. This is the modern macOS pattern:
 *   a thin seamless strip at the top of the window — typically the
 *   title-bar area of the sidebar — drags; everything else is fully
 *   interactive.
 *
 * Interactive exclusion:
 *   Even inside a drag zone, clicks on real interactive elements
 *   (links, buttons, inputs) never start a drag.
 *
 * Touch + pen:
 *   We listen on `pointerdown` so touchpads, mice, and pens all
 *   trigger drag uniformly.
 *
 * Double-click:
 *   A real macOS title bar maximizes the window on double-click. We
 *   honor that: a second `pointerdown` within 350ms of the first
 *   toggles maximize instead of starting a drag.
 */

import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

const DRAG_ZONE = '[data-window-drag-zone]'

// Elements that should never start a drag, even inside a drag zone.
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[contenteditable="true"]',
  '[data-no-drag]',
].join(',')

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  let el: Element | null = target
  while (el) {
    if (el.matches(INTERACTIVE_SELECTOR)) return true
    el = el.parentElement
  }
  return false
}

function isInDragZone(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(DRAG_ZONE) !== null
}

export function useWindowDrag() {
  const lastDownRef = useRef<number>(0)

  useEffect(() => {
    const appWindow = getCurrentWindow()

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      if (isInteractive(e.target)) return
      if (!isInDragZone(e.target)) return

      const now = Date.now()
      const isDouble = now - lastDownRef.current < 350
      lastDownRef.current = now

      e.preventDefault()

      if (isDouble) {
        appWindow.toggleMaximize().catch(() => {})
      } else {
        appWindow.startDragging().catch(() => {})
      }
    }

    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, {
        capture: true,
      } as EventListenerOptions)
    }
  }, [])
}
