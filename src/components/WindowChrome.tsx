/**
 * WindowChrome — the traffic lights and the sidebar toggle,
 * promoted out of the floating sidebar panel and into a
 * window-level layer.
 *
 * Why:
 *   The previous design rendered the chrome inside the sidebar
 *   panel, so when the sidebar collapsed (width: 0, pointer-events:
 *   none), the user lost the ability to close, minimize, or
 *   maximize the window, and had no visible button to reopen the
 *   sidebar — they had to remember ⌘\ or Esc. That's a bad
 *   failure mode: the user is one click away from being stuck.
 *
 *   Promoting the chrome to a window-level absolutely-positioned
 *   layer fixes that: the chrome lives at fixed window
 *   coordinates (top: 10px, left: 10px, width: 240px) regardless
 *   of the sidebar's open/closed state. When the sidebar is open,
 *   the chrome visually sits exactly where it used to sit (the
 *   top edge of the floating panel). When the sidebar collapses,
 *   the panel slides out from under the chrome, and the chrome
 *   stays put — close, minimize, maximize, and the sidebar toggle
 *   are always reachable.
 *
 * Drag:
 *   The chrome is a `data-window-drag-zone`, so the empty space
 *   between the traffic lights and the sidebar toggle still
 *   drags the window. The buttons themselves are <button>
 *   elements with `data-no-drag`, so clicks on them fire
 *   normally. This is identical to the previous behavior, just
 *   hosted in a window-level layer instead of inside the panel.
 *
 * z-index:
 *   The chrome sits at z-30 above the sidebar (which has no
 *   explicit z-index and is therefore z-0). When the sidebar is
 *   open, the chrome appears to sit inside the panel's top edge —
 *   the panel's rounded corners and border render *behind* the
 *   chrome, but at this scale the difference is imperceptible.
 *
 * Position math:
 *   The sidebar's wrapper in App.tsx has `p-[10px]` and the panel
 *   inside it has `w-[240px]`. So the panel's left edge sits at
 *   x=10px from the window, and its right edge sits at x=250px.
 *   We mirror that here: top: 10px, left: 10px, width: 240px —
 *   so the traffic lights visually sit on the panel's left edge,
 *   and the sidebar toggle visually sits on the panel's right
 *   edge, regardless of the sidebar's open/closed state.
 */

import { TrafficLights } from './TrafficLights'
import { PanelToggle } from './PanelToggle'

export function WindowChrome() {
  return (
    <div
      data-window-drag-zone
      // Window-level absolute layer. h-7 = 28px, matching the
      // chrome row height we used inside the panel previously.
      // z-30 puts it above the sidebar (z-0) and the main
      // content (z-0), so clicks on the lights and the toggle
      // never get stolen by a content card scrolling under
      // them. `select-none` because the user is dragging, not
      // selecting text.
      className="absolute top-[10px] left-[10px] z-30 h-7 w-[240px] flex items-center justify-between select-none"
    >
      <TrafficLights />
      <PanelToggle />
    </div>
  )
}
