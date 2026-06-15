import type { PageDef } from '../types'

export const WATER_DEF: PageDef = {
  schemaVersion: 1,
  id: 'water',
  templateId: 'builtin:water',
  version: 1,
  name: 'Water',
  emoji: '💧',
  iconPath: 'M8 2s4 4.6 4 7.3A4 4 0 0 1 8 13.3a4 4 0 0 1-4-4C4 6.6 8 2 8 2Z',
  fields: [{ key: 'glasses', type: 'count', label: 'Glasses', unit: 'glasses', step: 1, default: 1 }],
  primaryMetric: { field: 'glasses', agg: 'sum' },
  target: { kind: 'atLeast', value: 8 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'statRow' }, { type: 'heatmap' }],
}
