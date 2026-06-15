import type { PageDef } from '../types'

export const READING_DEF: PageDef = {
  schemaVersion: 1,
  id: 'reading',
  templateId: 'builtin:reading',
  version: 1,
  name: 'Reading',
  emoji: '📖',
  fields: [
    { key: 'pages', type: 'count', label: 'Pages', unit: 'pages', step: 1, default: 20 },
    { key: 'minutes', type: 'duration', label: 'Minutes', unit: 'min' },
  ],
  primaryMetric: { field: 'pages', agg: 'sum' },
  target: { kind: 'atLeast', value: 30 },
  blocks: [
    { type: 'hero' },
    { type: 'entryLog' },
    { type: 'statRow' },
    { type: 'heatmap' },
    { type: 'trend', metric: { field: 'pages', agg: 'sum' } },
  ],
}
