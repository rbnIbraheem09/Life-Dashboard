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
    dismissed: [],
  }
}
