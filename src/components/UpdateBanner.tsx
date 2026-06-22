import { useUpdater } from '../store/updater'
import { cn } from '../lib/cn'

/**
 * A slim, dismissible pill that drops in from the top when a newer version is
 * available (surfaced by the silent launch check in App). One click downloads,
 * installs, and relaunches into the new build. Sits below the window-controls
 * strip and centered in the content area, so it never covers the traffic
 * lights or the sidebar.
 */
export function UpdateBanner() {
  const status = useUpdater((s) => s.status)
  const newVersion = useUpdater((s) => s.newVersion)
  const progress = useUpdater((s) => s.progress)
  const dismissed = useUpdater((s) => s.dismissed)
  const install = useUpdater((s) => s.install)
  const dismiss = useUpdater((s) => s.dismiss)

  const active = status === 'available' || status === 'downloading' || status === 'ready'
  const show = active && !dismissed
  const busy = status === 'downloading' || status === 'ready'

  return (
    <div
      className={cn(
        'fixed top-[48px] left-1/2 -translate-x-1/2 z-30 pointer-events-none',
        'transition-all duration-[var(--motion-slow)] ease-[var(--ease-panel)]',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none',
      )}
      aria-hidden={!show}
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full',
          'iz-panel border border-[var(--border-active)]',
          'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]',
        )}
      >
        <span
          className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 8px 1px color-mix(in srgb, var(--accent-1) 60%, transparent)' }}
        />
        {status === 'ready' ? (
          <span className="text-[13px] text-[var(--text)]">Restarting into the new version…</span>
        ) : status === 'downloading' ? (
          <span className="iz-mono text-[12px] text-[var(--text-dim)] tabular-nums">
            Updating… {Math.round(progress * 100)}%
          </span>
        ) : (
          <span className="text-[13px] text-[var(--text)]">
            Version <span className="iz-mono text-[var(--accent-1)]">{newVersion}</span> is available
          </span>
        )}

        {!busy && (
          <>
            <button
              type="button"
              onClick={() => void install()}
              className="text-[12px] font-medium px-3 py-1 rounded-full bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
            >
              Update & restart
            </button>
            <button
              type="button"
              onClick={dismiss}
              title="Later"
              className="iz-mono text-[13px] w-7 h-7 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.06] transition-colors duration-[var(--motion-fast)]"
            >
              ×
            </button>
          </>
        )}

        {status === 'downloading' && (
          <div className="w-24 h-1 rounded-full bg-[color-mix(in_srgb,var(--accent-1)_12%,transparent)] overflow-hidden mr-1">
            <div
              className="h-full rounded-full bg-[var(--accent-1)] transition-[width] duration-[var(--motion-fast)]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
