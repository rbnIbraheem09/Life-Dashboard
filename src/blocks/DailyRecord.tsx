import { useEffect, useState } from 'react'
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { formatDuration } from '../lib/duration'
import { DurationInput } from '../components/DurationInput'
import { RatingDots } from '../components/RatingDots'
import type { Entry } from '../types'

const EMPTY: Entry[] = []

/**
 * One record per day (Sleep): the day's single entry, created or replaced.
 * `bare` drops the panel chrome for embedding in the DayDrawer.
 */
export function DailyRecord({
  pageId,
  date,
  bare = false,
}: {
  pageId: string
  date?: string
  bare?: boolean
}) {
  const day = date ?? todayKey()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const entries = usePages((s) => s.data.pages[pageId]?.data.days[day]?.entries ?? EMPTY)
  const addEntry = usePages((s) => s.addEntry)
  const updateEntry = usePages((s) => s.updateEntry)
  const deleteEntry = usePages((s) => s.deleteEntry)

  const record = entries[0]
  const durationField = def?.fields.find((f) => f.type === 'duration')
  const ratingField = def?.fields.find((f) => f.type === 'rating')

  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState<number>(Number(durationField?.default ?? 8))
  const [quality, setQuality] = useState<number>(Number(ratingField?.default ?? 3))

  useEffect(() => {
    if (record && durationField && ratingField) {
      setHours(Number(record.fields[durationField.key] ?? 8))
      setQuality(Number(record.fields[ratingField.key] ?? 3))
    }
  }, [record, durationField, ratingField])

  if (!def || !durationField || !ratingField) return null
  const showForm = !record || editing
  const dk = durationField.key
  const rk = ratingField.key

  function save() {
    const fields = { [dk]: hours, [rk]: quality }
    if (record) updateEntry(pageId, day, record.id, fields)
    else addEntry(pageId, day, fields)
    setEditing(false)
  }

  const body = (
    <>
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          {date ? 'Sleep record' : 'Last night'}
        </span>
        {record && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="iz-mono text-[11px] ml-auto px-2.5 py-1 rounded-md text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
          >
            Edit
          </button>
        )}
      </div>

      {showForm ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <span className="iz-label">{durationField.label}</span>
            <DurationInput value={hours} unit={durationField.unit ?? 'h'} step={durationField.step ?? 0.5} onChange={setHours} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="iz-label">{ratingField.label}</span>
            <RatingDots value={quality} scale={ratingField.scale ?? 5} onChange={setQuality} />
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
            {record && (
              <button
                type="button"
                onClick={() => {
                  deleteEntry(pageId, day, record.id)
                  setEditing(false)
                }}
                className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={save}
              className="ml-auto text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
            >
              Save night
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-8">
          <span className="iz-display text-4xl text-[var(--text)] tabular-nums">
            {formatDuration(Number(record.fields[dk] ?? 0), durationField.unit ?? 'h')}
          </span>
          <div className="flex flex-col gap-1.5 pb-1.5">
            <span className="iz-label">{ratingField.label}</span>
            <RatingDots value={Number(record.fields[rk] ?? 0)} scale={ratingField.scale ?? 5} />
          </div>
        </div>
      )}
    </>
  )

  if (bare) return <div>{body}</div>
  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-7 py-6 glow-card">
      {body}
    </div>
  )
}
