# Page-Schema Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Life-Dashboard from a hardcoded pullup tracker into a data-driven page engine: pages are `PageDef` JSON objects rendered through a block library, the existing pullup page is migrated onto it losslessly, and a second page (Water) proves genericity.

**Architecture:** A closed schema (6 field types × 6 aggregations) lives in `types.ts`. Pure logic (`lib/metrics.ts`, `lib/migrate.ts`) computes metrics/stats and migrates v1→v2 storage. A generic Zustand store (`store/pages.ts`) does entry CRUD. Five blocks (`blocks/*`) — four extracted from the frozen pullup cards, one new — bind to the schema and are composed by `PageRenderer`. A motion layer (`motion/*`, framer-motion) gives shared spring number-bumps + liquid list reflow.

**Tech Stack:** Vite 5 + React 18 + TypeScript, Tailwind v3, Zustand 4, date-fns 3, **framer-motion (new)**, **vitest (new, dev)**.

**Spec:** `docs/superpowers/specs/2026-06-14-page-schema-spine-design.md`

**Hard rules from the design (do not drift):**
- Visual parity: extracted blocks must render **pixel-identically** to today's pullup page. Preserve every className/markup string from the source components; change only data bindings.
- No new hardcoded colors; only `var(--*)`, `color-mix()`, `bg-white/[0.0X]` (CLAUDE.md rule #1–2).
- Three fonts only (`iz-display`/`iz-mono` classes + body). No new ones.
- Motion changes opacity/transform only — never introduces a new background/blur value.
- **framer-motion re-anchor gotcha:** never wrap an element that *contains* a `position:fixed` descendant (e.g. `DayDrawer`) in a `motion` element with `layout`. Keep `layout` scoped to `EntryList`'s `<li>` items only.
- `prefers-reduced-motion` collapses all springs to instant.

---

## File Structure (decomposition)

**New files**
- `src/lib/metrics.ts` — aggregation + goal + stats engine (pure).
- `src/lib/migrate.ts` — v1→v2 migration (pure).
- `src/store/pages.ts` — generic entry-CRUD store (`usePages`).
- `src/registry/pullups.ts`, `src/registry/water.ts`, `src/registry/builtins.ts` — built-in `PageDef`s.
- `src/motion/springs.ts`, `src/motion/AnimatedNumber.tsx`, `src/motion/AnimatedBar.tsx`.
- `src/blocks/EntryList.tsx` — shared entry list + add form (used by EntryLog block AND DayDrawer).
- `src/blocks/EntryLog.tsx`, `src/blocks/HeroCounter.tsx`, `src/blocks/StatRow.tsx`, `src/blocks/ActivityHeatmap.tsx`, `src/blocks/TrendChart.tsx`, `src/blocks/PageRenderer.tsx`.
- `src/lib/metrics.test.ts`, `src/lib/migrate.test.ts` — vitest unit tests.
- `vitest.config.ts`.

**Modified**
- `src/types.ts`, `src/lib/storage.ts`, `src/lib/date.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/DayDrawer.tsx`, `package.json`.

**Removed (logic absorbed)**
- `src/store/dashboard.ts` → `src/store/pages.ts`.
- `src/components/HeroChallengeCard.tsx`, `TodaysSetsCard.tsx`, `StatsCard.tsx`, `ActivityGrid.tsx` → `src/blocks/*`.
- `src/pages/PullupPage.tsx` → replaced by routing to `<PageRenderer pageId="pullups" />`.
- `ComingSoon` usage for `/water` (component kept for `/sleep`,`/reading`).

---

## Phase 0 — Tooling & types (commit: `chore`)

### Task 1: Add dependencies + test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install deps**

Run:
```bash
npm install framer-motion@^11
npm install -D vitest@^2 jsdom@^25
```
Expected: both added to `package.json`; no peer-dep errors.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```
(Pure logic only — `node` env, no jsdom needed for metrics/migrate. `jsdom` is installed for any future component tests.)

- [ ] **Step 4: Verify the runner boots**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (tests come in later tasks).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add framer-motion + vitest for the page-schema spine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Define the v2 schema types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Replace the file contents**

Keep the v1 types at the bottom (the migration reads them), add the v2 types on top:

```ts
// ── v2 data-driven schema ──────────────────────────────────────────────

export type FieldType = 'count' | 'number' | 'duration' | 'rating' | 'bool' | 'text'
export type Aggregation = 'sum' | 'avg' | 'last' | 'max' | 'min' | 'count'
export type FieldValue = number | boolean | string

export type FieldDef = {
  key: string            // stable id used in Entry.fields, e.g. "reps"
  type: FieldType
  label: string          // "Reps"
  unit?: string          // "reps", "glasses"
  step?: number          // count/number stepper increment (default 1)
  scale?: number         // rating only: max value
  default?: number | boolean // prefilled value in the add form
}

export type Metric = { field: string; agg: Aggregation }

export type Target =
  | { kind: 'atLeast'; value: number }
  | { kind: 'atMost'; value: number }
  | { kind: 'range'; value: number; max: number }

export type Entry = {
  id: string             // crypto.randomUUID()
  at: string             // ISO timestamp
  fields: Record<string, FieldValue>
}

export type DayData = { entries: Entry[] } // totals are derived, never stored

export type BlockDef =
  | { type: 'hero'; metric?: Metric }
  | { type: 'entryLog'; fields?: string[] }
  | { type: 'statRow'; metric?: Metric }
  | { type: 'heatmap'; metric?: Metric }
  | { type: 'trend'; metric: Metric }

export type PageDef = {
  schemaVersion: 1       // PageDef format version (for future export compat)
  id: string
  name: string
  emoji?: string
  fields: FieldDef[]
  primaryMetric: Metric
  target: Target
  blocks: BlockDef[]
}

export type PageState = { def: PageDef; data: { days: Record<string, DayData> } }

export type StorageV2 = {
  version: 2
  pages: Record<string, PageState>
  order: string[]        // page id order (sidebar)
}

export type Stats = {
  currentStreak: number
  bestStreak: number
  avgPerDay: number
  goalHitPct: number
  daysLogged: number
}

// ── v1 schema (LEGACY — read only by lib/migrate.ts) ───────────────────

export type V1PullupSet = { id: string; reps: number; loggedAt: string; note?: string }
export type V1DayEntry = { date: string; sets: V1PullupSet[]; totalReps: number; goalHit: boolean }
export type V1ChallengeData = { goalPerDay: number; startedAt: string | null; days: Record<string, V1DayEntry> }
export type V1Storage = { version: 1; challenges: { pullups: V1ChallengeData } }
```

> NOTE: the old `Stats` type previously here is replaced by the v2 `Stats` above (adds `daysLogged`). The old `ChallengeData`/`DayEntry`/`PullupSet`/`ChallengeId` names are renamed to the `V1*` forms; later tasks delete their consumers.

- [ ] **Step 2: Type-check (expected to fail loudly — that's the worklist)**

Run: `npx tsc --noEmit`
Expected: FAIL — errors in `store/dashboard.ts`, `lib/date.ts`, and the four card components referencing the renamed v1 types. These are resolved as those files are replaced in later tasks. Do **not** fix them here.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "chore: add v2 data-driven page schema types (v1 kept for migration)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 1 — Data engine (commit: `feat`, TDD)

### Task 3: Built-in page registry

**Files:**
- Create: `src/registry/pullups.ts`, `src/registry/water.ts`, `src/registry/builtins.ts`

- [ ] **Step 1: `src/registry/pullups.ts`**

```ts
import type { PageDef } from '../types'

export const PULLUPS_DEF: PageDef = {
  schemaVersion: 1,
  id: 'pullups',
  name: 'Pullup Challenge',
  emoji: '💪',
  fields: [{ key: 'reps', type: 'count', label: 'Reps', unit: 'reps', step: 1, default: 10 }],
  primaryMetric: { field: 'reps', agg: 'sum' },
  target: { kind: 'atLeast', value: 100 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'statRow' }, { type: 'heatmap' }],
}
```

- [ ] **Step 2: `src/registry/water.ts`**

```ts
import type { PageDef } from '../types'

