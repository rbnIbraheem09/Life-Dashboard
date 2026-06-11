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
 *   coordinates (top: 14px, left: 14px) regardless of the
 *   sidebar's open/closed state. When the sidebar is open, the
 *   chrome visually sits at the top-left of the window, parked
 *   just inside the panel's left edge. When the sidebar
 *   collapses, the panel slides out from under the chrome, and
 *   the chrome stays put — close, minimize, maximize, and the
 *   sidebar toggle are always reachable.
 *
 * Layout inside the chrome:
 *   The traffic lights and the sidebar toggle are grouped on the
 *   left side of the chrome row with a small gap, not pushed
 *   apart with justify-between. The right side of the chrome
 *   row is intentionally empty — the window-level layer has no
 *   other purpose, and the empty space drags the window.
 *
 * Drag:
 *   The chrome is a `data-window-drag-zone`, so the empty space
 *   to the right of the toggle drags the window. The buttons
 *   themselves are <button> elements with `data-no-drag`, so
 *   clicks on them fire normally. This gives the user a wide,
 *   forgiving drag handle across the top of the window while
 *   the lights and toggle stay parked on the left.
 *
 * z-index:
 *   The chrome sits at z-30 above the sidebar (which has no
 *   explicit z-index and is therefore z-0). When the sidebar is
 *   open, the chrome appears to sit inside the panel's top-left
 *   corner — the panel's rounded corners and border render
 *   *behind* the chrome, but at this scale the difference is
 *   imperceptible.
 *
 * Position math:
 *   The sidebar's wrapper in App.tsx has `p-[10px]` and the
 *   panel inside it has `w-[240px]`. The panel's left edge sits
 *   at x=10px from the window. We park the chrome at left: 18px
 *   so the traffic lights sit 8px inside the panel's left
 *   edge — close enough to read as "inside the panel" when the
 *   panel is open, but with a small, deliberate breathing gap
 *   from the absolute window edge.
 *   The chrome's top: 14px mirrors the side offset and gives
 *   the same inset from the window's top edge.
 */

import { TrafficLights } from './TrafficLights'
import { PanelToggle } from './PanelToggle'

export function WindowChrome() {
  return (
    <div
      data-window-drag-zone
      // Window-level absolute layer. h-7 = 28px (tall enough to
      // vertically center the 12px traffic lights). z-30 puts
      // it above the sidebar and the main content. `select-none`
      // because the user is dragging, not selecting text. The
      // lights and the toggle are grouped on the left with a
      // small gap, leaving the rest of the row as drag surface.
      className="absolute top-[14px] left-[18px] z-30 h-7 flex items-center gap-1.5 select-none"
    >
      <TrafficLights />
      <PanelToggle />
    </div>
  )
}
