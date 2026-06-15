import { describe, it, expect } from 'vitest'
import { serializePage, parsePageFile } from './pagefile'
import type { PageDef } from '../types'

const goodDef: PageDef = {
  schemaVersion: 1,
  id: 'pushups',
  templateId: 'tmpl-123',
  version: 2,
  name: 'Pushups',
  emoji: '🤸',
  iconPath: 'M2 8h12',
  fields: [{ key: 'reps', type: 'count', label: 'Reps', unit: 'reps', step: 1 }],
  primaryMetric: { field: 'reps', agg: 'sum' },
  target: { kind: 'atLeast', value: 50 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }, { type: 'trend', metric: { field: 'reps', agg: 'sum' } }],
}

describe('serializePage', () => {
  it('emits a kind/format envelope with the def and NO data', () => {
    const obj = JSON.parse(serializePage(goodDef))
    expect(obj.kind).toBe('life-dashboard/page')
    expect(obj.format).toBe(1)
    expect(obj.def.name).toBe('Pushups')
    expect('data' in obj).toBe(false)
    expect('data' in obj.def).toBe(false)
  })
})

describe('parsePageFile', () => {
  it('round-trips a serialized def', () => {
    const r = parsePageFile(serializePage(goodDef))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.def.name).toBe('Pushups')
      expect(r.def.templateId).toBe('tmpl-123')
      expect(r.def.version).toBe(2)
      expect(r.def.iconPath).toBe('M2 8h12')
    }
  })

  it('rejects non-JSON', () => {
    expect(parsePageFile('{not json').ok).toBe(false)
  })

  it('rejects a wrong kind', () => {
    expect(parsePageFile(JSON.stringify({ kind: 'something/else', format: 1, def: goodDef })).ok).toBe(false)
  })

  it('rejects an unsupported format', () => {
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 99, def: goodDef })).ok).toBe(false)
  })

  it('rejects a bad field type', () => {
    const bad = { ...goodDef, fields: [{ key: 'x', type: 'bogus', label: 'X' }] }
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: bad })).ok).toBe(false)
  })

  it('rejects an invalid primaryMetric (field not in fields)', () => {
    const bad = { ...goodDef, primaryMetric: { field: 'nope', agg: 'sum' } }
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: bad })).ok).toBe(false)
  })

  it('rejects an invalid target', () => {
    const bad = { ...goodDef, target: { kind: 'weird' } }
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: bad })).ok).toBe(false)
  })

  it('rejects an unknown block type', () => {
    const bad = { ...goodDef, blocks: [{ type: 'mystery' }] }
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: bad })).ok).toBe(false)
  })

  it('rejects a trend block with no metric', () => {
    const bad = { ...goodDef, blocks: [{ type: 'trend' }] }
    expect(parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: bad })).ok).toBe(false)
  })

  it('mints a templateId and defaults version when absent', () => {
    const minimal = {
      schemaVersion: 1, name: 'Mini',
      fields: [{ key: 'n', type: 'count', label: 'N' }],
      primaryMetric: { field: 'n', agg: 'sum' },
      target: { kind: 'atLeast', value: 1 },
      blocks: [{ type: 'hero' }],
    }
    const r = parsePageFile(JSON.stringify({ kind: 'life-dashboard/page', format: 1, def: minimal }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(typeof r.def.templateId).toBe('string')
      expect(r.def.templateId.length).toBeGreaterThan(0)
      expect(r.def.version).toBe(1)
    }
  })
})