export const WATER_DEF: PageDef = {
  schemaVersion: 1,
  id: 'water',
  name: 'Water',
  emoji: '💧',
  fields: [{ key: 'glasses', type: 'count', label: 'Glasses', unit: 'glasses', step: 1, default: 1 }],
  primaryMetric: { field: 'glasses', agg: 'sum' },
  target: { kind: 'atLeast', value: 8 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'statRow' }, { type: 'heatmap' }],
}
```

- [ ] **Step 3: `src/registry/builtins.ts`**

```ts
import type { PageDef } from '../types'
import { PULLUPS_DEF } from './pullups'
import { WATER_DEF } from './water'

export const BUILTIN_DEFS: Record<string, PageDef> = {
  pullups: PULLUPS_DEF,
  water: WATER_DEF,
}
export const BUILTIN_ORDER = ['pullups', 'water']
```

- [ ] **Step 4: Type-check the new files compile**

Run: `npx tsc --noEmit`
Expected: still the pre-existing v1-consumer errors from Task 2, but **no new** errors from `src/registry/*`.

- [ ] **Step 5: Commit**

```bash
git add src/registry
git commit -m "feat: built-in page definitions (pullups, water)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Metrics & stats engine (TDD)

**Files:**
- Create: `src/lib/metrics.ts`
- Test: `src/lib/metrics.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { aggregate, dayValue, isGoalHit, progressPct, computeStats } from './metrics'
import type { Entry, DayData } from '../types'

const e = (reps: number, at = '2026-06-14T10:00:00.000Z'): Entry => ({
  id: crypto.randomUUID(), at, fields: { reps },
})

describe('aggregate', () => {
  it('sums a numeric field', () => {
    expect(aggregate([e(10), e(8)], { field: 'reps', agg: 'sum' })).toBe(18)
  })
  it('averages', () => {
    expect(aggregate([e(10), e(20)], { field: 'reps', agg: 'avg' })).toBe(15)
  })
  it('takes last / max / min', () => {
    const xs = [e(3), e(9), e(5)]
    expect(aggregate(xs, { field: 'reps', agg: 'last' })).toBe(5)
    expect(aggregate(xs, { field: 'reps', agg: 'max' })).toBe(9)
    expect(aggregate(xs, { field: 'reps', agg: 'min' })).toBe(3)
  })
  it('count is entry-count regardless of field', () => {
    expect(aggregate([e(10), e(8)], { field: 'reps', agg: 'count' })).toBe(2)
  })
  it('coerces booleans to 0/1 for sum', () => {
    const b: Entry[] = [{ id: '1', at: '', fields: { done: true } }, { id: '2', at: '', fields: { done: false } }]
    expect(aggregate(b, { field: 'done', agg: 'sum' })).toBe(1)
  })
  it('returns 0 for an empty list', () => {
    expect(aggregate([], { field: 'reps', agg: 'sum' })).toBe(0)
  })
})

describe('isGoalHit', () => {
  it('atLeast', () => {
    expect(isGoalHit(100, { kind: 'atLeast', value: 100 }, true)).toBe(true)
    expect(isGoalHit(99, { kind: 'atLeast', value: 100 }, true)).toBe(false)
  })
  it('atMost requires at least one entry', () => {
    expect(isGoalHit(3, { kind: 'atMost', value: 5 }, true)).toBe(true)
    expect(isGoalHit(0, { kind: 'atMost', value: 5 }, false)).toBe(false)
  })
  it('range', () => {
    const t = { kind: 'range', value: 7, max: 9 } as const
    expect(isGoalHit(8, t, true)).toBe(true)
    expect(isGoalHit(6, t, true)).toBe(false)
    expect(isGoalHit(10, t, true)).toBe(false)
  })
})

describe('progressPct', () => {
  it('clamps atLeast to 0..1', () => {
    expect(progressPct(50, { kind: 'atLeast', value: 100 })).toBe(0.5)
    expect(progressPct(150, { kind: 'atLeast', value: 100 })).toBe(1)
  })
})

describe('computeStats', () => {
  const metric = { field: 'reps', agg: 'sum' } as const
  const target = { kind: 'atLeast', value: 100 } as const
  const day = (entries: Entry[]): DayData => ({ entries })

  it('is zeroed with no data', () => {
    expect(computeStats({}, metric, target)).toEqual({
      currentStreak: 0, bestStreak: 0, avgPerDay: 0, goalHitPct: 0, daysLogged: 0,
    })
  })
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
  it('finds the best consecutive streak', () => {
    const days = {
      '2026-06-01': day([e(100)]),
      '2026-06-02': day([e(100)]),
      '2026-06-03': day([e(100)]),
      '2026-06-05': day([e(100)]),
    }
    expect(computeStats(days, metric, target).bestStreak).toBe(3)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/metrics.test.ts`
Expected: FAIL — `metrics.ts` does not exist / exports undefined.

- [ ] **Step 3: Implement `src/lib/metrics.ts`**

```ts
import type { Aggregation, DayData, Entry, Metric, Stats, Target } from '../types'
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/metrics.test.ts`
Expected: PASS (all cases). The streak-back-from-today cases use fixed past dates, so they don't depend on the run date.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "feat: generic metrics + stats engine with tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: v1→v2 migration (TDD)

**Files:**
- Create: `src/lib/migrate.ts`
- Test: `src/lib/migrate.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/migrate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { migrateV1toV2 } from './migrate'
import type { V1Storage } from '../types'

const v1: V1Storage = {
  version: 1,
  challenges: {
    pullups: {
      goalPerDay: 120, // intentionally non-default to prove it carries over
      startedAt: '2026-06-10T09:00:00.000Z',
      days: {
        '2026-06-10': {
          date: '2026-06-10',
          sets: [
            { id: 'a', reps: 10, loggedAt: '2026-06-10T09:00:00.000Z' },
            { id: 'b', reps: 8, loggedAt: '2026-06-10T09:30:00.000Z' },
          ],
          totalReps: 18,
          goalHit: false,
        },
      },
    },
  },
}

describe('migrateV1toV2', () => {
  it('produces a v2 store with pullups + water and order', () => {
    const out = migrateV1toV2(v1)
    expect(out.version).toBe(2)
    expect(out.order).toEqual(['pullups', 'water'])
    expect(Object.keys(out.pages)).toEqual(['pullups', 'water'])
  })
  it('carries the user goal into the target (non-lossy)', () => {
    expect(migrateV1toV2(v1).pages.pullups.def.target).toEqual({ kind: 'atLeast', value: 120 })
  })
  it('maps each set to an entry with a reps field', () => {
    const day = migrateV1toV2(v1).pages.pullups.data.days['2026-06-10']
    expect(day.entries).toHaveLength(2)
    expect(day.entries[0]).toEqual({ id: 'a', at: '2026-06-10T09:00:00.000Z', fields: { reps: 10 } })
  })
  it('seeds water empty', () => {
    expect(migrateV1toV2(v1).pages.water.data.days).toEqual({})
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/migrate.test.ts`
Expected: FAIL — `migrate.ts` missing.

- [ ] **Step 3: Implement `src/lib/migrate.ts`**

```ts
import type { Entry, PageState, StorageV2, V1Storage } from '../types'
import { PULLUPS_DEF } from '../registry/pullups'
import { WATER_DEF } from '../registry/water'

export function migrateV1toV2(v1: V1Storage): StorageV2 {
  const src = v1.challenges.pullups

  const days: PageState['data']['days'] = {}
  for (const [key, day] of Object.entries(src.days)) {
    days[key] = {
      entries: day.sets.map((s): Entry => ({ id: s.id, at: s.loggedAt, fields: { reps: s.reps } })),
    }
  }

  const pullupsDef = { ...PULLUPS_DEF, target: { kind: 'atLeast' as const, value: src.goalPerDay } }

  return {
    version: 2,
    pages: {
      pullups: { def: pullupsDef, data: { days } },
      water: { def: WATER_DEF, data: { days: {} } },
    },
    order: ['pullups', 'water'],
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/migrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrate.ts src/lib/migrate.test.ts
git commit -m "feat: lossless v1->v2 storage migration with tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Storage v2 (load / migrate / validate / save)

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Replace `src/lib/storage.ts`**

```ts
import type { StorageV2, V1Storage } from '../types'
import { BUILTIN_DEFS, BUILTIN_ORDER } from '../registry/builtins'
import { migrateV1toV2 } from './migrate'

const KEY_V1 = 'life-dashboard:v1'   // legacy — read once for migration, then left as backup
const KEY_V2 = 'life-dashboard:v2'
const WRITE_DEBOUNCE_MS = 300

/** Fresh empty v2 store: built-in pages with no data. */
export function emptyStorage(): StorageV2 {
  const pages: StorageV2['pages'] = {}
  for (const id of BUILTIN_ORDER) {
    pages[id] = { def: BUILTIN_DEFS[id], data: { days: {} } }
  }
  return { version: 2, pages, order: [...BUILTIN_ORDER] }
}

