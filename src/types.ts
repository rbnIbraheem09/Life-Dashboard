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
