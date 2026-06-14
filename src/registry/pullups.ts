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
