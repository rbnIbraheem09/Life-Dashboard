import { describe, it, expect } from 'vitest'
import { usePages } from './pages'
import { BUILTIN_ORDER } from '../registry/builtins'
import type { StorageV2, PageDef } from '../types'
import { serializePage } from '../lib/pagefile'

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

describe('deletePage', () => {
  it('removes a page from pages + order, and records a deleted builtin in dismissed', () => {
    // start from a clean known state
    usePages.getState().resetAll()
    expect(usePages.getState().data.pages.water).toBeDefined()

    usePages.getState().deletePage('water')
    const after = usePages.getState().data
    expect(after.pages.water).toBeUndefined()
    expect(after.order).not.toContain('water')
    expect(after.dismissed).toContain('water')
  })
})

const sampleDef: PageDef = {
  schemaVersion: 1, id: 'ignored', templateId: 'tmpl-abc', version: 1,
  name: 'Cold Plunge', emoji: '🧊',
  fields: [{ key: 'mins', type: 'duration', label: 'Minutes', unit: 'min' }],
  primaryMetric: { field: 'mins', agg: 'sum' },
  target: { kind: 'atLeast', value: 3 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }],
}

describe('addPage / findByTemplate / updatePageDef / exportPage', () => {
  it('addPage mints a unique local id from the name and appends to order', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    expect(id).toBe('cold-plunge')
    const data = usePages.getState().data
    expect(data.pages[id]).toBeDefined()
    expect(data.pages[id].def.id).toBe(id)        // local id stamped onto the def
    expect(data.pages[id].def.templateId).toBe('tmpl-abc')
    expect(data.order).toContain(id)
  })

  it('addPage avoids id collisions with a suffix', () => {
    const id2 = usePages.getState().addPage(sampleDef)
    expect(id2).toBe('cold-plunge-2')
  })

  it('findByTemplate locates a page by templateId', () => {
    expect(usePages.getState().findByTemplate('tmpl-abc')).toBeDefined()
    expect(usePages.getState().findByTemplate('nope')).toBeUndefined()
  })

  it('updatePageDef swaps the def but keeps logged data', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    usePages.getState().addEntry(id, '2026-06-01', { mins: 5 })
    usePages.getState().updatePageDef(id, { ...sampleDef, name: 'Ice Bath' })
    const page = usePages.getState().data.pages[id]
    expect(page.def.name).toBe('Ice Bath')
    expect(page.def.id).toBe(id)                  // local id preserved
    expect(page.data.days['2026-06-01'].entries).toHaveLength(1)
  })

  it('exportPage round-trips through serialize (def only, no data)', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    usePages.getState().addEntry(id, '2026-06-01', { mins: 5 })
    const json = usePages.getState().exportPage(id)
    expect(json).toBe(serializePage(usePages.getState().data.pages[id].def))
    expect('data' in JSON.parse(json)).toBe(false)
  })
})
