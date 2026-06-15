import { cn } from '../lib/cn'

/**
 * Shown when an imported page matches a template the user already has.
 * Three choices: Update (replace the def, keep data), Add as copy (fork a new
 * lineage), Cancel. Styled like the app's other overlays.
 */
export function ImportPageDialog({
  open,
  name,
  localVersion,
  fileVersion,
  onUpdate,
  onAddCopy,
  onCancel,
}: {
  open: boolean
  name: string
  localVersion: number
  fileVersion: number
  onUpdate: () => void
  onAddCopy: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div
        onClick={onCancel}
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(420px,90vw)]',
          'iz-panel rounded-[var(--radius)] border border-[var(--border)] p-7',
          'shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]',
          'transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
            style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
          />
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Import page</span>
        </div>
        <h2 className="iz-display text-2xl text-[var(--text)]">You already have “{name}”</h2>
        <p className="iz-mono text-[12px] text-[var(--text-dim)] mt-2">
          yours: v{localVersion} · file: v{fileVersion}
        </p>
        <p className="text-[13px] text-[var(--text-dim)] mt-3">
          Update keeps your logged data and swaps in the new definition. Add as copy creates a
          separate page and leaves your existing one untouched.
        </p>
        <div className="flex items-center gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAddCopy}
            className="iz-mono text-[12px] ml-auto px-3 py-2 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
          >
            Add as copy
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
          >
            Update
          </button>
        </div>
      </div>
    </>
  )
}
