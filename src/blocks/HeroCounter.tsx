import { format } from 'date-fns'
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { aggregate, isGoalHit, progressPct } from '../lib/metrics'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import { AnimatedBar } from '../motion/AnimatedBar'
import type { Entry } from '../types'

const noEntries = { entries: [] as Entry[] }

const gradientStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
}
const gradientStyleHit: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
}

function lastTime(entries: Entry[]): string {
  const last = entries[entries.length - 1]
  if (!last) return ''
  try { return format(new Date(last.at), 'h:mm a') } catch { return '' }
}

export function HeroCounter({ pageId }: { pageId: string }) {
  const today = todayKey()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[today] ?? noEntries)
  if (!def) return null

  const target = def.target
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''
  const total = aggregate(day.entries, def.primaryMetric)
  const pct = progressPct(total, target)
  const hit = isGoalHit(total, target, day.entries.length > 0)
  const goalValue = target.kind === 'range' ? target.max : target.value
  const time = lastTime(day.entries)
  const count = day.entries.length

  const remaining = Math.max(0, goalValue - total)
  const subline = hit
    ? `Goal hit · ${total - goalValue} over`
    : `${remaining} ${unit} to go · ${count} ${count === 1 ? 'entry' : 'entries'} logged${time ? ` · ${time}` : ''}`

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-9 py-8 glow-card">
      <div className="flex items-center gap-2 mb-6">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>{def.name}</span>
        <span className="iz-label ml-auto">Goal · {goalValue} {unit}/day</span>
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <AnimatedNumber
          value={total}
          flash={false}
          className="iz-display text-6xl sm:text-7xl leading-none tabular-nums"
          style={hit ? gradientStyleHit : gradientStyle}
        />
        <span className="iz-display text-3xl text-[var(--text-muted)] leading-none tabular-nums">
          / {goalValue}
        </span>
      </div>

      <p className="iz-mono text-[12px] text-[var(--text-dim)] mt-4">{subline}</p>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-[var(--accent-1)]/[0.08] overflow-hidden">
          <AnimatedBar pct={pct} className="h-full rounded-full bg-[var(--accent-1)]" />
        </div>
        <span className="iz-mono text-[11px] text-[var(--text-muted)] tabular-nums w-10 text-right">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
