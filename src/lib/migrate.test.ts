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
