import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePages } from '../store/pages'
import { dateKey } from '../lib/date'
import { dayValue } from '../lib/metrics'
import type { Metric } from '../types'

const noDays = {}
const DAYS = 30
const W = 600
const H = 120

function lastNDates(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(d)
    c.setDate(d.getDate() - i)
    out.push(dateKey(c))
  }
  return out
}

export function TrendChart({ pageId, metric }: { pageId: string; metric: Metric }) {
  const reduce = useReducedMotion()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const days = usePages((s) => s.data.pages[pageId]?.data.days ?? noDays)

  const { line, area, hasData } = useMemo(() => {
    const keys = lastNDates(DAYS)
    const values = keys.map((k) => dayValue(days[k], metric))
    const max = Math.max(1, ...values)
    const pts = values.map((v, i) => {
      const x = (i / (DAYS - 1)) * W
      const y = H - (v / max) * (H - 8) - 4
      return [x, y] as const
    })
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${line} L${W},${H} L0,${H} Z`
    return { line, area, hasData: values.some((v) => v > 0) }
  }, [days, metric])

  if (!def) return null
  const unit = def.fields.find((f) => f.key === metric.field)?.unit ?? ''

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-7 py-6 glow-card">
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Trend</span>
        <span className="iz-label ml-auto">last {DAYS} days · {unit}</span>
      </div>
      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[120px]">
          <defs>
            <linearGradient id={`trend-${pageId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-1)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#trend-${pageId})`} />
          <motion.path
            d={line}
            fill="none"
            stroke="var(--accent-1)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div className="rounded-[10px] bg-white/[0.04] border border-[var(--border)] px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--text-dim)]">Not enough data yet.</p>
        </div>
      )}
    </div>
  )
}
