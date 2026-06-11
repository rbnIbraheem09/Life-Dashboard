/**
 * TitleStrip — the seamless, invisible-on-purpose drag handle that sits
 * at the very top of the window. It is the *only* top-level drag zone,
 * so the window is always draggable from the same 28px strip — even when
 * the sidebar is fully collapsed.
 *
 * Why a dedicated strip (instead of relying on the chrome row inside the
 * Sidebar):
 *   The previous design put `data-window-drag-zone` on the top row of
 *   the floating sidebar panel. That meant the moment the sidebar was
 *   hidden (width: 0, pointer-events: none), the drag handle vanished
 *   with it, and the user lost the ability to move the window without
 *   a keyboard shortcut. Easy to get into, hard to get out of.
 *
 *   Putting the drag handle in a window-level strip solves that: the
 *   strip is always rendered, always 28px tall, always full-width, and
 *   the user can ALWAYS grab it to drag the window.
 *
 * Visual:
 *   The strip itself is fully transparent — no background, no border,
 *   no shadow. It just exists as 28px of pointer real estate at the
 *   top. The traffic lights and the panel toggle continue to live
 *   inside the floating sidebar (they look great there, see the
 *   reference mockup), and this strip stays out of their way.
 *
 * Right-side reopen chevron:
 *   When the sidebar is open, the chevron is rendered inside the
 *   sidebar's chrome row, so this strip is empty (no duplicate button).
 *   When the sidebar is hidden, the chevron is rendered here, on the
 *   right side of the strip, so the user always has a visible way to
 *   bring the sidebar back. This is the "always-reachable toggle" —
 *   the previous failure mode where the toggle vanished with the
 *   sidebar is no longer possible.
 *
 * Drag mechanics:
 *   The whole strip is marked `data-window-drag-zone`. Buttons inside
 *   it (the reopen chevron) carry `data-no-drag`, so the
 *   `useWindowDrag` hook knows to skip them and let the click through.
 *   Everything else in the strip — the empty horizontal space — drags.
 */

import { useUi } from '../store/ui'
import { cn } from '../lib/cn'

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[14px] h-[14px]"
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

export function TitleStrip() {
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const toggleSidebar = useUi((s) => s.toggleSidebar)

  return (
    <div
      data-window-drag-zone
      // h-7 = 28px. Full width. No background, no border — the strip
      // is intentionally invisible. `shrink-0` so the row flex below
      // never compresses it. `select-none` because the user is
      // dragging, not selecting text. The right-side padding mirrors
      // the sidebar's `p-[10px]` margin so the chevron visually
      // aligns with the sidebar's right edge when the sidebar is
      // collapsed.
      className="h-7 w-full shrink-0 select-none flex items-center justify-end pr-[14px]"
    >
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          data-no-drag
          title="Show sidebar (\u2318\\)"
          aria-label="Show sidebar"
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
            'text-[var(--text-muted)]',
            'transition-colors duration-[var(--motion-fast)] ease-out',
            'hover:text-[var(--text)] hover:bg-white/[0.06]',
            'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--border-active)]',
          )}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  )
}
