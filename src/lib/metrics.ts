import type { DayData, Entry, Metric, Stats, Target } from '../types'
import { dateKey } from './date'

function numericValues(entries: Entry[], field: string): number[] {
  return entries
    .map((e) => e.fields[field])
    .map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
    .filter((v): v is number => typeof v === 'number')
}

export function aggregate(entries: Entry[], metric: Metric): number {
  if (metric.agg === 'count') return entries.length
  const vals = numericValues(entries, metric.field)
  if (vals.length === 0) return 0
  switch (metric.agg) {
    case 'sum': return vals.reduce((a, b) => a + b, 0)
    case 'avg': return vals.reduce((a, b) => a + b, 0) / vals.length
    case 'max': return Math.max(...vals)
    case 'min': return Math.min(...vals)
    case 'last': return vals[vals.length - 1]
  }
}

export function dayValue(day: DayData | undefined, metric: Metric): number {
  return day ? aggregate(day.entries, metric) : 0
}

export function isGoalHit(value: number, target: Target, hasEntries: boolean): boolean {
  switch (target.kind) {
    case 'atLeast': return value >= target.value
    case 'atMost': return hasEntries && value <= target.value
    case 'range': return value >= target.value && value <= target.max
  }
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)

export function progressPct(value: number, target: Target): number {
  switch (target.kind) {
    case 'atLeast': return clamp01(value / target.value)
    case 'range': return clamp01(value / target.max)
    case 'atMost': return clamp01(value / target.value)
  }
}

export function computeStats(
  days: Record<string, DayData>,
  metric: Metric,
  target: Target
): Stats {
  const logged = Object.entries(days).filter(([, d]) => d.entries.length > 0)
  const daysLogged = logged.length

  const avgPerDay =
    daysLogged === 0
      ? 0
      : Math.round(
          logged.reduce((s, [, d]) => s + aggregate(d.entries, metric), 0) / daysLogged
        )

  const hitKeys = logged
    .filter(([, d]) => isGoalHit(aggregate(d.entries, metric), target, true))
    .map(([k]) => k)
  const goalHitPct = daysLogged === 0 ? 0 : Math.round((hitKeys.length / daysLogged) * 100)

  const hitSet = new Set(hitKeys)

  // current streak: count back from today (or yesterday if today not hit yet)
  let currentStreak = 0
  const cursor = new Date()
  if (!hitSet.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (hitSet.has(dateKey(cursor))) {
    currentStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // best streak: longest run of consecutive calendar days among hit keys
  const sorted = [...hitSet].sort()
  let bestStreak = sorted.length ? 1 : 0
  let run = sorted.length ? 1 : 0
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000
    )
    if (diff === 1) {
      run += 1
      bestStreak = Math.max(bestStreak, run)
    } else {
      run = 1
    }
  }

  return { currentStreak, bestStreak, avgPerDay, goalHitPct, daysLogged }
}
