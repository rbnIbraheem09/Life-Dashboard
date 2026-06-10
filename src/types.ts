// ── Persisted schema (localStorage key: "life-dashboard:v1") ──
// Mirrors IMPLEMENTATION_PLAN.md §4 verbatim.

export type Storage = {
  version: 1
  challenges: {
    pullups: ChallengeData
  }
}

export type ChallengeData = {
  goalPerDay: number // 100 for pullups
  startedAt: string | null // ISO date of the first logged set ever (null until first set)
  days: Record<string, DayEntry> // key = "YYYY-MM-DD"
}

export type DayEntry = {
  date: string // "YYYY-MM-DD"
  sets: PullupSet[]
  totalReps: number // sum of sets[].reps — denormalized for fast heatmap reads
  goalHit: boolean // totalReps >= goalPerDay
}

export type PullupSet = {
  id: string // crypto.randomUUID()
  reps: number // 1..N
  loggedAt: string // ISO timestamp
  note?: string // optional, future-proofed
}

export type ChallengeId = 'pullups'

// ── Derived (computed at render, never stored) ──
export type Stats = {
  currentStreak: number
  bestStreak: number
  avgPerDay: number
  goalHitPct: number
}
