// src/lib/storage.test.ts
import { describe, it, expect } from 'vitest'
import { mergeMissingBuiltins, normalizeStore } from './storage'
import { BUILTIN_DEFS, BUILTIN_ORDER } from '../registry/builtins'
import type { StorageV2 } from '../types'

describe('mergeMissingBuiltins', () => {
  it('appends builtins missing from an existing store', () => {
    const store: StorageV2 = {
      version: 2,
      pages: { pullups: { def: BUILTIN_DEFS.pullups, data: { days: {} } } },
      order: ['pullups'],
      dismissed: [],
    }
    const { store: merged, added } = mergeMissingBuiltins(store)
    expect(added).toBe(true)
    for (const id of BUILTIN_ORDER) expect(merged.pages[id]).toBeDefined()
    expect(merged.order[0]).toBe('pullups') // existing order preserved, new ids appended
    expect(merged.order).toEqual(expect.arrayContaining(BUILTIN_ORDER))
  })

  it('preserves existing page data and never overwrites an existing def', () => {
    const customDef = { ...BUILTIN_DEFS.pullups, name: 'My Pullups' }
    const store: StorageV2 = {
      version: 2,
      pages: {
        pullups: { def: customDef, data: { days: { '2026-06-01': { entries: [{ id: 'a', at: '', fields: { reps: 10 } }] } } } },
      },
      order: ['pullups'],
      dismissed: [],
    }
    const { store: merged } = mergeMissingBuiltins(store)
    expect(merged.pages.pullups.def.name).toBe('My Pullups')
    expect(merged.pages.pullups.data.days['2026-06-01'].entries).toHaveLength(1)
  })

  it('is a no-op when every builtin is already present', () => {
    const pages = Object.fromEntries(
      BUILTIN_ORDER.map((id) => [id, { def: BUILTIN_DEFS[id], data: { days: {} } }])
    )
    const store: StorageV2 = { version: 2, pages, order: [...BUILTIN_ORDER], dismissed: [] }
    const { store: merged, added } = mergeMissingBuiltins(store)
    expect(added).toBe(false)
    expect(merged).toBe(store)
  })
})

describe('normalizeStore', () => {
  it('backfills templateId/version on a builtin page missing them', () => {
    const store = {
      version: 2 as const,
      pages: { pullups: { def: { ...BUILTIN_DEFS.pullups, templateId: undefined, version: undefined } as never, data: { days: {} } } },
      order: ['pullups'],
      dismissed: [],
    }
    const { store: out, changed } = normalizeStore(store)
    expect(changed).toBe(true)
    expect(out.pages.pullups.def.templateId).toBe('builtin:pullups')
    expect(out.pages.pullups.def.version).toBe(1)
  })

  it('adds a dismissed array when missing', () => {
    const store = { version: 2 as const, pages: {}, order: [] } as never
    const { store: out } = normalizeStore(store)
    expect(Array.isArray(out.dismissed)).toBe(true)
  })

  it('does not resurrect a dismissed builtin', () => {
    const store = {
      version: 2 as const,
      pages: { pullups: { def: BUILTIN_DEFS.pullups, data: { days: {} } } },
      order: ['pullups'],
      dismissed: ['water'],
    }
    const { store: out } = normalizeStore(store)
    expect(out.pages.water).toBeUndefined()
  })

  it('is unchanged for an already-normal store', () => {
    const { store: normal } = normalizeStore({
      version: 2, pages: {}, order: [], dismissed: [],
    } as never)
    const again = normalizeStore(normal)
    expect(again.changed).toBe(false)
    expect(again.store).toBe(normal)
  })
})
