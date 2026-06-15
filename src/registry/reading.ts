import type { PageDef } from '../types'

export const READING_DEF: PageDef = {
  schemaVersion: 1,
  id: 'reading',
  templateId: 'builtin:reading',
  version: 1,
  name: 'Reading',
  emoji: '📖',
  iconPath: 'M8 4.2C6.8 3.3 5.2 3 3.5 3.2v8c1.7-.2 3.3.1 4.5 1 1.2-.9 2.8-1.2 4.5-1v-8C10.8 3 9.2 3.3 8 4.2Z M8 4.2v8.8',
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
