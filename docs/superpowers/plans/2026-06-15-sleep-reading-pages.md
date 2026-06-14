# Sleep + Reading Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two stubbed pages (`/sleep`, `/reading`) as real data-driven pages, exercising the engine's `duration`/`rating` field types and `range` target for the first time.

**Architecture:** Reading reuses the existing additive `EntryList` logging model (extended for a secondary `minutes` field); Sleep gets a new `DailyRecord` block (one record/night: hours + quality). All downstream blocks (hero, stats, heatmap, trend) stay generic and gain duration/range formatting. A new `storage` merge makes the pages appear for existing v2 stores without touching pullup/water data.

**Tech Stack:** Vite + React 18 + TypeScript, Zustand, framer-motion, date-fns, Tailwind v3, vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-sleep-reading-pages-design.md`

**Conventions (hard rules — do not break):**
- No hardcoded colors. Only `var(--*)`, `color-mix()`, `bg-white/[0.0X]`.
- Three fonts only (classes `iz-display`, body, `iz-mono`). No Tailwind color classes.
- No new dependencies. No new global-state libs.
- Pure logic is TDD'd (vitest); React components are verified by `npm run typecheck` + `npm run build` + manual check (matches the page-schema spine's testing approach).

**Commands:**
- Type-check: `npm run typecheck`
- All tests: `npm run test`
- One test file: `npx vitest run src/lib/<file>.test.ts`
- Build: `npm run build`
- Dev server (manual checks): `npm run dev` → http://localhost:5173

**Note on the freeze list:** `CLAUDE.md` rule 4 froze `DayDrawer.tsx` etc. for the Tauri Phase 2. The page-schema program (current direction) already superseded that — commit `6ff7e0e` generalized `DayDrawer` to any page. This plan continues that program and modifies `DayDrawer.tsx`, `metrics.ts`, `types.ts`, registry, and the blocks accordingly.

---

## File map

**Create:**
- `src/lib/duration.ts` — `formatDuration(value, unit)` (pure)
- `src/lib/duration.test.ts` — its tests
- `src/components/RatingDots.tsx` — dot rating widget (display + interactive)
- `src/components/DurationInput.tsx` — `[h][m]` / `[min]` entry
- `src/blocks/DailyRecord.tsx` — Sleep's one-record-per-day logger block
- `src/registry/reading.ts` — Reading `PageDef`
- `src/registry/sleep.ts` — Sleep `PageDef`

**Modify:**
- `src/lib/metrics.ts` — `computeStats` returns unrounded `avgPerDay`
- `src/lib/metrics.test.ts` — assert unrounded avg
- `src/lib/storage.ts` — additive builtin merge on load
- `src/lib/storage.test.ts` — new file for the merge (see Task 4)
- `src/types.ts` — add `dailyRecord` to `BlockDef`
- `src/blocks/StatRow.tsx` — format duration avg / round count avg at display
- `src/blocks/EntryList.tsx` — render secondary fields (add form + rows)
- `src/blocks/HeroCounter.tsx` — duration formatting + range-aware subline
- `src/blocks/ActivityHeatmap.tsx` — format duration in tooltip
- `src/blocks/TrendChart.tsx` — format duration unit label
- `src/blocks/PageRenderer.tsx` — render `dailyRecord` block
- `src/components/DayDrawer.tsx` — pick logger (EntryList vs DailyRecord)
- `src/registry/builtins.ts` — register both pages
- `src/App.tsx` — route `/reading` and `/sleep` to `PageRenderer`

**Delete:**
- `src/components/ComingSoon.tsx` (Task 14, once unreferenced)

---

## Task 1: `formatDuration` (pure)

**Files:**
- Create: `src/lib/duration.ts`
- Test: `src/lib/duration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/duration.test.ts
import { describe, it, expect } from 'vitest'
import { formatDuration } from './duration'

