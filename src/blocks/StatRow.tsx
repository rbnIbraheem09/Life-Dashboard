import { useMemo } from 'react'
import { usePages } from '../store/pages'
import { computeStats } from '../lib/metrics'

type Stat = { label: string; value: string; unit: string; accent?: boolean }

function StatCell({ label, value, unit, accent }: Stat) {
  return (
    <div className="flex flex-col justify-center rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-4">
      <span className="iz-label block leading-tight">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="iz-display text-3xl tabular-nums" style={{ color: accent ? 'var(--accent-1)' : 'var(--text)' }}>
          {value}
        </span>
        <span className="iz-label">{unit}</span>
      </div>
    </div>
  )
}

const noDays = {}

export function StatRow({ pageId }: { pageId: string }) {
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const days = usePages((s) => s.data.pages[pageId]?.data.days ?? noDays)
  const stats = useMemo(
    () => (def ? computeStats(days, def.primaryMetric, def.target) : null),
    [days, def]
  )
  if (!def || !stats) return null
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''
  const unitSingular = unit.replace(/s$/, '')

  const cells: Stat[] = [
    { label: 'Current Streak', value: String(stats.currentStreak), unit: stats.currentStreak === 1 ? 'day' : 'days', accent: stats.currentStreak > 0 },
    { label: 'Best Streak', value: String(stats.bestStreak), unit: stats.bestStreak === 1 ? 'day' : 'days' },
    { label: 'Average / Day', value: String(stats.avgPerDay), unit: stats.avgPerDay === 1 ? unitSingular : unit },
    { label: 'Goal Hit', value: `${stats.goalHitPct}%`, unit: 'of days' },
  ]

  return (
    <div className="flex flex-col h-full border border-[var(--border)] rounded-[var(--radius)] iz-panel px-7 py-6 glow-card">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Stats</span>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-4 mt-4 flex-1">
        {cells.map((c) => <StatCell key={c.label} {...c} />)}
      </div>
    </div>
  )
}
