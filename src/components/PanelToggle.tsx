/**
 * PanelToggle — a small icon button that opens and closes the
 * sidebar. Lives in the window-level WindowChrome layer,
 * parked right next to the traffic lights.
 *
 * Icon (the "sidebar" pictogram):
 *   A rectangle outline with a vertical divider near the left,
 *   dividing the rectangle into a narrow left section (the
 *   sidebar) and a wider right section (the main content).
 *   This is the standard "sidebar" pictogram used by Finder,
 *   Notes, Reminders, and most modern macOS apps. Minimal,
 *   instantly recognizable, and it has a clear affordance: it
 *   looks like the thing it toggles.
 *
 * Active / inactive state:
 *   When the sidebar is open, the left section of the icon is
 *   filled with the foreground color (var(--text)) to signal
 *   that the panel is currently shown. When the sidebar is
 *   closed, both sections are stroke-only and the icon uses
 *   var(--text-muted). The transition is smooth (motion-fast)
 *   so the toggle reads as the panel opening/closing, not as
 *   an unrelated button state change.
 *
 *   (A chevron is a directional affordance — it says "go
 *   left" or "go right". A sidebar pictogram is a presence
 *   affordance — it says "this thing is here". For a toggle
 *   that hides and reveals a panel, the presence affordance
 *   reads more clearly.)
 *
 * Layout:
 *   Rendered as a 24x24 hit target (w-6 h-6) with a 14x14 SVG
 *   centered inside. The 5px padding around the SVG keeps the
 *   hit target generous without making the icon feel chunky.
 *   `shrink-0` so the WindowChrome's flex layout doesn't
 *   compress it.
 *
 * data-no-drag:
 *   The drag hook's INTERACTIVE_SELECTOR catches this via
 *   `[data-no-drag]` + the fact that it's a <button>, so
 *   pointerdown on the toggle fires a click and never starts
 *   a window drag.
 */

import { useUi } from '../store/ui'
import { cn } from '../lib/cn'

/**
 * SidebarIcon — a 14x14 pictogram on a 16x16 viewBox.
 *
 * Geometry:
 *   - Outer rectangle: rounded corners, x=2.5..13.5, y=3.5..12.5
 *     (so the rectangle is 11 units wide and 9 units tall, with
 *     a small visual margin on all sides of the viewBox).
 *   - Vertical divider: x=6, y=3.5..12.5. This puts the divider
 *     3.5 units in from the rectangle's left edge — close enough
 *     to the left to read as a sidebar (a narrow column) without
 *     being so close that it looks like a tab strip.
 *   - Left fill (active state): same rectangle minus the right
 *     section, filled with the current color at 100% opacity
 *     when the sidebar is open. Drawn as a path so the rounded
 *     corners on the top-left and bottom-left of the outer
 *     rectangle carry through.
 */
function SidebarIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[14px] h-[14px]"
      aria-hidden="true"
    >
      {/* Outer rectangle. Filled when the sidebar is open so the
          whole panel reads as a single highlighted unit; outline-
          only when closed. The fill is a path (not the SVG `fill`
          attribute) so the rounded corners + the divider share
          the same color treatment. */}
      <path
        d="M2.75 4.5 A1 1 0 0 1 3.75 3.5 H12.25 A1 1 0 0 1 13.25 4.5 V11.5 A1 1 0 0 1 12.25 12.5 H3.75 A1 1 0 0 1 2.75 11.5 Z"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 1 : 0}
      />
      {/* Vertical divider between the sidebar (left) and the
          main content (right). Drawn as its own path so it
          stays at full opacity regardless of the fill state of
          the outer rectangle — that way the divider always
          reads as a clear edge between the two sections. */}
      <path d="M6 3.5 V12.5" />
    </svg>
  )
}

export function PanelToggle() {
  const open = useUi((s) => s.sidebarOpen)
  const toggle = useUi((s) => s.toggleSidebar)

  return (
    <button
      type="button"
      onClick={toggle}
      data-no-drag
      title={open ? 'Hide sidebar (\u2318\\)' : 'Show sidebar (\u2318\\)'}
      aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
      // Color: text-muted at rest, text on hover. The active
      // state (when the sidebar is open) bumps the resting
      // color up to text so the icon's filled section reads
      // against the same color treatment as the icon's
      // strokes. The transition on color and background is
      // motion-fast so hover feels snappy.
      className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
        'transition-colors duration-[var(--motion-fast)] ease-out',
        open
          ? 'text-[var(--text)] hover:bg-white/[0.06]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.06]',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--border-active)]',
      )}
    >
      <span
        className={cn(
          'inline-flex transition-colors duration-[var(--motion-fast)] ease-out',
        )}
      >
        <SidebarIcon active={open} />
      </span>
    </button>
  )
}
