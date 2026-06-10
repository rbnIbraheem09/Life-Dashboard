import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
} from 'date-fns'
import type { ChallengeData, DayEntry, Stats } from '../types'

/** Local-time "YYYY-MM-DD" key for a date (defaults to now). */
export function dateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

/** Today's local-time key. */
export function todayKey(): string {
  return dateKey(new Date())
}

export type GridCell = {
  /** "YYYY-MM-DD" key, or null for a padding cell before Jan 1 / after Dec 31. */
  key: string | null
  date: Date | null
}

/**
 * Build a 7-row × 53-column grid for the activity heatmap of `year`.
 * Row = weekday (0 = Sunday … 6 = Saturday), column = week index.
 * Returns a flat array of 7×53 = 371 cells, column-major friendly:
 * cell at (row r, col c) lives at index c * 7 + r.
 * Padding cells (before Jan 1 or after Dec 31) have null key/date.
 */
export function getYearDays(year: number): GridCell[] {
  const first = startOfYear(new Date(year, 0, 1))
  const last = endOfYear(first)
  const days = eachDayOfInterval({ start: first, end: last })

  const COLS = 53
  const ROWS = 7
  const cells: GridCell[] = Array.from({ length: COLS * ROWS }, () => ({
    key: null,
    date: null,
  }))

  // Offset so Jan 1 lands in its correct weekday row of column 0.
  const startOffset = getDay(first) // 0 (Sun) … 6 (Sat)
  days.forEach((d, i) => {
    const pos = startOffset + i
    const col = Math.floor(pos / ROWS)
    const row = pos % ROWS
    if (col < COLS) {
      cells[col * ROWS + row] = { key: dateKey(d), date: d }
    }
  })

  return cells
}

/**
 * Current streak: consecutive goal-hit days counting back from today.
 * If today has no goal-hit yet, the streak counts back from yesterday so an
 * in-progress day doesn't reset a live streak.
 */
export function getStreak(
  days: Record<string, DayEntry>,
  _goal: number
): number {
  let streak = 0
  const cursor = new Date()

  // If today isn't a goal-hit, start counting from yesterday.
  const todayEntry = days[dateKey(cursor)]
  if (!todayEntry?.goalHit) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (true) {
    const entry = days[dateKey(cursor)]
    if (entry?.goalHit) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/** Longest run of consecutive goal-hit days anywhere in history. */
function getBestStreak(days: Record<string, DayEntry>): number {
  const keys = Object.keys(days)
    .filter((k) => days[k].goalHit)
    .sort()
  if (keys.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1])
    const curr = new Date(keys[i])
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / 86_400_000
    )
    if (diffDays === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** Derived stats for a challenge — computed at render, never stored. */
export function getStats(challenge: ChallengeData): Stats {
  const entries = Object.values(challenge.days)
  const loggedDays = entries.filter((d) => d.sets.length > 0)
  const totalDays = loggedDays.length

  const avgPerDay =
    totalDays === 0
      ? 0
      : Math.round(
          loggedDays.reduce((sum, d) => sum + d.totalReps, 0) / totalDays
        )

  const goalHitDays = loggedDays.filter((d) => d.goalHit).length
  const goalHitPct =
    totalDays === 0 ? 0 : Math.round((goalHitDays / totalDays) * 100)

  return {
    currentStreak: getStreak(challenge.days, challenge.goalPerDay),
    bestStreak: getBestStreak(challenge.days),
    avgPerDay,
    goalHitPct,
  }
}
