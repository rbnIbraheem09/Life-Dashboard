import { useMemo, useState } from 'react'
import {
  format,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
} from 'date-fns'
import { usePages } from '../store/pages'
import { dayValue } from '../lib/metrics'
import { DayDrawer } from '../components/DayDrawer'
import { dateKey, todayKey } from '../lib/date'
import { cn } from '../lib/cn'
import { ScrollArea } from '../components/ScrollArea'
import type { DayData, Target } from '../types'

// Stable empty reference so the selector output is referentially stable.
const EMPTY: Record<string, DayData> = {}

type View = 'month' | 'year'

type Cell = { key: string | null; date: Date | null }

const ROWS = 7
const YEAR_COLS = 53

// Mon-first row index: getDay() gives 0 (Sun)…6 (Sat); shift so Mon = 0, Sun = 6.
function mondayRow(date: Date): number {
  return (getDay(date) + 6) % ROWS
}

// Shared cell color ladder — matches IznicOS ActivityHeatmap exactly.
function cellLevel(reps: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (reps === 0) return 0
  const p = reps / goal
  if (p < 0.5) return 1
  if (p < 0.8) return 2
  if (p < 1) return 3
  return 4
}

function goalOf(target: Target): number {
  return target.kind === 'range' ? target.max : target.value
}

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-white/[0.04]',
  1: 'bg-[var(--accent-1)]/20',
  2: 'bg-[var(--accent-1)]/45',
  3: 'bg-[var(--accent-1)]/70',
  4: 'bg-[var(--accent-1)]',
}

const FUTURE_CLASS = 'bg-white/[0.02] opacity-50'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Fixed cell size — keeps monthly + yearly views visually uniform
// (without this, the 5-col month grid stretches cells to ~6x the yearly size).
const CELL = 'w-[14px] h-[14px] max-w-[14px] max-h-[14px]'

// Build the current month as a column-major flat array (index = col * 7 + row),
// padded with null cells before the 1st / after the last so weeks align Mon-first.
function buildMonth(year: number, month: number): { cells: Cell[]; cols: number } {
  const first = startOfMonth(new Date(year, month, 1))
  const last = endOfMonth(first)
  const days = eachDayOfInterval({ start: first, end: last })
  const startOffset = mondayRow(first)
  const cols = Math.ceil((startOffset + days.length) / ROWS)

  const cells: Cell[] = Array.from({ length: cols * ROWS }, () => ({
    key: null,
    date: null,
  }))
  days.forEach((d, i) => {
    const pos = startOffset + i
    cells[Math.floor(pos / ROWS) * ROWS + (pos % ROWS)] = {
      key: dateKey(d),
      date: d,
    }
  })
  return { cells, cols }
}

// Build the full year as a 7×53 column-major flat array (index = col * 7 + row).
function buildYear(year: number): Cell[] {
  const first = startOfYear(new Date(year, 0, 1))
  const days = eachDayOfInterval({ start: first, end: endOfYear(first) })
  const startOffset = mondayRow(first)

  const cells: Cell[] = Array.from({ length: YEAR_COLS * ROWS }, () => ({
    key: null,
    date: null,
  }))
  days.forEach((d, i) => {
    const pos = startOffset + i
    const col = Math.floor(pos / ROWS)
    if (col < YEAR_COLS) cells[col * ROWS + (pos % ROWS)] = { key: dateKey(d), date: d }
  })
  return cells
}

function pillClass(active: boolean): string {
  return cn(
    'iz-mono text-[11px] px-3 py-1 rounded-md transition-colors duration-[var(--motion-mid)]',
    active
      ? 'text-[var(--text)] bg-white/[0.05] border border-[var(--accent-1)]'
      : 'text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-dim)]'
  )
}

export function ActivityHeatmap({ pageId }: { pageId: string }) {
  const [view, setView] = useState<View>('month')
  const [openDate, setOpenDate] = useState<string | null>(null)
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const days = usePages((s) => s.data.pages[pageId]?.data.days ?? EMPTY)
  const metric = def?.primaryMetric
  const goal = def ? goalOf(def.target) : 1

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = todayKey()

  const month_ = useMemo(() => buildMonth(year, month), [year, month])
  const year_ = useMemo(() => buildYear(year), [year])

  const cells = view === 'month' ? month_.cells : year_
  const cols = view === 'month' ? month_.cols : YEAR_COLS
  const periodLabel = view === 'month' ? format(now, 'MMMM yyyy') : String(year)

  function renderCell(cell: Cell, i: number) {
    if (!cell.key) {
      // Padding cell (before the 1st / after the last) — invisible.
      return <div key={`pad-${i}`} className={cn(CELL, 'rounded-sm bg-transparent')} />
    }

    const value = metric ? dayValue(days[cell.key], metric) : 0
    const entryCount = days[cell.key]?.entries.length ?? 0
    const unit = def?.fields.find((f) => f.key === metric?.field)?.unit ?? ''
    const isToday = cell.key === today
    const isFuture = cell.key > today

    const colorClass = isFuture ? FUTURE_CLASS : LEVEL_CLASSES[cellLevel(value, goal)]

    return (
      <button
        type="button"
        key={cell.key}
        onClick={() => setOpenDate(cell.key)}
        title={`${cell.key} · ${value} ${unit} · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
        className={cn(
          CELL,
          'rounded-sm cursor-pointer hover:ring-1 hover:ring-[var(--accent-1)] transition-shadow duration-[var(--motion-fast)]',
          colorClass,
          isToday && 'border border-[var(--accent-2)]'
        )}
      />
    )
  }

  if (!def || !metric) return null

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius)] iz-panel px-7 py-6 glow-card">
      {/* Eyebrow + toggle */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{
            boxShadow:
              '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
          }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Activity
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setView('month')}
            className={pillClass(view === 'month')}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView('year')}
            className={pillClass(view === 'year')}
          >
            Year
          </button>
        </div>
      </div>

      {/* Period label */}
      <h3 className="iz-display text-xl text-[var(--text)] mb-4">{periodLabel}</h3>

      {/* Day labels + grid */}
      <ScrollArea direction="horizontal" className="w-full">
        <div className="flex gap-2 pb-2">
          <div
            className="grid gap-[3px] shrink-0"
            style={{ gridTemplateRows: `repeat(${ROWS}, 14px)` }}
          >
            {DAY_LABELS.map((d, i) => (
              <span
                key={i}
                className="iz-mono text-[10px] text-[var(--text-muted)] flex items-center"
              >
                {d}
              </span>
            ))}
          </div>
          <div
            className="grid gap-[3px]"
            style={{
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(${ROWS}, 14px)`,
              gridTemplateColumns: `repeat(${cols}, 14px)`,
            }}
          >
            {cells.map(renderCell)}
          </div>
        </div>
      </ScrollArea>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="text-[10px] text-[var(--text-muted)]">less</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <div key={lvl} className={cn('w-3 h-3 rounded-sm', LEVEL_CLASSES[lvl])} />
        ))}
        <span className="text-[10px] text-[var(--text-muted)]">more</span>
      </div>

      <DayDrawer pageId={pageId} openDate={openDate} onClose={() => setOpenDate(null)} />
    </div>
  )
}
