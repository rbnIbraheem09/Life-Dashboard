import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { SPRING } from '../motion/springs'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import type { Entry, FieldDef, FieldValue } from '../types'
import { formatDuration } from '../lib/duration'
import { DurationInput } from '../components/DurationInput'

const EMPTY: Entry[] = []

function formatTime(iso: string): string {
  try { return format(new Date(iso), 'h:mm a') } catch { return '' }
}

/** Numeric value of an entry's field (0 if absent / non-numeric). */
function fieldNum(entry: Entry, key: string): number {
  const v = entry.fields[key]
  return typeof v === 'number' ? v : 0
}

type Props = {
  pageId: string
  /** Defaults to today; the DayDrawer passes a past date for retroactive logging. */
  date?: string
  /** `a` hotkey focuses the add input (only the today card wants this). */
  focusHotkey?: boolean
}

export function EntryList({ pageId, date, focusHotkey = false }: Props) {
  const reduce = useReducedMotion()
  const day = date ?? todayKey()

  const def = usePages((s) => s.data.pages[pageId]?.def)
  const entries = usePages((s) => s.data.pages[pageId]?.data.days[day]?.entries ?? EMPTY)
  const addEntry = usePages((s) => s.addEntry)
  const updateEntry = usePages((s) => s.updateEntry)
  const deleteEntry = usePages((s) => s.deleteEntry)

  // The primary field drives the big number + the +/- controls.
  const primary: FieldDef | undefined = def?.fields.find((f) => f.key === def.primaryMetric.field)
  const step = primary?.step ?? 1
  const unit = primary?.unit ?? ''

  const [value, setValue] = useState<number>(Number(primary?.default ?? step))
  const [extra, setExtra] = useState<Record<string, number>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focusHotkey) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'a' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusHotkey])

  if (!def || !primary) return null
  const pk = primary.key

  const secondaryFields = def.fields.filter((f) => f.key !== pk)

  function secondaryText(entry: Entry): string {
    return secondaryFields
      .map((f) => {
        const v = entry.fields[f.key]
        if (typeof v !== 'number' || v <= 0) return null
        return f.type === 'duration' ? formatDuration(v, f.unit ?? 'min') : `${v} ${f.unit ?? ''}`.trim()
      })
      .filter(Boolean)
      .join(' · ')
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.floor(value)
    if (!Number.isFinite(n) || n <= 0) return
    const fields: Record<string, FieldValue> = { [pk]: n }
    for (const f of secondaryFields) {
      const v = extra[f.key]
      if (typeof v === 'number' && v > 0) fields[f.key] = v
    }
    addEntry(pageId, day, fields)
    setExtra({})
  }

  function bump(entry: Entry, delta: number) {
    const next = fieldNum(entry, pk) + delta
    if (next <= 0) deleteEntry(pageId, day, entry.id)
    else updateEntry(pageId, day, entry.id, { [pk]: next })
  }

  return (
    <>
      {entries.length === 0 ? (
        <div className="rounded-[10px] bg-white/[0.04] border border-[var(--border)] px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--text-dim)]">No {unit} logged yet.</p>
          {focusHotkey && (
            <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
              Press <span className="text-[var(--accent-1)]">a</span> or add one below to start.
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => (
              <motion.li
                key={entry.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={SPRING.smooth}
                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-2.5 hover:border-[var(--border-active)] hover:bg-[color-mix(in_srgb,var(--accent-1)_4%,transparent)] transition-colors duration-[var(--motion-mid)]"
              >
                <span className="iz-mono text-[11px] text-[var(--text-muted)] w-5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <AnimatedNumber
                    value={fieldNum(entry, pk)}
                    className="iz-display text-2xl text-[var(--text)] tabular-nums"
                  />
                  <span className="iz-label">{unit}</span>
                </span>
                <span className="iz-mono text-[11px] text-[var(--text-muted)] truncate">
                  {[secondaryText(entry), formatTime(entry.at)].filter(Boolean).join('  ·  ')}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => bump(entry, -step)}
                    title="Decrease (deletes at 0)"
                    className="iz-mono text-[12px] px-2.5 py-1 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
                  >
                    − {step}
                  </button>
                  <button
                    type="button"
                    onClick={() => bump(entry, step)}
                    title="Increase"
                    className="iz-mono text-[13px] w-8 py-1 rounded-md text-[var(--accent-1)] border border-[var(--border-active)] hover:bg-[color-mix(in_srgb,var(--accent-1)_10%,transparent)] transition-colors duration-[var(--motion-fast)]"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(pageId, day, entry.id)}
                    title="Delete this entry"
                    className="iz-mono text-[13px] w-8 py-1 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
                  >
                    ×
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <span className="iz-label shrink-0">Add {primary.label.toLowerCase()}</span>
        <input
          ref={inputRef}
          type="number"
          min={1}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="iz-mono text-[14px] w-20 px-3 py-2 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] focus:border-[var(--border-active)] focus:outline-none tabular-nums"
        />
        <span className="iz-label">{unit}</span>
        {secondaryFields.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5">
            <span className="iz-label">{f.label}</span>
            {f.type === 'duration' ? (
              <DurationInput
                value={extra[f.key] ?? 0}
                unit={f.unit ?? 'min'}
                step={f.step ?? 1}
                onChange={(v) => setExtra((s) => ({ ...s, [f.key]: v }))}
              />
            ) : (
              <input
                type="number"
                min={0}
                step={f.step ?? 1}
                value={extra[f.key] ?? 0}
                onChange={(e) => setExtra((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                className="iz-mono text-[14px] w-20 px-3 py-2 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] focus:border-[var(--border-active)] focus:outline-none tabular-nums"
              />
            )}
          </span>
        ))}
        <button
          type="submit"
          className="ml-auto text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
        >
          + Add
        </button>
      </form>
    </>
  )
}
