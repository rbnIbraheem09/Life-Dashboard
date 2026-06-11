/**
 * PanelToggle — a small chevron icon button that lives in the top
 * zone of the sidebar panel, on the right side, balancing the
 * traffic lights on the left. It rotates 180° to indicate direction:
 * chevron-left when the panel is open ("hide"), chevron-right when
 * the panel is collapsed ("show").
 *
 * data-no-drag: the drag hook's INTERACTIVE_SELECTOR catches this
 * via `[data-no-drag]` + the fact that it's a <button>.
 */

import { useUi } from '../store/ui'
import { cn } from '../lib/cn'

function ChevronLeft() {
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
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  )
}

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

export function PanelToggle() {
  const open = useUi((s) => s.sidebarOpen)
  const toggle = useUi((s) => s.toggleSidebar)

  return (
    <button
      type="button"
      onClick={toggle}
      data-no-drag
      title={open ? 'Hide sidebar (⌘\\)' : 'Show sidebar (⌘\\)'}
      aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
      className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
        'text-[var(--text-muted)]',
        'transition-colors duration-[var(--motion-fast)] ease-out',
        'hover:text-[var(--text)] hover:bg-white/[0.06]',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--border-active)]',
      )}
    >
      <span
        className={cn(
          'inline-flex transition-transform duration-[var(--motion-slow)] ease-[var(--ease-panel)]',
          open ? 'rotate-0' : 'rotate-180',
        )}
      >
        {open ? <ChevronLeft /> : <ChevronRight />}
      </span>
    </button>
  )
}
