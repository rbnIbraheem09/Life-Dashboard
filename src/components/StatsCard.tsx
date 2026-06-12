import { useMemo } from 'react'
import { useDashboard } from '../store/dashboard'
import { getStats } from '../lib/date'

type Stat = {
  label: string
  value: string
  unit: string
  /** Highlight the value in accent-1 (used for a live current streak). */
  accent?: boolean
}

function StatCell({ label, value, unit, accent }: Stat) {
  return (
    <div className="flex flex-col justify-center rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-4">
      <span className="iz-label block leading-tight">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-2">
        <span
          className="iz-display text-3xl tabular-nums"
          style={{ color: accent ? 'var(--accent-1)' : 'var(--text)' }}
        >
          {value}
        </span>
        <span className="iz-label">{unit}</span>
      </div>
    </div>
  )
}

export function StatsCard() {
  // The whole challenge object only changes identity on a real mutation, so a
  // single selector keeps re-renders tied to actual data changes.
  const challenge = useDashboard((s) => s.data.challenges.pullups)
  const stats = useMemo(() => getStats(challenge), [challenge])

  const cells: Stat[] = [
    {
      label: 'Current Streak',
      value: String(stats.currentStreak),
      unit: stats.currentStreak === 1 ? 'day' : 'days',
      accent: stats.currentStreak > 0,
    },
    {
      label: 'Best Streak',
      value: String(stats.bestStreak),
      unit: stats.bestStreak === 1 ? 'day' : 'days',
    },
    {
      label: 'Average / Day',
      value: String(stats.avgPerDay),
      unit: stats.avgPerDay === 1 ? 'rep' : 'reps',
    },
    {
      label: 'Goal Hit',
      value: `${stats.goalHitPct}%`,
      unit: 'of days',
    },
  ]

  return (
    <div className="flex flex-col h-full border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-7 py-6 glow-card">
      {/* Eyebrow */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{
            boxShadow:
              '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
          }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Stats
        </span>
      </div>

      {/* 2×2 grid — grows to fill the card so it balances the taller ActivityGrid */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 mt-4 flex-1">
        {cells.map((c) => (
          <StatCell key={c.label} {...c} />
        ))}
      </div>
    </div>
  )
}
