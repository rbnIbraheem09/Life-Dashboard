import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

const SHORTCUTS: { key: string; desc: string }[] = [
  { key: 'a', desc: 'Focus the add-set input' },
  { key: '?', desc: 'Toggle this help overlay' },
  { key: 'Esc', desc: 'Close the open drawer or overlay' },
]

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!(
    el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  )
}

export function HelpOverlay() {
  const [open, setOpen] = useState(false)

  // `?` toggles the overlay (ignored while typing); Esc closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      onClick={() => setOpen(false)}
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-[var(--motion-mid)]',
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-[min(420px,90vw)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-7 py-6',
          'transition-transform duration-[var(--motion-mid)] ease-out',
          open ? 'scale-100' : 'scale-95'
        )}
      >
        {/* Eyebrow + close */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
            style={{
              boxShadow:
                '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
            }}
          />
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
            Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close (Esc)"
            className="iz-mono text-[15px] w-8 h-8 rounded-md ml-auto text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)] cursor-pointer"
          >
            ×
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-3"
            >
              <kbd className="iz-label min-w-[44px] text-center px-2 py-1 rounded-md bg-white/[0.04] border border-[var(--border)] text-[var(--text-dim)]">
                {s.key}
              </kbd>
              <span className="iz-display text-sm text-[var(--text)]">
                {s.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
