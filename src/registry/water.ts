import type { PageDef } from '../types'

export const WATER_DEF: PageDef = {
  schemaVersion: 1,
  id: 'water',
  templateId: 'builtin:water',
  version: 1,
  name: 'Water',
  emoji: '💧',
  fields: [{ key: 'glasses', type: 'count', label: 'Glasses', unit: 'glasses', step: 1, default: 1 }],
  primaryMetric: { field: 'glasses', agg: 'sum' },
  target: { kind: 'atLeast', value: 8 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'statRow' }, { type: 'heatmap' }],
}