export function isValidV2(data: unknown): data is StorageV2 {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { version?: unknown }).version === 2 &&
    typeof (data as { pages?: unknown }).pages === 'object' &&
    Array.isArray((data as { order?: unknown }).order)
  )
}

function isValidV1(data: unknown): data is V1Storage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { version?: unknown }).version === 1 &&
    typeof (data as { challenges?: unknown }).challenges === 'object'
  )
}

/**
 * Load order:
 *   1. valid v2 at KEY_V2  → use it
 *   2. valid v1 at KEY_V1  → migrate → persist v2 (KEY_V1 left intact as backup)
 *   3. otherwise           → empty v2
 */
export function loadStorage(): StorageV2 {
  try {
    const rawV2 = localStorage.getItem(KEY_V2)
    if (rawV2) {
      const parsed = JSON.parse(rawV2)
      if (isValidV2(parsed)) return parsed
    }
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const parsed = JSON.parse(rawV1)
      if (isValidV1(parsed)) {
        const migrated = migrateV1toV2(parsed)
        flushStorage(migrated) // persist immediately so the migration is durable
        return migrated
      }
    }
    return emptyStorage()
  } catch {
    return emptyStorage()
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

/** Debounced write so rapid [+] clicks don't thrash storage. */
export function saveStorage(data: StorageV2): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY_V2, JSON.stringify(data))
    } catch {
      // localStorage full/unavailable — single-user local app, silent ignore
    }
    timer = null
  }, WRITE_DEBOUNCE_MS)
}

