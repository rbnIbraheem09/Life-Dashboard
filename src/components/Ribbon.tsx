/**
 * Ribbon — the 32px topbar for the Tauri shell.
 *
 * The whole bar is a `-webkit-app-region: drag` region so the user can drag the
 * frameless (titleBarStyle: "Overlay") window by it. The action buttons opt out
 * with `no-drag` so they stay clickable. Both actions are disabled placeholders
 * for Phase 2 — wired up in Phase 3.
 */
const iconBtnClass =
  'w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.04] flex items-center justify-center text-[14px] transition-colors duration-[var(--motion-fast)] disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]'

export function Ribbon() {
  return (
    <header
      className="h-8 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm flex items-center justify-end px-3 gap-1"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div
        style={{ WebkitAppRegion: 'no-drag' }}
        className="flex items-center gap-1"
      >
        <button
          type="button"
          disabled
          title="Coming in Phase 3"
          className={iconBtnClass}
        >
          ↻
        </button>
        <button
          type="button"
          disabled
          title="Coming in Phase 3"
          className={iconBtnClass}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
