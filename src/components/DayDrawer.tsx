import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useDashboard } from '../store/dashboard'
import { cn } from '../lib/cn'
import type { PullupSet } from '../types'

const EMPTY: PullupSet[] = []

function formatTime(iso: string): string {
  try {
    return format(new Date(iso), 'h:mm a')
  } catch {
    return ''
  }
}

// Parse a "YYYY-MM-DD" key as local midnight so the weekday/date don't shift tz.
function formatDayHeading(key: string): string {
  try {
    return format(new Date(`${key}T00:00:00`), 'EEEE, MMMM d')
  } catch {
    return key
  }
}

export function DayDrawer({
  openDate,
  onClose,
}: {
  openDate: string | null
  onClose: () => void
}) {
  const open = openDate !== null

  // Retain the last opened date through the slide-out animation so content
  // doesn't blank while the panel translates away.
  const [displayDate, setDisplayDate] = useState<string | null>(null)
  useEffect(() => {
    if (openDate) setDisplayDate(openDate)
  }, [openDate])

  const key = displayDate ?? ''
  const sets = useDashboard(
    (s) => s.data.challenges.pullups.days[key]?.sets ?? EMPTY
  )
  const addSet = useDashboard((s) => s.addSet)
  const updateSet = useDashboard((s) => s.updateSet)
  const deleteSet = useDashboard((s) => s.deleteSet)

  const [reps, setReps] = useState(10)
  const [pulse, setPulse] = useState<{ id: string; n: number }>({ id: '', n: 0 })

  const total = sets.reduce((sum, s) => sum + s.reps, 0)

  // Esc closes the drawer while it's open.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!displayDate) return
    const n = Math.floor(reps)
    if (!Number.isFinite(n) || n <= 0) return
    addSet('pullups', displayDate, n)
  }

  function handleIncrement(set: PullupSet) {
    if (!displayDate) return
    updateSet('pullups', displayDate, set.id, set.reps + 1)
    setPulse((p) => ({ id: set.id, n: p.n + 1 }))
  }

  function handleDecrement(set: PullupSet) {
    if (!displayDate) return
    updateSet('pullups', displayDate, set.id, set.reps - 1)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!open}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] z-50 p-7 overflow-y-auto',
          'transition-transform duration-[var(--motion-mid)] ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Eyebrow + close */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
            style={{
              boxShadow:
                '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
            }}
          />
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
            Day Detail
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="iz-mono text-[15px] w-8 h-8 rounded-md ml-auto text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)] cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Heading */}
        <h2 className="iz-display text-2xl text-[var(--text)]">
          {displayDate ? formatDayHeading(displayDate) : ''}
        </h2>
        <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
          {total} reps · {sets.length} {sets.length === 1 ? 'set' : 'sets'}
        </p>

        {/* Set list */}
        <div className="mt-6">
          {sets.length === 0 ? (
            <div className="rounded-[10px] bg-white/[0.04] border border-[var(--border)] px-5 py-8 text-center">
              <p className="text-[13px] text-[var(--text-dim)]">
                No sets logged on this day.
              </p>
              <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
                Add one below to log retroactively.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sets.map((set, i) => (
                <li
                  key={set.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-2.5 hover:border-[var(--border-active)] hover:bg-[var(--accent-1)]/[0.03] transition-colors duration-[var(--motion-mid)]"
                >
                  <span className="iz-mono text-[11px] text-[var(--text-muted)] w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className="flex items-baseline gap-1.5">
                    <span
                      key={pulse.id === set.id ? `${set.id}-${pulse.n}` : set.id}
                      className={cn(
                        'iz-display text-2xl text-[var(--text)] tabular-nums',
                        pulse.id === set.id && 'iz-pulse'
                      )}
                    >
                      {set.reps}
                    </span>
                    <span className="iz-label">reps</span>
                    <span className="iz-mono text-[11px] text-[var(--text-muted)] ml-2">
                      {formatTime(set.loggedAt)}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDecrement(set)}
                      title="Decrease by 1 (deletes at 0)"
                      className="iz-mono text-[12px] px-2.5 py-1 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
                    >
                      − 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrement(set)}
                      title="Increase by 1"
                      className="iz-mono text-[13px] w-8 py-1 rounded-md text-[var(--accent-1)] border border-[var(--border-active)] hover:bg-[var(--accent-1)]/[0.08] transition-colors duration-[var(--motion-fast)]"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        displayDate && deleteSet('pullups', displayDate, set.id)
                      }
                      title="Delete this set"
                      className="iz-mono text-[13px] w-8 py-1 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]"
        >
          <span className="iz-label shrink-0">Add set</span>
          <input
            type="number"
            min={1}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="iz-mono text-[14px] w-20 px-3 py-2 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] focus:border-[var(--border-active)] focus:outline-none tabular-nums"
          />
          <span className="iz-label">reps</span>
          <button
            type="submit"
            className="ml-auto text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
          >
            + Add
          </button>
        </form>
      </aside>
    </>
  )
}
