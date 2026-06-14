import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { aggregate } from '../lib/metrics'
import { EntryList } from './EntryList'

const noEntries = { entries: [] }

export function EntryLog({ pageId }: { pageId: string }) {
  const today = todayKey()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[today] ?? noEntries)
  if (!def) return null

  const total = aggregate(day.entries, def.primaryMetric)
  const count = day.entries.length
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-7 py-6 glow-card">
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Today's Log</span>
        <span className="iz-label ml-auto">
          {total} {unit} · {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <EntryList pageId={pageId} focusHotkey />
    </div>
  )
}