/** Immediate, un-debounced flush (migration / import / reset). */
export function flushStorage(data: StorageV2): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(data))
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `storage.ts` is clean; remaining errors are still only in `dashboard.ts` + the four cards + `date.ts` (handled next).

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: v2 storage with one-time v1 migration (v1 key kept as backup)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Generic store + trim legacy stats from date.ts

**Files:**
- Create: `src/store/pages.ts`
- Modify: `src/lib/date.ts`

- [ ] **Step 1: Trim `src/lib/date.ts` to generic helpers**

Remove the pullup-specific `getStats`, `getStreak`, `getBestStreak` (their generic replacements live in `metrics.ts`). Keep `dateKey`, `todayKey`, `getYearDays`, `GridCell`. Delete the now-unused imports (`ChallengeData`, `DayEntry`, `Stats`, `getDay`) — keep only what `getYearDays` uses (`format`, `startOfYear`, `endOfYear`, `eachDayOfInterval`, `getDay`). Final imports:
```ts
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'
```
(No type imports remain.) Leave `dateKey`, `todayKey`, `GridCell`, `getYearDays` bodies exactly as they are.

- [ ] **Step 2: Create `src/store/pages.ts`**

```ts
import { create } from 'zustand'
import type { Entry, FieldValue, StorageV2 } from '../types'
import { emptyStorage, flushStorage, isValidV2, loadStorage, saveStorage } from '../lib/storage'

type PagesState = {
  data: StorageV2
  addEntry: (pageId: string, date: string, fields: Record<string, FieldValue>) => void
  updateEntry: (pageId: string, date: string, entryId: string, fields: Record<string, FieldValue>) => void
  deleteEntry: (pageId: string, date: string, entryId: string) => void
  exportData: () => string
  importData: (json: string) => void
  resetAll: () => void
}

/** Replace one day's data immutably, dropping the day if it ends up empty, then persist. */
function commitDay(
  state: PagesState,
  pageId: string,
  date: string,
  mutate: (entries: Entry[]) => Entry[]
): { data: StorageV2 } {
  const page = state.data.pages[pageId]
  if (!page) return { data: state.data }

  const current = page.data.days[date]?.entries ?? []
  const nextEntries = mutate(current)

  const days = { ...page.data.days }
  if (nextEntries.length === 0) delete days[date]
  else days[date] = { entries: nextEntries }

  const data: StorageV2 = {
    ...state.data,
    pages: { ...state.data.pages, [pageId]: { ...page, data: { days } } },
  }
  saveStorage(data)
  return { data }
}

export const usePages = create<PagesState>((set, get) => ({
  data: loadStorage(),

  addEntry: (pageId, date, fields) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) => [
        ...entries,
        { id: crypto.randomUUID(), at: new Date().toISOString(), fields },
      ])
    ),

  updateEntry: (pageId, date, entryId, fields) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) =>
        entries.map((e) => (e.id === entryId ? { ...e, fields: { ...e.fields, ...fields } } : e))
      )
    ),

  deleteEntry: (pageId, date, entryId) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) => entries.filter((e) => e.id !== entryId))
    ),

  exportData: () => JSON.stringify(get().data, null, 2),

  importData: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (isValidV2(parsed)) {
        flushStorage(parsed)
        set({ data: parsed })
      }
    } catch {
      // ignore malformed import
    }
  },

  resetAll: () => {
    const data = emptyStorage()
    flushStorage(data)
    set({ data })
  },
}))
```

- [ ] **Step 3: Type-check the store + date.ts compile**

Run: `npx tsc --noEmit`
Expected: `pages.ts` and `date.ts` clean. Remaining errors only in `dashboard.ts` and the four cards/DayDrawer (deleted/replaced in Phase 3–4). Do not fix those yet.

- [ ] **Step 4: Commit**

```bash
git add src/store/pages.ts src/lib/date.ts
git commit -m "feat: generic page-data store; move stats out of date.ts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 2 — Motion primitives (commit: `feat`)

### Task 8: Spring presets

**Files:**
- Create: `src/motion/springs.ts`

- [ ] **Step 1: Write it**

```ts
import type { Transition } from 'framer-motion'

/**
 * Starting spring presets. framer-motion's `bounce` + `duration` is the modern
 * equivalent of SwiftUI's response/dampingFraction model. These are STARTING
 * values — final numbers get tuned in the prototype harness (Task 21) and pasted
 * back here. Do not invent new values elsewhere; import from this file.
 */
export const SPRING = {
  smooth: { type: 'spring', bounce: 0, duration: 0.45 } satisfies Transition,    // no overshoot — bars, fades
  snappy: { type: 'spring', bounce: 0.18, duration: 0.4 } satisfies Transition,  // slight pop — number bumps
  bouncy: { type: 'spring', bounce: 0.32, duration: 0.55 } satisfies Transition, // playful — celebratory only
} as const
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/motion/springs.ts
git commit -m "feat: shared spring presets (single source for motion timing)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: AnimatedNumber

**Files:**
- Create: `src/motion/AnimatedNumber.tsx`

- [ ] **Step 1: Write it**

```tsx
import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { SPRING } from './springs'

type Props = {
  value: number
  className?: string
  style?: React.CSSProperties
  /** Maps the live animated number to display text. Defaults to a rounded integer. */
  format?: (n: number) => string
}

/**
 * Springs to `value` on change and renders the in-between numbers without
 * triggering React re-renders (the MotionValue drives the text node directly).
 * Honors prefers-reduced-motion by rendering the value instantly.
 */
export function AnimatedNumber({ value, className, style, format = (n) => String(Math.round(n)) }: Props) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(value)
  const spring = useSpring(mv, SPRING.snappy)
  const text = useTransform(spring, (n) => format(n))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  if (reduce) {
    return <span className={className} style={style}>{format(value)}</span>
  }
  return <motion.span className={className} style={style}>{text}</motion.span>
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/motion/AnimatedNumber.tsx
git commit -m "feat: AnimatedNumber spring primitive (reduced-motion aware)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: AnimatedBar

**Files:**
- Create: `src/motion/AnimatedBar.tsx`

- [ ] **Step 1: Write it**

```tsx
import { motion, useReducedMotion } from 'framer-motion'
import { SPRING } from './springs'

