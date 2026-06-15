import type { PageDef } from '../types'

export const PULLUPS_DEF: PageDef = {
  schemaVersion: 1,
  id: 'pullups',
  templateId: 'builtin:pullups',
  version: 1,
  name: 'Pullup Challenge',
  emoji: '💪',
  iconPath: 'M2 3.5h12 M5 3.5v3 M11 3.5v3 M6.6 8a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0 M8 9.4v3.1M8 11l-2 1.5M8 11l2 1.5',
  fields: [{ key: 'reps', type: 'count', label: 'Reps', unit: 'reps', step: 1, default: 10 }],
  primaryMetric: { field: 'reps', agg: 'sum' },
  target: { kind: 'atLeast', value: 100 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'statRow' }, { type: 'heatmap' }],
}
