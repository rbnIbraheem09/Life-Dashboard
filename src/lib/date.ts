import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'

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
