import { format } from 'date-fns'
import { useDashboard } from '../store/dashboard'
import { todayKey } from '../lib/date'
import type { PullupSet } from '../types'

// Stable empty reference so the selector output is referentially stable when
// no day entry exists yet (avoids re-render churn / getSnapshot warnings).
const EMPTY: PullupSet[] = []

const GOAL = 100

// Same premium gradient wrapper as TodaysSetsCard so the hero + sets read as a pair.
const containerStyle: React.CSSProperties = {
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-1) 6%, transparent), color-mix(in srgb, var(--accent-2) 4%, transparent))',
}

// Default gradient (violet → pink → amber); shifts amber-warm once the goal is hit.
const gradientStyle: React.CSSProperties = {
  background:
    'linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}
const gradientStyleHit: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}

function lastLoggedTime(sets: PullupSet[]): string {
  const last = sets[sets.length - 1]
  if (!last) return ''
  try {
    return format(new Date(last.loggedAt), 'h:mm a')
  } catch {
    return ''
  }
}

export function HeroChallengeCard() {
  const today = todayKey()
  const sets = useDashboard(
    (s) => s.data.challenges.pullups.days[today]?.sets ?? EMPTY
  )

  const total = sets.reduce((sum, s) => sum + s.reps, 0)
  const pct = Math.min(Math.max(total / GOAL, 0), 1)
  const hit = total >= GOAL
  const remaining = Math.max(0, GOAL - total)
  const time = lastLoggedTime(sets)

  const subline = hit
    ? `Goal hit · ${total - GOAL} over`
    : `${remaining} reps to go · ${sets.length} ${
        sets.length === 1 ? 'set' : 'sets'
      } logged${time ? ` · ${time}` : ''}`

  return (
    <div
      className="border border-[var(--border)] rounded-[var(--radius)] px-9 py-8 glow-card"
      style={containerStyle}
    >
      {/* Eyebrow row: dot + label left, goal hint right */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{
            boxShadow:
              '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
          }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Pullup Challenge
        </span>
        <span className="iz-label ml-auto">Goal · {GOAL} reps/day</span>
      </div>

      {/* Huge gradient count */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="iz-display text-6xl sm:text-7xl leading-none tabular-nums"
          style={hit ? gradientStyleHit : gradientStyle}
        >
          {total}
        </span>
        <span className="iz-display text-3xl text-[var(--text-muted)] leading-none tabular-nums">
          / {GOAL}
        </span>
      </div>

      {/* Mono detail line */}
      <p className="iz-mono text-[12px] text-[var(--text-dim)] mt-4">
        {subline}
      </p>

      {/* Progress bar */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-[var(--accent-1)]/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-1)] transition-[width] duration-200 ease-out"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <span className="iz-mono text-[11px] text-[var(--text-muted)] tabular-nums w-10 text-right">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
