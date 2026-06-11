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
 *   When the sidebar is open, ONLY the left section of the
 *   icon is filled with the foreground color — the right
 *   section stays stroke-only. The vertical divider is always
 *   visible because the fill stops at the divider line.
 *   When the sidebar is closed, both sections are stroke-only.
 *   This is the difference between "this section of the panel
 *   is here" (sidebar open, left section highlighted) and
 *   "nothing is here yet" (sidebar closed, both sections
 *   outlined).
 *
 *   (A chevron is a directional affordance — it says "go
 *   left" or "go right". A sidebar pictogram is a presence
 *   affordance — it says "this thing is here". For a toggle
 *   that hides and reveals a panel, the presence affordance
 *   reads more clearly.)
 *
 * Press feedback:
 *   The button scales down 5% on press (active:scale-95) for
 *   a tiny physical tap feel. The transition is motion-fast
 *   so the press is felt, not seen as a layout shift. The
 *   background also bumps to white/[0.08] on press to give
 *   a slight tonal press feedback in addition to the scale.
 *
 * Layout:
 *   Rendered as a 24x24 hit target (w-6 h-6) with a 15x15 SVG
 *   centered inside. The 4-5px padding around the SVG keeps
 *   the hit target generous without making the icon feel
 *   chunky. The 15x15 size is intentionally a touch larger
 *   than the 14x14 used previously so the icon's visual
 *   weight matches the traffic lights next to it.
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
 * SidebarIcon — a 15x15 pictogram on a 16x16 viewBox.
 *
 * Geometry (all values in the 16x16 viewBox):
 *   - Outer rectangle: rounded corners (r=1), x=2.5..13.5,
 *     y=3.5..12.5. 11 units wide, 9 units tall.
 *   - Vertical divider: x=6, y=3.5..12.5. 3.5 units in from
 *     the rectangle's left edge — close enough to the left to
 *     read as a sidebar (a narrow column) without being so
 *     close that it looks like a tab strip.
 *   - Left-section fill (active state): the left section of
 *     the outer rectangle, from x=2.5 to x=6, filled with
 *     currentColor at full opacity. Drawn as its own path
 *     (not as a fill on the outer rectangle) so the right
 *     section stays stroke-only and the divider remains
 *     visible at all times. The left-section path uses the
 *     same top-left and bottom-left rounded corners as the
 *     outer rectangle; the right edge of the left section
 *     meets the divider line straight (no rounding needed).
 */
function SidebarIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[15px] h-[15px]"
      aria-hidden="true"
    >
      {/* Outer rectangle (always stroke-only). The rounded
          corners give the icon a soft, modern feel that
          matches the panel's rounded corners. */}
      <path
        d="M2.75 4.5 A1 1 0 0 1 3.75 3.5 H12.25 A1 1 0 0 1 13.25 4.5 V11.5 A1 1 0 0 1 12.25 12.5 H3.75 A1 1 0 0 1 2.75 11.5 Z"
        fill="none"
      />
      {/* Left section fill (active state only). Drawn as a
          separate path so the right section and the divider
          stay visible. The left section's path traces from
          the top-left rounded corner of the outer rectangle,
          down the divider line, around the bottom-left
          rounded corner, and back to the start. */}
      {active && (
        <path
          d="M3.75 3.5 H6 V12.5 H3.75 A1 1 0 0 1 2.75 11.5 V4.5 A1 1 0 0 1 3.75 3.5 Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {/* Vertical divider between the sidebar (left) and the
          main content (right). Always drawn at full opacity
          so it reads as a clear edge between the two
          sections regardless of the fill state. */}
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
      // Color: text-muted at rest, text on hover and when
      // the sidebar is open. The active state (sidebar open)
      // bumps the resting color up to text so the icon's
      // filled left section reads against the same color
      // treatment as the icon's strokes. The transition on
      // color and background is motion-fast so hover feels
      // snappy. The active:scale-95 + active:bg-white/[0.08]
      // give a small press feedback (tap to release feel)
      // without being noisy. The transform transition is
      // motion-fast so the press is felt, not seen.
      className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
        'transition-colors duration-[var(--motion-fast)] ease-out',
        'active:scale-95 active:bg-white/[0.08]',
        'transition-transform',
        open
          ? 'text-[var(--text)] hover:bg-white/[0.06]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.06]',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--border-active)]',
      )}
    >
      <span className="inline-flex">
        <SidebarIcon active={open} />
      </span>
    </button>
  )
}