type Props = {
  /** 0..1 fill fraction. */
  pct: number
  className?: string
}

/** A progress fill that springs to its target width. */
export function AnimatedBar({ pct, className }: Props) {
  const reduce = useReducedMotion()
  const width = `${Math.round(Math.min(Math.max(pct, 0), 1) * 100)}%`
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ width }}
      transition={reduce ? { duration: 0 } : SPRING.smooth}
    />
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/motion/AnimatedBar.tsx
git commit -m "feat: AnimatedBar progress primitive

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 3 — Blocks (commit: `feat`)

> **Extraction rule for every block below:** open the named source component and copy its JSX/className strings **verbatim**. Change ONLY the data bindings called out. Do not restyle. After each, eyeball the page (`npm run dev`) against a screenshot of the current pullup page — they must match.

### Task 11: EntryList (shared body for the EntryLog block AND the DayDrawer)

**Files:**
- Create: `src/blocks/EntryList.tsx`
- Source reference: `src/components/TodaysSetsCard.tsx` (lines 102–197 — the list + add form)

This is the de-duplicated heart: the entry list (with framer-motion liquid reflow) + the add form. The EntryLog block and the DayDrawer both render it. For v1 the primary field is a `count`; the +/−/× controls operate on that field, and the per-entry value uses `AnimatedNumber`.

- [ ] **Step 1: Write `src/blocks/EntryList.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { SPRING } from '../motion/springs'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import type { Entry, FieldDef } from '../types'

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

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.floor(value)
    if (!Number.isFinite(n) || n <= 0) return
    addEntry(pageId, day, { [pk]: n })
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
                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-2.5 hover:border-[var(--border-active)] hover:bg-[var(--accent-1)]/[0.03] transition-colors duration-[var(--motion-mid)]"
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
                <span className="iz-mono text-[11px] text-[var(--text-muted)]">
                  {formatTime(entry.at)}
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
                    className="iz-mono text-[13px] w-8 py-1 rounded-md text-[var(--accent-1)] border border-[var(--border-active)] hover:bg-[var(--accent-1)]/[0.08] transition-colors duration-[var(--motion-fast)]"
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EntryList.tsx` clean (legacy errors elsewhere remain).

- [ ] **Step 3: Commit**

```bash
git add src/blocks/EntryList.tsx
git commit -m "feat: EntryList block body with framer-motion liquid reflow + AnimatedNumber

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: EntryLog block (panel wrapper)

**Files:**
- Create: `src/blocks/EntryLog.tsx`
- Source reference: `src/components/TodaysSetsCard.tsx` (lines 83–101 — the panel + eyebrow + total)

- [ ] **Step 1: Write `src/blocks/EntryLog.tsx`**

```tsx
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { aggregate } from '../lib/metrics'
import { EntryList } from './EntryList'

const noEntries = { entries: [] }

export function EntryLog({ pageId }: { pageId: string }) {
  const today = todayKey()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[today] ?? noEntries)
  if (!def) return null

  const total = aggregate(day.entries, def.primaryMetric)
  const count = day.entries.length
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-7 py-6 glow-card">
      <div className="flex items-center gap-2 mb-5">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Today's Log</span>
        <span className="iz-label ml-auto">
          {total} {unit} · {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <EntryList pageId={pageId} focusHotkey />
    </div>
  )
}
```

> Eyebrow text generalized from "Today's Sets" → "Today's Log" (it now serves any tracker). Confirm with user during review if they want to keep "Sets" for pullups specifically; default is the generic label.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EntryLog.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/EntryLog.tsx
git commit -m "feat: EntryLog block (panel wrapper around EntryList)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Generalize DayDrawer to use EntryList

**Files:**
- Modify: `src/components/DayDrawer.tsx`

The drawer keeps its shell (backdrop, slide-in `aside`, heading, Esc-to-close, retain-date-through-animation) but its set list + add form are replaced by `<EntryList pageId={pageId} date={displayDate} />`. It is no longer pullup-specific.

- [ ] **Step 1: Rewrite `src/components/DayDrawer.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { usePages } from '../store/pages'
import { aggregate } from '../lib/metrics'
import { ScrollArea } from './ScrollArea'
import { EntryList } from '../blocks/EntryList'
import { cn } from '../lib/cn'

const noEntries = { entries: [] }

function formatDayHeading(key: string): string {
  try { return format(new Date(`${key}T00:00:00`), 'EEEE, MMMM d') } catch { return key }
}

export function DayDrawer({
  pageId,
  openDate,
  onClose,
}: {
  pageId: string
  openDate: string | null
  onClose: () => void
}) {
  const open = openDate !== null

  // Retain the last opened date through the slide-out so content doesn't blank.
  const [displayDate, setDisplayDate] = useState<string | null>(null)
  useEffect(() => { if (openDate) setDisplayDate(openDate) }, [openDate])

  const key = displayDate ?? ''
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[key] ?? noEntries)
  const total = def ? aggregate(day.entries, def.primaryMetric) : 0
  const count = day.entries.length
  const unit = def?.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col',
          'transition-transform duration-[var(--motion-mid)] ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <ScrollArea className="h-full w-full">
          <div className="p-7">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
                style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
              />
              <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Day Detail</span>
              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                className="iz-mono text-[15px] w-8 h-8 rounded-md ml-auto text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)] cursor-pointer"
              >
                ×
              </button>
            </div>
            <h2 className="iz-display text-2xl text-[var(--text)]">
              {displayDate ? formatDayHeading(displayDate) : ''}
            </h2>
            <p className="iz-mono text-[11px] text-[var(--text-muted)] mt-1">
              {total} {unit} · {count} {count === 1 ? 'entry' : 'entries'}
            </p>
            <div className="mt-6">
              {displayDate && <EntryList pageId={pageId} date={displayDate} />}
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `DayDrawer.tsx` clean. (`ActivityGrid.tsx` still errors — it passes the old props; fixed in Task 16.)

