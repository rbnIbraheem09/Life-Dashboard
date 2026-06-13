import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useDashboard } from '../store/dashboard'
import { todayKey } from '../lib/date'
import { cn } from '../lib/cn'
import type { PullupSet } from '../types'

// Stable empty reference so the selector output is referentially stable when
// no day entry exists yet (avoids re-render churn / getSnapshot warnings).
const EMPTY: PullupSet[] = []

// Background comes from the shared `.iz-panel` surface (toggled globally in
// Settings between the surface look and the accent-gradient look).

function formatTime(iso: string): string {
  try {
    return format(new Date(iso), 'h:mm a')
  } catch {
    return ''
  }
}

export function TodaysSetsCard() {
  const today = todayKey()
  const sets = useDashboard(
    (s) => s.data.challenges.pullups.days[today]?.sets ?? EMPTY
  )
  const addSet = useDashboard((s) => s.addSet)
  const updateSet = useDashboard((s) => s.updateSet)
  const deleteSet = useDashboard((s) => s.deleteSet)

  // Sticky add-set value (defaults to 10, remembers last entry within session).
  const [reps, setReps] = useState(10)
  const inputRef = useRef<HTMLInputElement>(null)

  // Pulse retrigger: bumping `n` remounts the reps span via its key, which
  // restarts the CSS keyframe even on repeated [+] clicks of the same row.
  const [pulse, setPulse] = useState<{ id: string; n: number }>({
    id: '',
    n: 0,
  })

  const total = sets.reduce((sum, s) => sum + s.reps, 0)

  // `a` focuses the add-set input — ignore while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'a' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.floor(reps)
    if (!Number.isFinite(n) || n <= 0) return
    addSet('pullups', today, n)
  }

  function handleIncrement(set: PullupSet) {
    updateSet('pullups', today, set.id, set.reps + 1)
    setPulse((p) => ({ id: set.id, n: p.n + 1 }))
  }

  function handleDecrement(set: PullupSet) {
    // updateSet removes the set when reps drops to 0.
    updateSet('pullups', today, set.id, set.reps - 1)
  }

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-7 py-6 glow-card">
      {/* Eyebrow + total */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{
            boxShadow:
              '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
          }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Today's Sets
        </span>
        <span className="iz-label ml-auto">
          {total} reps · {sets.length} {sets.length === 1 ? 'set' : 'sets'}
        </span>
      </div>

      {/* Set list */}
      {sets.length === 0 ? (
        <div className="rounded-[10px] bg-white/[0.04] border border-[var(--border)] px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--text-dim)]">
            No sets logged yet today.
          </p>
          <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
            Press <span className="text-[var(--accent-1)]">a</span> or add one
            below to start.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sets.map((set, i) => (
            <li
              key={set.id}
              className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-2.5 hover:border-[var(--border-active)] hover:bg-[var(--accent-1)]/[0.03] transition-colors duration-[var(--motion-mid)]"
            >
              {/* Index */}
              <span className="iz-mono text-[11px] text-[var(--text-muted)] w-5">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Reps */}
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
              </span>

              {/* Timestamp */}
              <span className="iz-mono text-[11px] text-[var(--text-muted)]">
                {formatTime(set.loggedAt)}
              </span>

              {/* Controls */}
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
                  onClick={() => deleteSet('pullups', today, set.id)}
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

      {/* Inline add form */}
      <form
        onSubmit={handleAdd}
        className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]"
      >
        <span className="iz-label shrink-0">Add set</span>
        <input
          ref={inputRef}
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
    </div>
  )
}
