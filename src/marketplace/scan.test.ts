import { describe, it, expect } from 'vitest'
import { scanPage } from './scan'
import { BUNDLED_CATALOG } from './catalog'

const goodPage = {
  kind: 'life-dashboard/page',
  format: 1,
  def: {
    schemaVersion: 1,
    templateId: 'tmpl-x',
    version: 1,
    name: 'Test',
    fields: [{ key: 'n', type: 'count', label: 'N', unit: 'n', step: 1 }],
    primaryMetric: { field: 'n', agg: 'sum' },
    target: { kind: 'atLeast', value: 1 },
    blocks: [{ type: 'hero' }, { type: 'entryLog' }],
  },
}

describe('scanPage', () => {
  it('marks a clean valid file as safe and installable', () => {
    const r = scanPage(goodPage)
    expect(r.valid).toBe(true)
    expect(r.verdict).toBe('safe')
    expect(r.def?.name).toBe('Test')
    expect(r.findings.some((f) => f.level === 'warn')).toBe(false)
  })

  it('blocks an invalid file (install disabled)', () => {
    const bad = { kind: 'life-dashboard/page', format: 1, def: { schemaVersion: 1, name: '' } }
    const r = scanPage(bad)
    expect(r.valid).toBe(false)
    expect(r.verdict).toBe('blocked')
    expect(r.def).toBeUndefined()
  })

  it('blocks a wrong-kind file', () => {
    const r = scanPage({ kind: 'evil/thing', format: 1, def: goodPage.def })
    expect(r.verdict).toBe('blocked')
  })

  it('flags script-like text as review but still valid', () => {
    const sneaky = { ...goodPage, def: { ...goodPage.def, name: '<script>alert(1)</script>' } }
    const r = scanPage(sneaky)
    expect(r.valid).toBe(true)
    expect(r.verdict).toBe('review')
    expect(r.findings.some((f) => f.level === 'warn' && /web-style/i.test(f.label))).toBe(true)
  })

  it('flags an icon path with unexpected characters', () => {
    const r = scanPage({ ...goodPage, def: { ...goodPage.def, iconPath: 'M2 2 <bad>' } })
    expect(r.verdict).toBe('review')
    expect(r.findings.some((f) => /icon path/i.test(f.label))).toBe(true)
  })

  it('notes a link as info (not a warning)', () => {
    const r = scanPage({ ...goodPage, def: { ...goodPage.def, name: 'See https://example.com' } })
    expect(r.valid).toBe(true)
    expect(r.findings.some((f) => f.level === 'info' && /link/i.test(f.label))).toBe(true)
  })

  it('reports extra def keys as ignored info', () => {
    const r = scanPage({ ...goodPage, def: { ...goodPage.def, evilHook: 'rm -rf' } })
    expect(r.findings.some((f) => f.level === 'info' && /extra fields/i.test(f.label))).toBe(true)
  })

  it('handles non-serializable input without throwing', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const r = scanPage(circular)
    expect(r.verdict).toBe('blocked')
  })
})

describe('bundled catalog', () => {
  it('every bundled page is valid and scans safe', () => {
    for (const entry of BUNDLED_CATALOG) {
      const r = scanPage(entry.page)
      expect(r.valid, `${entry.id} should be valid`).toBe(true)
      expect(r.verdict, `${entry.id} should be safe`).toBe('safe')
    }
  })

  it('has unique ids and templateIds', () => {
    const ids = BUNDLED_CATALOG.map((e) => e.id)
    const tmpls = BUNDLED_CATALOG.map((e) => scanPage(e.page).def?.templateId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(tmpls).size).toBe(tmpls.length)
  })
})