- [ ] **Step 3: Commit**

```bash
git add src/components/DayDrawer.tsx
git commit -m "feat: generalize DayDrawer to any page via EntryList

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: HeroCounter block

**Files:**
- Create: `src/blocks/HeroCounter.tsx`
- Source reference: `src/components/HeroChallengeCard.tsx`

Changes vs source: read value via `aggregate(today.entries, primaryMetric)`; `GOAL` → `target`; "Pullup Challenge" → `def.name`; "reps" → field unit; the big `{total}` becomes `<AnimatedNumber>`; the progress bar inner `<div>` becomes `<AnimatedBar>`; `hit`/`pct`/`remaining` via `isGoalHit`/`progressPct`. Keep the two gradient style objects, the eyebrow, all classNames verbatim.

- [ ] **Step 1: Write `src/blocks/HeroCounter.tsx`**

```tsx
import { format } from 'date-fns'
import { usePages } from '../store/pages'
import { todayKey } from '../lib/date'
import { aggregate, isGoalHit, progressPct } from '../lib/metrics'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import { AnimatedBar } from '../motion/AnimatedBar'
import type { Entry } from '../types'

const noEntries = { entries: [] as Entry[] }

const gradientStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
}
const gradientStyleHit: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-2), var(--accent-3))',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
}

function lastTime(entries: Entry[]): string {
  const last = entries[entries.length - 1]
  if (!last) return ''
  try { return format(new Date(last.at), 'h:mm a') } catch { return '' }
}

