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

describe('dayValue', () => {
  it('returns 0 for undefined day', () => {
    expect(dayValue(undefined, { field: 'reps', agg: 'sum' })).toBe(0)
  })
  it('aggregates a defined day', () => {
    expect(dayValue({ entries: [e(10), e(5)] }, { field: 'reps', agg: 'sum' })).toBe(15)
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
  it('returns avgPerDay unrounded so the view can format it', () => {
    const days = {
      '2026-06-10': day([e(100)]),
      '2026-06-11': day([e(51)]),
    }
    expect(computeStats(days, metric, target).avgPerDay).toBe(75.5)
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