describe('formatDuration', () => {
  it('splits decimal hours into h + m', () => {
    expect(formatDuration(7.5, 'h')).toBe('7h 30m')
  })
  it('drops a zero minute component', () => {
    expect(formatDuration(8, 'h')).toBe('8h')
  })
  it('shows sub-hour minute values alone', () => {
    expect(formatDuration(35, 'min')).toBe('35m')
  })
  it('rolls minutes over into hours', () => {
    expect(formatDuration(95, 'min')).toBe('1h 35m')
  })
  it('keeps a zero hours value readable', () => {
    expect(formatDuration(0, 'h')).toBe('0h')
    expect(formatDuration(0, 'min')).toBe('0m')
  })
  it('rounds to the nearest minute', () => {
    expect(formatDuration(7.26, 'h')).toBe('7h 16m') // 435.6 -> 436 min
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/duration.test.ts`
Expected: FAIL — "Failed to resolve import './duration'" / `formatDuration is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/duration.ts
/**
 * Render a duration stored in its declared base unit as human text.
 *   formatDuration(7.5, 'h')  -> "7h 30m"
 *   formatDuration(35, 'min') -> "35m"
 * unit 'h' treats the value as decimal hours; anything else as minutes.
 */
export function formatDuration(value: number, unit: string): string {
  const totalMin = Math.round(unit === 'h' ? value * 60 : value)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0 && m === 0) return unit === 'h' ? '0h' : '0m'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/duration.test.ts`
Expected: PASS (6 passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duration.ts src/lib/duration.test.ts
git commit -m "feat: formatDuration (h/m split for duration fields)"
```

---

## Task 2: Unrounded avg + StatRow display formatting

`computeStats` currently rounds `avgPerDay`, which would force `7.5h` to display as `8h`. Move the rounding to the view: count pages round, duration pages format. Both files change in one commit so the displayed value is never a raw float.

**Files:**
- Modify: `src/lib/metrics.ts:54-59`
- Modify: `src/lib/metrics.test.ts`
- Modify: `src/blocks/StatRow.tsx`

- [ ] **Step 1: Update the metrics test to expect an unrounded average**

In `src/lib/metrics.test.ts`, replace the `computes avg/day and goal-hit %` test with this and add a second case proving non-integer averages survive:

```ts
  it('computes avg/day and goal-hit % over logged days', () => {
    const days = {
      '2026-06-10': day([e(100)]),
      '2026-06-11': day([e(50)]),
    }
    const s = computeStats(days, metric, target)
    expect(s.daysLogged).toBe(2)
    expect(s.avgPerDay).toBe(75)
    expect(s.goalHitPct).toBe(50)
  })
  it('returns avgPerDay unrounded so the view can format it', () => {
    const days = {
      '2026-06-10': day([e(100)]),
      '2026-06-11': day([e(51)]),
    }
    expect(computeStats(days, metric, target).avgPerDay).toBe(75.5)
  })
```

- [ ] **Step 2: Run test to verify the new case fails**

Run: `npx vitest run src/lib/metrics.test.ts`
Expected: FAIL — `avgPerDay` is `76` (rounded), expected `75.5`.

- [ ] **Step 3: Remove the rounding in `computeStats`**

In `src/lib/metrics.ts`, replace the `avgPerDay` block:

```ts
  const avgPerDay =
    daysLogged === 0
      ? 0
      : logged.reduce((s, [, d]) => s + aggregate(d.entries, metric), 0) / daysLogged
```

(`Stats.avgPerDay` stays `number` in `types.ts` — no type change.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Move rounding/formatting into StatRow**

In `src/blocks/StatRow.tsx`, add the import:

```ts
import { formatDuration } from '../lib/duration'
```

Replace the block from `const unit = ...` through the `cells` array with:

```ts
  const primaryField = def.fields.find((f) => f.key === def.primaryMetric.field)
  const unit = primaryField?.unit ?? ''
  const unitSingular = singularize(unit)
  const isDuration = primaryField?.type === 'duration'

  const avgRounded = Math.round(stats.avgPerDay)
  const avgValue = isDuration
    ? formatDuration(stats.avgPerDay, unit || 'h')
    : String(avgRounded)
  const avgUnit = isDuration ? '' : avgRounded === 1 ? unitSingular : unit

  const cells: Stat[] = [
    { label: 'Current Streak', value: String(stats.currentStreak), unit: stats.currentStreak === 1 ? 'day' : 'days', accent: stats.currentStreak > 0 },
    { label: 'Best Streak', value: String(stats.bestStreak), unit: stats.bestStreak === 1 ? 'day' : 'days' },
    { label: 'Average / Day', value: avgValue, unit: avgUnit },
    { label: 'Goal Hit', value: `${stats.goalHitPct}%`, unit: 'of days' },
  ]
```

- [ ] **Step 6: Verify pullups display is unchanged**

Run: `npm run typecheck` (expect clean) then `npm run dev`. Open `/pullups`: "Average / Day" still shows a whole number + `reps` exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts src/blocks/StatRow.tsx
git commit -m "feat: unrounded avg in computeStats; StatRow rounds/formats at display"
```

---

## Task 3: Add `dailyRecord` to the block union

**Files:**
- Modify: `src/types.ts:32-37`

- [ ] **Step 1: Extend `BlockDef`**

In `src/types.ts`, replace the `BlockDef` union with:

```ts
export type BlockDef =
  | { type: 'hero'; metric?: Metric }
  | { type: 'entryLog'; fields?: string[] }
  | { type: 'dailyRecord' }
  | { type: 'statRow'; metric?: Metric }
  | { type: 'heatmap'; metric?: Metric }
  | { type: 'trend'; metric: Metric }
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add dailyRecord block type to the schema"
```

---

## Task 4: Additive builtin merge on load

Migration seeds builtins once, so an existing v2 store never gains new builtin pages. Merge missing builtins additively on load — preserve every existing page, its data, and the user's order; only append what's new.

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/storage.test.ts
import { describe, it, expect } from 'vitest'
import { mergeMissingBuiltins } from './storage'
import { BUILTIN_DEFS, BUILTIN_ORDER } from '../registry/builtins'
import type { StorageV2 } from '../types'

describe('mergeMissingBuiltins', () => {
  it('appends builtins missing from an existing store', () => {
    const store: StorageV2 = {
      version: 2,
      pages: { pullups: { def: BUILTIN_DEFS.pullups, data: { days: {} } } },
      order: ['pullups'],
    }
    const { store: merged, added } = mergeMissingBuiltins(store)
    expect(added).toBe(true)
    for (const id of BUILTIN_ORDER) expect(merged.pages[id]).toBeDefined()
    expect(merged.order[0]).toBe('pullups') // existing order preserved, new ids appended
    expect(merged.order).toEqual(expect.arrayContaining(BUILTIN_ORDER))
  })

  it('preserves existing page data and never overwrites an existing def', () => {
    const customDef = { ...BUILTIN_DEFS.pullups, name: 'My Pullups' }
    const store: StorageV2 = {
      version: 2,
      pages: {
        pullups: { def: customDef, data: { days: { '2026-06-01': { entries: [{ id: 'a', at: '', fields: { reps: 10 } }] } } } },
      },
      order: ['pullups'],
    }
    const { store: merged } = mergeMissingBuiltins(store)
    expect(merged.pages.pullups.def.name).toBe('My Pullups')
    expect(merged.pages.pullups.data.days['2026-06-01'].entries).toHaveLength(1)
  })

  it('is a no-op when every builtin is already present', () => {
    const pages = Object.fromEntries(
      BUILTIN_ORDER.map((id) => [id, { def: BUILTIN_DEFS[id], data: { days: {} } }])
    )
    const store: StorageV2 = { version: 2, pages, order: [...BUILTIN_ORDER] }
    const { store: merged, added } = mergeMissingBuiltins(store)
    expect(added).toBe(false)
    expect(merged).toBe(store)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `mergeMissingBuiltins is not a function`.

- [ ] **Step 3: Implement `mergeMissingBuiltins` and wire it into `loadStorage`**

In `src/lib/storage.ts`, add this exported function (after `isValidV2`):

```ts
/**
 * Append any builtin pages missing from `store` (e.g. pages added in a later
 * release). Preserves every existing page, its data, and the user's order —
 * only adds what's new, never overwrites an existing def. Returns the same
 * object reference when nothing is missing.
 */
export function mergeMissingBuiltins(store: StorageV2): { store: StorageV2; added: boolean } {
  const missing = BUILTIN_ORDER.filter((id) => !(id in store.pages))
  if (missing.length === 0) return { store, added: false }

  const pages = { ...store.pages }
  for (const id of missing) pages[id] = { def: BUILTIN_DEFS[id], data: { days: {} } }
  const order = [...store.order, ...missing.filter((id) => !store.order.includes(id))]
  return { store: { ...store, pages, order }, added: true }
}
```

Then update `loadStorage` so both the v2 and migration branches merge:

```ts
export function loadStorage(): StorageV2 {
  try {
    const rawV2 = localStorage.getItem(KEY_V2)
    if (rawV2) {
      const parsed = JSON.parse(rawV2)
      if (isValidV2(parsed)) {
        const { store, added } = mergeMissingBuiltins(parsed)
        if (added) flushStorage(store)
        return store
      }
    }
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const parsed = JSON.parse(rawV1)
      if (isValidV1(parsed)) {
        const migrated = mergeMissingBuiltins(migrateV1toV2(parsed)).store
        flushStorage(migrated) // persist immediately so the migration is durable
        return migrated
      }
    }
    return emptyStorage()
  } catch {
    return emptyStorage()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Full test + typecheck**

Run: `npm run test && npm run typecheck`
Expected: all pass, clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: additively merge new builtin pages into an existing store"
```

---

## Task 5: `RatingDots` component

**Files:**
- Create: `src/components/RatingDots.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/RatingDots.tsx
import { cn } from '../lib/cn'

type Props = {
  value: number
  scale: number
  /** Provide to make the dots clickable; omit for read-only display. */
  onChange?: (value: number) => void
  className?: string
}

/**
 * A row of `scale` dots, filled up to `value`. Echoes the 6px accent dot used in
 * block headers. Interactive when `onChange` is supplied, read-only otherwise.
 */
export function RatingDots({ value, scale, onChange, className }: Props) {
  const dots = Array.from({ length: scale }, (_, i) => i + 1)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {dots.map((n) => {
        const filled = n <= value
        const dot = (
          <span
            className={cn(
              'inline-block w-[11px] h-[11px] rounded-full transition-colors duration-[var(--motion-fast)]',
              filled ? 'bg-[var(--accent-1)]' : 'bg-white/[0.12]'
            )}
            style={
              filled
                ? { boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }
                : undefined
            }
          />
        )
        if (!onChange) return <span key={n}>{dot}</span>
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={`${n} / ${scale}`}
            className="p-1 -m-1 rounded-full hover:scale-110 transition-transform duration-[var(--motion-fast)] cursor-pointer"
          >
            {dot}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean. (Unused-export is fine — it's consumed in Tasks 11–12.)

- [ ] **Step 3: Commit**

```bash
git add src/components/RatingDots.tsx
git commit -m "feat: RatingDots widget (accent-dot rating, display + interactive)"
```

---

## Task 6: `DurationInput` component

**Files:**
- Create: `src/components/DurationInput.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/DurationInput.tsx
import { cn } from '../lib/cn'

type Props = {
  /** Value in the field's base unit: 'h' = decimal hours, anything else = minutes. */
  value: number
  unit: string
  step?: number
  onChange: (value: number) => void
  className?: string
}

const BOX =
  'iz-mono text-[14px] w-16 px-3 py-2 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] focus:border-[var(--border-active)] focus:outline-none tabular-nums'

/** Duration entry. unit 'h' renders two boxes [h][m]; otherwise a single [unit] box. */
export function DurationInput({ value, unit, step = 1, onChange, className }: Props) {
  if (unit === 'h') {
    const totalMin = Math.round(value * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <input
          type="number"
          min={0}
          value={h}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value))) + m / 60)}
          className={BOX}
        />
        <span className="iz-label">h</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={m}
          onChange={(e) => onChange(h + Math.min(59, Math.max(0, Math.floor(Number(e.target.value)))) / 60)}
          className={BOX}
        />
        <span className="iz-label">m</span>
      </div>
    )
  }
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className={BOX}
      />
      <span className="iz-label">{unit}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/DurationInput.tsx
git commit -m "feat: DurationInput ([h][m] for hours, single box for minutes)"
```

---

## Task 7: Render secondary fields in `EntryList`

`EntryList` is hardwired to the primary field. Extend it to also capture and show every *other* field in the page def (Reading's `minutes`). The primary keeps its `+/−` stepper; pullups/water (single-field defs) are unaffected.

**Files:**
- Modify: `src/blocks/EntryList.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/blocks/EntryList.tsx`, add:

```ts
import { formatDuration } from '../lib/duration'
import { DurationInput } from '../components/DurationInput'
import type { FieldValue } from '../types'
```

(The file already imports `Entry, FieldDef` from `../types` — extend that import to include `FieldValue`, or add the line above.)

- [ ] **Step 2a: Add the secondary-input form state (with the other hooks)**

Hooks must run before the `if (!def || !primary) return null` guard. Right after the existing `const [value, setValue] = useState<number>(...)` line, add:

```ts
  const [extra, setExtra] = useState<Record<string, number>>({})
```

- [ ] **Step 2b: Derive secondary fields after the null-guard**

After the existing `const pk = primary.key` line (where `def` is narrowed to defined), add:

```ts
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
```

- [ ] **Step 3: Write the secondary values on add**

Replace `handleAdd` with:

```ts
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
```

- [ ] **Step 4: Show secondary values in each row**

In the row markup, the time cell currently is:

```tsx
                <span className="iz-mono text-[11px] text-[var(--text-muted)]">
                  {formatTime(entry.at)}
                </span>
```

Replace it with (adds the secondary text before the time):

```tsx
                <span className="iz-mono text-[11px] text-[var(--text-muted)] truncate">
                  {[secondaryText(entry), formatTime(entry.at)].filter(Boolean).join('  ·  ')}
                </span>
```

- [ ] **Step 5: Add secondary inputs to the add form**

In the `<form onSubmit={handleAdd} ...>`, immediately after the primary `<span className="iz-label">{unit}</span>` line (and before the submit `<button>`), insert:

```tsx
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
```

- [ ] **Step 6: Verify pullups/water unchanged**

Run: `npm run typecheck` (clean), then `npm run dev`. On `/pullups` and `/water` the log looks and behaves exactly as before (no extra inputs, since those defs have a single field).

- [ ] **Step 7: Commit**

```bash
git add src/blocks/EntryList.tsx
git commit -m "feat: EntryList captures + displays secondary fields (multi-field log)"
```

---

## Task 8: Reading page (ships the additive path)

**Files:**
- Create: `src/registry/reading.ts`
- Modify: `src/registry/builtins.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Reading def**

```ts
// src/registry/reading.ts
import type { PageDef } from '../types'

export const READING_DEF: PageDef = {
  schemaVersion: 1,
  id: 'reading',
  name: 'Reading',
  emoji: '📖',
  fields: [
    { key: 'pages', type: 'count', label: 'Pages', unit: 'pages', step: 1, default: 20 },
    { key: 'minutes', type: 'duration', label: 'Minutes', unit: 'min' },
  ],
  primaryMetric: { field: 'pages', agg: 'sum' },
  target: { kind: 'atLeast', value: 30 },
  blocks: [
    { type: 'hero' },
    { type: 'entryLog' },
    { type: 'statRow' },
    { type: 'heatmap' },
    { type: 'trend', metric: { field: 'pages', agg: 'sum' } },
  ],
}
```

- [ ] **Step 2: Register it**

Replace `src/registry/builtins.ts` with:

```ts
import type { PageDef } from '../types'
import { PULLUPS_DEF } from './pullups'
import { WATER_DEF } from './water'
import { READING_DEF } from './reading'

export const BUILTIN_DEFS: Record<string, PageDef> = {
  pullups: PULLUPS_DEF,
  water: WATER_DEF,
  reading: READING_DEF,
}
export const BUILTIN_ORDER = ['pullups', 'water', 'reading']
```

- [ ] **Step 3: Route `/reading` to the renderer**

In `src/App.tsx`, replace the `/reading` route:

```tsx
                <Route path="/reading" element={<PageRenderer pageId="reading" />} />
```

(Leave the `/sleep` `ComingSoon` route in place — Sleep lands in Task 13.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test` (clean, all pass), then `npm run dev`:
- Reading appears in the sidebar; pullups/water data is intact (merge step worked).
- Log a session: `20` pages + `35` minutes → row reads `20 pages · 35m · <time>`.
- `+/−` bumps pages; the hero shows pages summed toward `/ 30`.

- [ ] **Step 5: Commit**

```bash
git add src/registry/reading.ts src/registry/builtins.ts src/App.tsx
git commit -m "feat: Reading page (pages + minutes, additive sessions)"
```

---

## Task 9: HeroCounter — duration + range-aware subline

Make the hero format duration primaries and speak the range target. Guarded so count/`atLeast` pages (pullups, water, reading) are unchanged.

**Files:**
- Modify: `src/blocks/HeroCounter.tsx`

- [ ] **Step 1: Add the import**

```ts
import { formatDuration } from '../lib/duration'
```

- [ ] **Step 2: Compute formatted values and a range-aware subline**

Replace the block from `const target = def.target` through the `subline` definition with:

```ts
  const target = def.target
  const primaryField = def.fields.find((f) => f.key === def.primaryMetric.field)
  const unit = primaryField?.unit ?? ''
  const isDuration = primaryField?.type === 'duration'
  const fmt = (n: number) => (isDuration ? formatDuration(n, unit || 'h') : `${Math.round(n)} ${unit}`.trim())

  const total = aggregate(day.entries, def.primaryMetric)
  const pct = progressPct(total, target)
  const hit = isGoalHit(total, target, day.entries.length > 0)
  const goalValue = target.kind === 'range' ? target.max : target.value
  const goalLabel = target.kind === 'range' ? `${target.value}–${target.max}${isDuration ? 'h' : ` ${unit}`}` : fmt(goalValue)
  const time = lastTime(day.entries)
  const count = day.entries.length

  let subline: string
  if (target.kind === 'range') {
    if (hit) subline = `In range ✓ · ${count} ${count === 1 ? 'entry' : 'entries'}${time ? ` · ${time}` : ''}`
    else if (total < target.value) subline = `${fmt(target.value - total)} under · aim for ${goalLabel}`
    else subline = `${fmt(total - target.max)} over · aim for ${goalLabel}`
  } else if (hit) {
    subline = `Goal hit · ${fmt(total - goalValue)} over`
  } else {
    subline = `${fmt(Math.max(0, goalValue - total))} to go · ${count} ${count === 1 ? 'entry' : 'entries'} logged${time ? ` · ${time}` : ''}`
  }
```

- [ ] **Step 3: Format the big number, the `/goal`, and the eyebrow goal**

Replace the eyebrow goal span:

```tsx
        <span className="iz-label ml-auto">Goal · {goalLabel}/day</span>
```

Pass a `format` to the hero `AnimatedNumber` and format the `/ goal` text:

```tsx
        <AnimatedNumber
          value={total}
          flash={false}
          format={isDuration ? (n) => formatDuration(n, unit || 'h') : undefined}
          className="iz-display text-6xl sm:text-7xl leading-none tabular-nums"
          style={hit ? gradientStyleHit : gradientStyle}
        />
        <span className="iz-display text-3xl text-[var(--text-muted)] leading-none tabular-nums">
          / {goalLabel}
        </span>
```

- [ ] **Step 4: Verify count pages unchanged**

Run: `npm run typecheck` (clean), `npm run dev`. `/pullups`, `/water`, `/reading` hero + subline read exactly as before ("X to go", "Goal hit · N over", "Goal · N unit/day").

- [ ] **Step 5: Commit**

```bash
git add src/blocks/HeroCounter.tsx
git commit -m "feat: HeroCounter formats duration + speaks range targets"
```

---

## Task 10: Duration labels in heatmap + trend

**Files:**
- Modify: `src/blocks/ActivityHeatmap.tsx`
- Modify: `src/blocks/TrendChart.tsx`

- [ ] **Step 1: Heatmap tooltip**

In `src/blocks/ActivityHeatmap.tsx`, add the import:

```ts
import { formatDuration } from '../lib/duration'
```

Inside `renderCell`, replace the `title=` expression. Find:

```tsx
        title={`${cell.key} · ${value} ${unit} · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
```

Replace with (format duration values; leave the existing `unit` lookup as-is above it):

```tsx
        title={`${cell.key} · ${
          def?.fields.find((f) => f.key === metric?.field)?.type === 'duration'
            ? formatDuration(value, unit || 'h')
            : `${value} ${unit}`
        } · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
```

- [ ] **Step 2: Trend unit label**

In `src/blocks/TrendChart.tsx`, the eyebrow shows `last {DAYS} days · {unit}`. For a duration metric `unit` is `min`/`h`; that label is fine as-is (it labels the axis, not a value), so **no change needed**. Confirm by reading the file; do not edit if `unit` only appears in the header label.

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: clean. (Visual check happens in Task 13 once Sleep exists.)

- [ ] **Step 4: Commit**

```bash
git add src/blocks/ActivityHeatmap.tsx
git commit -m "feat: format duration values in the heatmap tooltip"
```

---

## Task 11: `DailyRecord` block (Sleep's logger)

One record per day: an editable form when empty/editing, a clean display when set. Create-or-replace a single entry. Usable both as a page block (own panel) and inside the `DayDrawer` (`bare`).

**Files:**
- Create: `src/blocks/DailyRecord.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/blocks/DailyRecord.tsx
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
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/DailyRecord.tsx
git commit -m "feat: DailyRecord block (one editable sleep record per day)"
```

---

## Task 12: Wire the logger seam (PageRenderer + DayDrawer)

**Files:**
- Modify: `src/blocks/PageRenderer.tsx`
- Modify: `src/components/DayDrawer.tsx`

- [ ] **Step 1: Render the `dailyRecord` block in PageRenderer**

In `src/blocks/PageRenderer.tsx`, add the import:

```ts
import { DailyRecord } from './DailyRecord'
```

After the `entryLog` line:

```tsx
      {has('entryLog') && <EntryLog pageId={pageId} />}
      {has('dailyRecord') && <DailyRecord pageId={pageId} />}
```

- [ ] **Step 2: Pick the logger in DayDrawer**

In `src/components/DayDrawer.tsx`, add the import:

```ts
import { DailyRecord } from '../blocks/DailyRecord'
```

Add a flag near the other derived values (after `const def = ...`):

```ts
  const isDailyRecord = def?.blocks.some((b) => b.type === 'dailyRecord') ?? false
```

Replace the logger mount:

```tsx
            <div className="mt-6">
              {displayDate &&
                (isDailyRecord ? (
                  <DailyRecord pageId={pageId} date={displayDate} bare />
                ) : (
                  <EntryList pageId={pageId} date={displayDate} />
                ))}
            </div>
```

- [ ] **Step 3: Verify count pages still log retroactively**

Run: `npm run typecheck` (clean), `npm run dev`. On `/pullups`, open the heatmap drawer for a past day → still the `EntryList` add form.

- [ ] **Step 4: Commit**

```bash
git add src/blocks/PageRenderer.tsx src/components/DayDrawer.tsx
git commit -m "feat: resolve the per-page logger (entryLog vs dailyRecord)"
```

---

## Task 13: Sleep page (ships the daily-record path)

**Files:**
- Create: `src/registry/sleep.ts`
- Modify: `src/registry/builtins.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Sleep def**

```ts
// src/registry/sleep.ts
import type { PageDef } from '../types'

export const SLEEP_DEF: PageDef = {
  schemaVersion: 1,
  id: 'sleep',
  name: 'Sleep',
  emoji: '🌙',
  fields: [
    { key: 'hours', type: 'duration', label: 'Hours', unit: 'h', step: 0.5 },
    { key: 'quality', type: 'rating', label: 'Quality', scale: 5 },
  ],
  primaryMetric: { field: 'hours', agg: 'sum' },
  target: { kind: 'range', value: 7, max: 9 },
  blocks: [
    { type: 'hero' },
    { type: 'dailyRecord' },
    { type: 'statRow' },
    { type: 'heatmap' },
    { type: 'trend', metric: { field: 'hours', agg: 'sum' } },
  ],
}
```

- [ ] **Step 2: Register it (final order pullups, water, sleep, reading)**

Replace `src/registry/builtins.ts` with:

```ts
import type { PageDef } from '../types'
import { PULLUPS_DEF } from './pullups'
import { WATER_DEF } from './water'
import { SLEEP_DEF } from './sleep'
import { READING_DEF } from './reading'

export const BUILTIN_DEFS: Record<string, PageDef> = {
  pullups: PULLUPS_DEF,
  water: WATER_DEF,
  sleep: SLEEP_DEF,
  reading: READING_DEF,
}
export const BUILTIN_ORDER = ['pullups', 'water', 'sleep', 'reading']
```

- [ ] **Step 3: Route `/sleep` to the renderer**

In `src/App.tsx`, replace the `/sleep` route:

```tsx
                <Route path="/sleep" element={<PageRenderer pageId="sleep" />} />
```

- [ ] **Step 4: Verify the full Sleep flow**

Run: `npm run typecheck && npm run test` (clean, all pass), then `npm run dev`:
- Sleep appears in the sidebar (merge added it); pullups/water/reading data intact.
- Empty state shows the form: hours `[7][30]` + quality dots; "Save night".
- Save → hero reads `7h 30m / 7–9h`, subline "In range ✓", record shows `7h 30m` + filled dots, with Edit/Clear.
- Edit changes the value; the hero count-up + pop animates to the new duration.
- Heatmap: click a past day → DayDrawer shows the `DailyRecord` form (not the count log); saving fills that day's cell; tooltip reads e.g. `8h`.
- StatRow "Average / Day" shows a duration (e.g. `7h 45m`).

- [ ] **Step 5: Commit**

```bash
git add src/registry/sleep.ts src/registry/builtins.ts src/App.tsx
git commit -m "feat: Sleep page (hours + quality, one record per night, range 7-9h)"
```

---

## Task 14: Remove the `ComingSoon` stub

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/ComingSoon.tsx`

- [ ] **Step 1: Remove the import and any leftover usage**

In `src/App.tsx`, delete the line:

```tsx
import { ComingSoon } from './components/ComingSoon'
```

Confirm no `<ComingSoon` remains: `grep -rn "ComingSoon" src` should return nothing after deletion.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/ComingSoon.tsx
```

- [ ] **Step 3: Final verification**

Run: `npm run typecheck && npm run test && npm run build`
Expected: typecheck clean, all tests pass, production build succeeds.

Run `npm run dev` and click through all four pages: pullups, water, sleep, reading — each renders, logs, and persists across reload.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "chore: remove ComingSoon stub (sleep + reading now real pages)"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** Reading def (Task 8) ✓; Sleep def (Task 13) ✓; `formatDuration` (Task 1) ✓; `DurationInput`/`RatingDots` (Tasks 6/5) ✓; EntryList secondary fields (Task 7) ✓; DailyRecord (Task 11) ✓; HeroCounter duration+range (Task 9) ✓; StatRow duration avg (Task 2) ✓; heatmap/trend formatting (Task 10) ✓; logger seam (Task 12) ✓; storage additive merge (Task 4) ✓; types (Task 3) ✓; routing/registry/cleanup (Tasks 8/13/14) ✓.
- **Deviation from spec (intentional):** the `entryLog` block's optional `fields?: string[]` is *not* threaded through; `EntryList` derives secondary fields directly from `def.fields` (every non-primary field). Simpler, and Reading wants all its fields shown. The `fields?` option stays in the type for future use.
- **Deviation from spec (intentional):** `EntryLog.tsx` is left untouched — it is legitimately the renderer for the `entryLog` block, so it keeps importing `EntryList`. Only `DayDrawer` needed the logger conditional. PageRenderer gained the `dailyRecord` branch.
- **Known limitation (documented in spec, not a bug):** the heatmap intensity ladder is `value / max`, so a 9h night is the darkest cell for Sleep. Range-aware coloring is out of scope for v1.
- **Order wart (harmless):** for an *existing* store, the merge appends new builtins in discovery order, so the persisted `order` may read `pullups, water, reading, sleep` even though `BUILTIN_ORDER` is `pullups, water, sleep, reading`. The sidebar is hardcoded and unaffected; this only matters if the sidebar later becomes order-driven.
