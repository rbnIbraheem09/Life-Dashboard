import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import { ScrollArea } from './ScrollArea'
import type { CatalogEntry, ScanFinding, ScanResult, ScanVerdict } from '../marketplace/types'

/** Single SVG path glyph, rendered in our own <svg> (never an emoji). */
export function PageGlyph({ d, className }: { d?: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      {d ? <path d={d} /> : <rect x="3.5" y="2.5" width="9" height="11" rx="2" />}
    </svg>
  )
}

const VERDICT: Record<ScanVerdict, { label: string; color: string; blurb: string }> = {
  safe: { label: 'Safe', color: 'var(--accent-1)', blurb: 'A clean, data-only page. Nothing here runs as code.' },
  review: { label: 'Worth a look', color: 'var(--accent-3)', blurb: 'Valid and installable — just review the notes below first.' },
  blocked: { label: 'Blocked', color: 'var(--accent-2)', blurb: "This file doesn't pass validation, so it can't be installed." },
}

function FindingDot({ level }: { level: ScanFinding['level'] }) {
  const color = level === 'warn' ? 'var(--accent-3)' : level === 'info' ? 'var(--text-muted)' : 'var(--accent-1)'
  return (
    <span className="mt-[5px] inline-block w-[6px] h-[6px] rounded-full shrink-0" style={{ background: color }} />
  )
}

/**
 * Inspect a marketplace page before installing: its metadata, a plain-English
 * safety report, and the exact JSON that would be installed. Reuses the app's
 * overlay styling and portals to <body> (so an ancestor transform can't trap
 * the fixed positioning — same reason ImportPageDialog does).
 */
export function PageInspector({
  entry,
  scan,
  installed,
  onInstall,
  onOpen,
  onClose,
}: {
  entry: CatalogEntry | null
  scan: ScanResult | null
  installed: boolean
  onInstall: () => void
  onOpen: () => void
  onClose: () => void
}) {
  const open = entry !== null
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (!open) return
    setShowRaw(false)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const raw = useMemo(() => (entry ? JSON.stringify(entry.page, null, 2) : ''), [entry])
  const v = scan ? VERDICT[scan.verdict] : null
  const name = scan?.def?.name ?? entry?.id ?? ''

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
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(560px,92vw)] max-h-[86vh] flex flex-col',
          'iz-panel rounded-[var(--radius)] border border-[var(--border)]',
          'shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)]',
          'transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {entry && scan && v && (
          <>
            {/* Header */}
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-start gap-4">
                <span
                  className="w-11 h-11 shrink-0 rounded-xl grid place-items-center text-[var(--accent-1)]"
                  style={{ background: 'color-mix(in srgb, var(--accent-1) 10%, transparent)', border: '1px solid var(--border)' }}
                >
                  <PageGlyph d={scan.def?.iconPath} className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Marketplace</span>
                  <h2 className="iz-display text-2xl text-[var(--text)] leading-tight mt-0.5 truncate">{name}</h2>
                  <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
                    by {entry.author}{scan.def ? ` · v${scan.def.version}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  title="Close (Esc)"
                  className="iz-mono text-[15px] w-8 h-8 rounded-md shrink-0 text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 border-t border-[var(--border)]">
              <ScrollArea className="h-full w-full">
                <div className="px-7 py-5 flex flex-col gap-5">
                  <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">{entry.description}</p>

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="iz-mono text-[10px] px-2 py-0.5 rounded-full text-[var(--text-muted)] border border-[var(--border)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Safety report */}
                  <div className="rounded-[12px] border border-[var(--border)] bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
                      <span className="iz-label">Safety check</span>
                      <span
                        className="ml-auto iz-mono text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          color: v.color,
                          background: `color-mix(in srgb, ${v.color} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${v.color} 35%, transparent)`,
                        }}
                      >
                        {v.label}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-[var(--text-dim)] mb-3">{v.blurb}</p>
                      <ul className="flex flex-col gap-2">
                        {scan.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <FindingDot level={f.level} />
                            <div className="min-w-0">
                              <span className="text-[12px] text-[var(--text)]">{f.label}</span>
                              {f.detail && (
                                <span className="block text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
                                  {f.detail}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Raw file viewer */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowRaw((s) => !s)}
                      className="iz-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-[var(--motion-fast)] inline-flex items-center gap-1.5"
                    >
                      <span className="inline-block transition-transform duration-[var(--motion-fast)]" style={{ transform: showRaw ? 'rotate(90deg)' : 'none' }}>›</span>
                      {showRaw ? 'Hide file' : 'View the exact file'}
                    </button>
                    {showRaw && (
                      <div className="mt-2 rounded-[10px] border border-[var(--border)] bg-black/20 max-h-[240px] overflow-hidden">
                        <ScrollArea className="h-full max-h-[240px] w-full">
                          <pre className="iz-mono text-[11px] leading-relaxed text-[var(--text-dim)] p-4 whitespace-pre">
                            {raw}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Footer actions */}
            <div className="px-7 py-4 border-t border-[var(--border)] flex items-center gap-2">
              <span className="iz-mono text-[11px] text-[var(--text-muted)]">
                {installed ? 'Already in your dashboard' : 'No personal data — installs as a blank page'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="iz-mono text-[12px] ml-auto px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
              >
                Cancel
              </button>
              {installed ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="text-[13px] font-medium px-4 py-2 rounded-md text-[var(--text)] border border-[var(--border-active)] hover:bg-white/[0.04] transition-colors duration-[var(--motion-fast)] cursor-pointer"
                >
                  Open page →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!scan.valid}
                  onClick={onInstall}
                  className={cn(
                    'text-[13px] font-medium px-4 py-2 rounded-md transition-opacity duration-[var(--motion-fast)]',
                    scan.valid
                      ? 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 cursor-pointer'
                      : 'bg-white/[0.04] text-[var(--text-muted)] cursor-not-allowed',
                  )}
                >
                  {scan.valid ? 'Install' : "Can't install"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  )
}
