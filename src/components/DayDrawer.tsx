import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { usePages } from '../store/pages'
import { aggregate } from '../lib/metrics'
import { ScrollArea } from './ScrollArea'
import { EntryList } from '../blocks/EntryList'
import { cn } from '../lib/cn'
import type { Entry } from '../types'

const noEntries = { entries: [] as Entry[] }

function formatDayHeading(key: string): string {
  try { return format(new Date(`${key}T00:00:00`), 'EEEE, MMMM d') } catch { return key }
}

export function DayDrawer({
  pageId,
  openDate,
  onClose,
}: {
  pageId: string
  openDate: string | null
  onClose: () => void
}) {
  const open = openDate !== null

  // Retain the last opened date through the slide-out so content doesn't blank.
  const [displayDate, setDisplayDate] = useState<string | null>(null)
  useEffect(() => { if (openDate) setDisplayDate(openDate) }, [openDate])

  const key = displayDate ?? ''
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[key] ?? noEntries)
  const total = def ? aggregate(day.entries, def.primaryMetric) : 0
  const count = day.entries.length
  const unit = def?.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col',
          'transition-transform duration-[var(--motion-mid)] ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <ScrollArea className="h-full w-full">
          <div className="p-7">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
                style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
              />
              <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Day Detail</span>
              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                className="iz-mono text-[15px] w-8 h-8 rounded-md ml-auto text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)] cursor-pointer"
              >
                ×
              </button>
            </div>
            <h2 className="iz-display text-2xl text-[var(--text)]">
              {displayDate ? formatDayHeading(displayDate) : ''}
            </h2>
            <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
              {total} {unit} · {count} {count === 1 ? 'entry' : 'entries'}
            </p>
            <div className="mt-6">
              {displayDate && <EntryList pageId={pageId} date={displayDate} />}
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}
