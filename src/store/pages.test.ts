import { describe, it, expect } from 'vitest'
import { usePages } from './pages'
import { BUILTIN_ORDER } from '../registry/builtins'
import type { StorageV2 } from '../types'

// A backup exported before sleep/reading existed: only pullups, with data.
function oldBackup(): string {
  const store: StorageV2 = {
    version: 2,
    pages: {
      pullups: {
        def: {
          schemaVersion: 1,
          id: 'pullups',
          templateId: 'builtin:pullups',
          version: 1,
          name: 'Pullup Challenge',
          fields: [{ key: 'reps', type: 'count', label: 'Reps', unit: 'reps' }],
          primaryMetric: { field: 'reps', agg: 'sum' },
          target: { kind: 'atLeast', value: 100 },
          blocks: [{ type: 'hero' }],
        },
        data: { days: { '2026-06-01': { entries: [{ id: 'a', at: '', fields: { reps: 50 } }] } } },
      },
    },
    order: ['pullups'],
    dismissed: [],
  }
  return JSON.stringify(store)
}

describe('importData', () => {
  it('returns false for malformed or non-v2 JSON (so the UI can report it)', () => {
    expect(usePages.getState().importData('not json at all')).toBe(false)
    expect(usePages.getState().importData('{"version":1,"challenges":{}}')).toBe(false)
    // version 2 but missing the `order` array — the exact silent-failure case
    expect(usePages.getState().importData('{"version":2,"pages":{}}')).toBe(false)
  })

  it('merges missing builtin pages from an older backup, preserving its data', () => {
    const ok = usePages.getState().importData(oldBackup())
    expect(ok).toBe(true)

    const pages = usePages.getState().data.pages
    // the imported page and its data survive
    expect(pages.pullups.data.days['2026-06-01'].entries).toHaveLength(1)
    // builtins absent from the backup (sleep, reading) are merged back in,
    // so their sidebar links don't render a blank page
    for (const id of BUILTIN_ORDER) expect(pages[id]).toBeDefined()
  })
})
