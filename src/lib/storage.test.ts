// src/lib/storage.test.ts
import { describe, it, expect } from 'vitest'
import { mergeMissingBuiltins } from './storage'
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
