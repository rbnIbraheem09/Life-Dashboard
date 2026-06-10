import { create } from 'zustand'
import type { ChallengeId, DayEntry, PullupSet, Storage } from '../types'
import {
  emptyStorage,
  loadStorage,
  saveStorage,
  flushStorage,
} from '../lib/storage'

type DashboardState = {
  data: Storage
  addSet: (challengeId: ChallengeId, date: string, reps: number) => void
  updateSet: (
    challengeId: ChallengeId,
    date: string,
    setId: string,
    reps: number
  ) => void
  deleteSet: (challengeId: ChallengeId, date: string, setId: string) => void
  exportJSON: () => string
  importJSON: (json: string) => void
  resetAll: () => void
}

/** Recompute the denormalized totals on a day entry. */
function recomputeDay(entry: DayEntry, goalPerDay: number): DayEntry {
  const totalReps = entry.sets.reduce((sum, s) => sum + s.reps, 0)
  return { ...entry, totalReps, goalHit: totalReps >= goalPerDay }
}

/** Produce the next Storage by mutating one day immutably, then persist it. */
function commit(
  state: DashboardState,
  challengeId: ChallengeId,
  date: string,
  mutate: (entry: DayEntry) => DayEntry
): { data: Storage } {
  const challenge = state.data.challenges[challengeId]
  const existing: DayEntry =
    challenge.days[date] ?? { date, sets: [], totalReps: 0, goalHit: false }

  const next = recomputeDay(mutate(existing), challenge.goalPerDay)

  // Drop a day with no sets so empty entries don't linger in storage.
  const days = { ...challenge.days }
  if (next.sets.length === 0) {
    delete days[date]
  } else {
    days[date] = next
  }

  const startedAt =
    challenge.startedAt ??
    (next.sets.length > 0 ? next.sets[0].loggedAt : null)

  const data: Storage = {
    ...state.data,
    challenges: {
      ...state.data.challenges,
      [challengeId]: { ...challenge, days, startedAt },
    },
  }

  saveStorage(data)
  return { data }
}

export const useDashboard = create<DashboardState>((set, get) => ({
  data: loadStorage(),

  addSet: (challengeId, date, reps) =>
    set((state) =>
      commit(state, challengeId, date, (entry) => {
        const newSet: PullupSet = {
          id: crypto.randomUUID(),
          reps,
          loggedAt: new Date().toISOString(),
        }
        return { ...entry, sets: [...entry.sets, newSet] }
      })
    ),

  updateSet: (challengeId, date, setId, reps) =>
    set((state) =>
      commit(state, challengeId, date, (entry) => ({
        ...entry,
        // reps <= 0 removes the set entirely
        sets:
          reps <= 0
            ? entry.sets.filter((s) => s.id !== setId)
            : entry.sets.map((s) => (s.id === setId ? { ...s, reps } : s)),
      }))
    ),

  deleteSet: (challengeId, date, setId) =>
    set((state) =>
      commit(state, challengeId, date, (entry) => ({
        ...entry,
        sets: entry.sets.filter((s) => s.id !== setId),
      }))
    ),

  exportJSON: () => JSON.stringify(get().data, null, 2),

  importJSON: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (parsed?.version === 1 && typeof parsed.challenges === 'object') {
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
