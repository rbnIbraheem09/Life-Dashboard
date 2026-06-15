import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

/**
 * Generic in-app confirm / notice modal. Portaled to <body> so its `fixed`
 * positioning is viewport-relative (a transformed ancestor — e.g. the sidebar
 * wrapper's will-change/transform — would otherwise trap it). Use instead of
 * window.confirm / window.alert, which are unreliable in webview runtimes
 * (Tauri / WKWebView).
 *
 *   Confirm mode — pass `confirmLabel` + `onConfirm` → Cancel + confirm buttons.
 *   Notice mode  — omit them → a single OK button (calls onClose).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm?: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isConfirm = typeof onConfirm === 'function' && !!confirmLabel

  return createPortal(
    <>
      <div
        onClick={onClose}
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
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>{title}</span>
        </div>
        <p className="text-[14px] text-[var(--text-dim)] leading-relaxed">{message}</p>
        <div className="flex items-center gap-2 mt-6">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  'text-[13px] font-medium ml-auto px-4 py-2 rounded-md transition-opacity duration-[var(--motion-fast)] cursor-pointer hover:opacity-90',
                  danger ? 'bg-[var(--accent-2)] text-[var(--bg)]' : 'bg-[var(--text)] text-[var(--bg)]',
                )}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-medium ml-auto px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
