import type { PageDef } from '../types'

export const SLEEP_DEF: PageDef = {
  schemaVersion: 1,
  id: 'sleep',
  templateId: 'builtin:sleep',
  version: 1,
  name: 'Sleep',
  emoji: '🌙',
  iconPath: 'M13 9.2A5.2 5.2 0 1 1 6.8 3 4.1 4.1 0 0 0 13 9.2Z',
  fields: [
    { key: 'hours', type: 'duration', label: 'Hours', unit: 'h', step: 0.5 },
    { key: 'quality', type: 'rating', label: 'Quality', scale: 5 },
  ],
  primaryMetric: { field: 'hours', agg: 'sum' },
  target: { kind: 'range', value: 7, max: 9 },
  blocks: [
    { type: 'hero' },
    { type: 'dailyRecord' },
    { type: 'statRow' },
    { type: 'heatmap' },
    { type: 'trend', metric: { field: 'hours', agg: 'sum' } },
  ],
}