export function HeroCounter({ pageId }: { pageId: string }) {
  const today = todayKey()
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const day = usePages((s) => s.data.pages[pageId]?.data.days[today] ?? noEntries)
  if (!def) return null

  const target = def.target
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''
  const total = aggregate(day.entries, def.primaryMetric)
  const pct = progressPct(total, target)
  const hit = isGoalHit(total, target, day.entries.length > 0)
  const goalValue = target.kind === 'range' ? target.max : target.value
  const time = lastTime(day.entries)
  const count = day.entries.length

  const remaining = Math.max(0, goalValue - total)
  const subline = hit
    ? `Goal hit · ${total - goalValue} over`
    : `${remaining} ${unit} to go · ${count} ${count === 1 ? 'entry' : 'entries'} logged${time ? ` · ${time}` : ''}`

  return (
    <div className="iz-panel border border-[var(--border)] rounded-[var(--radius)] px-9 py-8 glow-card">
      <div className="flex items-center gap-2 mb-6">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>{def.name}</span>
        <span className="iz-label ml-auto">Goal · {goalValue} {unit}/day</span>
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <AnimatedNumber
          value={total}
          className="iz-display text-6xl sm:text-7xl leading-none tabular-nums"
          style={hit ? gradientStyleHit : gradientStyle}
        />
        <span className="iz-display text-3xl text-[var(--text-muted)] leading-none tabular-nums">
          / {goalValue}
        </span>
      </div>

      <p className="iz-mono text-[12px] text-[var(--text-dim)] mt-4">{subline}</p>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-[var(--accent-1)]/[0.08] overflow-hidden">
          <AnimatedBar pct={pct} className="h-full rounded-full bg-[var(--accent-1)]" />
        </div>
        <span className="iz-mono text-[11px] text-[var(--text-muted)] tabular-nums w-10 text-right">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + eyeball**

Run: `npx tsc --noEmit` (HeroCounter clean). Visual parity verified at Task 19 once routed.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/HeroCounter.tsx
git commit -m "feat: HeroCounter block (animated number + bar; fixes the hero-doesn't-animate bug)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 15: StatRow block

**Files:**
- Create: `src/blocks/StatRow.tsx`
- Source reference: `src/components/StatsCard.tsx`

Changes vs source: `getStats(challenge)` → `computeStats(days, primaryMetric, target)`; the "reps"/"rep" unit on Average/Day → field unit (singular/plural). Keep `StatCell`, the eyebrow, and the 2×2 grid verbatim.

- [ ] **Step 1: Write `src/blocks/StatRow.tsx`**

```tsx
import { useMemo } from 'react'
import { usePages } from '../store/pages'
import { computeStats } from '../lib/metrics'

type Stat = { label: string; value: string; unit: string; accent?: boolean }

function StatCell({ label, value, unit, accent }: Stat) {
  return (
    <div className="flex flex-col justify-center rounded-[10px] bg-white/[0.02] border border-[var(--border)] px-4 py-4">
      <span className="iz-label block leading-tight">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="iz-display text-3xl tabular-nums" style={{ color: accent ? 'var(--accent-1)' : 'var(--text)' }}>
          {value}
        </span>
        <span className="iz-label">{unit}</span>
      </div>
    </div>
  )
}

const noDays = {}

export function StatRow({ pageId }: { pageId: string }) {
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const days = usePages((s) => s.data.pages[pageId]?.data.days ?? noDays)
  const stats = useMemo(
    () => (def ? computeStats(days, def.primaryMetric, def.target) : null),
    [days, def]
  )
  if (!def || !stats) return null
  const unit = def.fields.find((f) => f.key === def.primaryMetric.field)?.unit ?? ''
  const unitSingular = unit.replace(/s$/, '')

  const cells: Stat[] = [
    { label: 'Current Streak', value: String(stats.currentStreak), unit: stats.currentStreak === 1 ? 'day' : 'days', accent: stats.currentStreak > 0 },
    { label: 'Best Streak', value: String(stats.bestStreak), unit: stats.bestStreak === 1 ? 'day' : 'days' },
    { label: 'Average / Day', value: String(stats.avgPerDay), unit: stats.avgPerDay === 1 ? unitSingular : unit },
    { label: 'Goal Hit', value: `${stats.goalHitPct}%`, unit: 'of days' },
  ]

  return (
    <div className="flex flex-col h-full border border-[var(--border)] rounded-[var(--radius)] iz-panel px-7 py-6 glow-card">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
          style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Stats</span>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-4 mt-4 flex-1">
        {cells.map((c) => <StatCell key={c.label} {...c} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `StatRow.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/StatRow.tsx
git commit -m "feat: StatRow block (generic computeStats)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 16: ActivityHeatmap block

**Files:**
- Create: `src/blocks/ActivityHeatmap.tsx`
- Source reference: `src/components/ActivityGrid.tsx`

Changes vs source: read `days`/`def` via `usePages` by `pageId`; cell value = `dayValue(days[key], primaryMetric)`; `cellLevel(reps, goal)` keeps its ladder but takes the day value + a "goal-ish" denominator (`target.kind==='range' ? target.max : target.value`); the `DayDrawer` now gets `pageId`. Keep ALL grid math (`buildMonth`/`buildYear`/`mondayRow`), `LEVEL_CLASSES`, `CELL`, the eyebrow, pills, legend, and ScrollArea verbatim.

- [ ] **Step 1: Write `src/blocks/ActivityHeatmap.tsx`**

Copy `src/components/ActivityGrid.tsx` verbatim, then apply exactly these edits:

1. Imports — replace the data + type imports:
```tsx
// remove: import { useDashboard } from '../store/dashboard'
// remove: import type { DayEntry } from '../types'
import { usePages } from '../store/pages'
import { dayValue } from '../lib/metrics'
import { DayDrawer } from '../components/DayDrawer'
import type { DayData, Target } from '../types'
```
(Adjust the `dateKey, todayKey` / `cn` / `ScrollArea` import paths to `'../lib/date'`, `'../lib/cn'`, `'../components/ScrollArea'`.)

2. `EMPTY` constant:
```tsx
const EMPTY: Record<string, DayData> = {}
```

3. `cellLevel` denominator stays the same signature; add a target→goal helper near the top:
```tsx
function goalOf(target: Target): number {
  return target.kind === 'range' ? target.max : target.value
}
```

4. Component signature + data:
```tsx
export function ActivityHeatmap({ pageId }: { pageId: string }) {
  const [view, setView] = useState<View>('month')
  const [openDate, setOpenDate] = useState<string | null>(null)
  const def = usePages((s) => s.data.pages[pageId]?.def)
  const days = usePages((s) => s.data.pages[pageId]?.data.days ?? EMPTY)
  const metric = def?.primaryMetric
  const goal = def ? goalOf(def.target) : 1
  // ...rest of the body unchanged...
```

5. Inside `renderCell`, replace the pullup reads:
```tsx
const value = metric ? dayValue(days[cell.key], metric) : 0
const entryCount = days[cell.key]?.entries.length ?? 0
const unit = def?.fields.find((f) => f.key === metric?.field)?.unit ?? ''
// colorClass uses cellLevel(value, goal)
// title: `${cell.key} · ${value} ${unit} · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`
```
(`cellLevel(reps, goal)` → `cellLevel(value, goal)`.)

6. Guard + drawer at the end:
```tsx
  if (!def || !metric) return null
  // ...the returned JSX is identical EXCEPT the final line:
  <DayDrawer pageId={pageId} openDate={openDate} onClose={() => setOpenDate(null)} />
```
> Place the `if (!def || !metric) return null` guard right before the `return (`. The eyebrow label stays "Activity".

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `ActivityHeatmap.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/ActivityHeatmap.tsx
git commit -m "feat: ActivityHeatmap block (generic day value + per-page drawer)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 17: TrendChart block (new)

**Files:**
- Create: `src/blocks/TrendChart.tsx`

A dependency-free inline-SVG area/line of the metric over the last 30 days. (No charting lib — matches the "no icon library" precedent.) framer-motion animates the path draw on mount.

- [ ] **Step 1: Write `src/blocks/TrendChart.tsx`**

```tsx
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
```

> Note: `TrendChart` is built and tested here but is NOT added to any built-in page's `blocks[]` this round (pullups/water use the heatmap). It first ships on Reading/Sleep in sub-project #2. Verify it renders by temporarily adding `{ type: 'trend', metric: { field: 'reps', agg: 'sum' } }` to a local copy of `PULLUPS_DEF`, confirming, then reverting before commit.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `TrendChart.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/TrendChart.tsx
git commit -m "feat: TrendChart block (dependency-free inline-SVG sparkline)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 18: PageRenderer

**Files:**
- Create: `src/blocks/PageRenderer.tsx`

- [ ] **Step 1: Write it** (layout mirrors today's `PullupPage.tsx` exactly)

```tsx
import { usePages } from '../store/pages'
import { HeroCounter } from './HeroCounter'
import { EntryLog } from './EntryLog'
import { StatRow } from './StatRow'
import { ActivityHeatmap } from './ActivityHeatmap'
import { TrendChart } from './TrendChart'
import type { BlockDef } from '../types'

export function PageRenderer({ pageId }: { pageId: string }) {
  const def = usePages((s) => s.data.pages[pageId]?.def)
  if (!def) return null

  const has = (t: BlockDef['type']) => def.blocks.some((b) => b.type === t)
  const trend = def.blocks.find((b): b is Extract<BlockDef, { type: 'trend' }> => b.type === 'trend')

  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-6">
      {has('hero') && <HeroCounter pageId={pageId} />}
      {has('entryLog') && <EntryLog pageId={pageId} />}
      {(has('statRow') || has('heatmap')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {has('statRow') && <StatRow pageId={pageId} />}
          {has('heatmap') && (
            <div className="lg:col-span-2">
              <ActivityHeatmap pageId={pageId} />
            </div>
          )}
        </div>
      )}
      {trend && <TrendChart pageId={pageId} metric={trend.metric} />}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `PageRenderer.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add src/blocks/PageRenderer.tsx
git commit -m "feat: PageRenderer composes blocks from a PageDef

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 4 — Wiring & cleanup (commit: `feat`)

### Task 19: Route through PageRenderer; point Sidebar at usePages; delete legacy

**Files:**
- Modify: `src/App.tsx`, `src/components/Sidebar.tsx`
- Delete: `src/store/dashboard.ts`, `src/pages/PullupPage.tsx`, `src/components/HeroChallengeCard.tsx`, `src/components/TodaysSetsCard.tsx`, `src/components/StatsCard.tsx`, `src/components/ActivityGrid.tsx`

- [ ] **Step 1: `src/App.tsx` — route pullups + water to PageRenderer**

Replace the `PullupPage` import with:
```tsx
import { PageRenderer } from './blocks/PageRenderer'
```
Replace the four challenge routes:
```tsx
<Route path="/pullups" element={<PageRenderer pageId="pullups" />} />
<Route path="/water" element={<PageRenderer pageId="water" />} />
<Route path="/sleep" element={<ComingSoon challenge="sleep" />} />
<Route path="/reading" element={<ComingSoon challenge="reading" />} />
```
(Keep the `/`, `/settings`, and `*` routes as-is. `ComingSoon` import stays for sleep/reading.)

- [ ] **Step 2: `src/components/Sidebar.tsx` — point export/import at usePages**

Change the import:
```tsx
// remove: import { useDashboard } from '../store/dashboard'
import { usePages } from '../store/pages'
```
In `handleExport`:
```tsx
const json = usePages.getState().exportData()
```
In `handleImportFile`, replace the validation + call:
```tsx
const parsed = JSON.parse(text)
if (parsed?.version !== 2 || typeof parsed.pages !== 'object') {
  throw new Error('Unrecognized schema')
}
usePages.getState().importData(text)
```
(Nav list, icons, and layout unchanged.)

- [ ] **Step 3: Delete the legacy files**

```bash
git rm src/store/dashboard.ts src/pages/PullupPage.tsx \
  src/components/HeroChallengeCard.tsx src/components/TodaysSetsCard.tsx \
  src/components/StatsCard.tsx src/components/ActivityGrid.tsx
```

- [ ] **Step 4: Type-check — must be fully clean now**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors. (If any reference to `useDashboard`/`challenges` remains, fix it — grep: `grep -rn "useDashboard\|challenges\.pullups\|store/dashboard" src` should return nothing.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: render pullups + water via PageRenderer; remove legacy cards/store

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 20: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run:
```bash
npx tsc --noEmit && npm run test && npm run build && cargo check --manifest-path src-tauri/Cargo.toml
```
Expected: tsc exit 0; vitest all pass; build exit 0; cargo `Finished`.

- [ ] **Step 2: Migration of real data (manual, critical)**

1. `npm run dev`, open the app (or `npm run tauri dev`).
2. Confirm the pullup page shows your existing data — the `18/100` day, all sets, the streak/heatmap **identical** to before.
3. Open devtools → Application → Local Storage: confirm `life-dashboard:v2` exists AND `life-dashboard:v1` is **still present** (untouched backup).

- [ ] **Step 3: Visual parity (manual)**

Compare the pullup page side-by-side with a pre-change screenshot. Hero, log, stats, heatmap, and DayDrawer must match pixel-for-pixel (only motion differs).

- [ ] **Step 4: Genericity proof — Water (manual)**

1. Go to `/water`. Add glasses; confirm hero/stats/heatmap update with `glasses`/8-goal labeling.
2. Open a heatmap cell → DayDrawer logs retroactively for water.
3. Confirm Water and Pullups data are independent.

- [ ] **Step 5: Motion + a11y (manual)**

1. Add a set: the **hero number** springs (the original screenshot bug — fixed) and the new list item slides in; deleting slides out.
2. macOS System Settings → Accessibility → Display → Reduce Motion ON → reload → numbers/bars update instantly, no springs.

- [ ] **Step 6: Commit (verification notes / any fixups)**

```bash
git add -A
git commit -m "feat: page-schema spine verified (migration, parity, water, motion, a11y)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 5 — Optional

### Task 21 (optional): Motion tuner harness

**Files:**
- Create: `src/pages/MotionLab.tsx`
- Modify: `src/App.tsx` (hidden route `/motion-lab`, not linked in nav)

A dev-only page rendering `AnimatedNumber` + a sample `EntryList` with range inputs bound to `bounce`/`duration`, so the user *feels* the real engine and reports final numbers to paste into `springs.ts`. Honors the user's tune-it-yourself workflow.

- [ ] **Step 1:** Build `MotionLab.tsx` with two sliders (`bounce` 0–0.6, `duration` 0.2–0.9), a `+1`/`−1` button driving an `AnimatedNumber`, and a live readout of the chosen config. Wire `/motion-lab` in `App.tsx` (no Sidebar link).
- [ ] **Step 2:** `npx tsc --noEmit && npm run build` → exit 0.
- [ ] **Step 3:** Commit `chore: motion tuner harness (dev-only /motion-lab)` with the trailer. (Throwaway — fine to delete pre-release, like `aurora-tuner.html`.)

---

## Self-Review (completed against the spec)

- **Spec coverage:** schema (Task 2) · aggregation/stats engine (Task 4) · migration preserving data (Task 5–6) · generic store (Task 7) · 5 blocks + PageRenderer (Tasks 11–18) · motion primitives + the hero-animation fix (Tasks 8–10, 14) · pullups migrated + Water proof (Tasks 19–20) · TrendChart built for #2 (Task 17) · tuner (Task 21). DayDrawer generalization (under-specified in the spec) is covered by Tasks 11+13. ✅
- **Placeholders:** none — every code step is complete; extraction tasks name the exact source file + exact binding edits.
- **Type consistency:** `StorageV2`/`PageState`/`PageDef`/`Entry`/`DayData`/`Metric`/`Target`/`Stats`/`FieldValue` used identically across tasks; store methods `addEntry`/`updateEntry`/`deleteEntry`/`exportData`/`importData` match between Task 7, EntryList (11), Sidebar (19); `aggregate`/`dayValue`/`isGoalHit`/`progressPct`/`computeStats` signatures match between Task 4 and consumers (12,14,15,16,17).
- **Out of scope (guarded):** per-page template export/import, marketplace, insights, Reading/Sleep pages, rich rating/duration inputs, drag-drop layout editor — all deferred to sub-projects #2–#5.
