import type { PageDef, FieldDef, FieldType, Aggregation, BlockDef, Target } from '../types'

const PAGE_FILE_KIND = 'life-dashboard/page'
const PAGE_FILE_FORMAT = 1

export type PageFileResult =
  | { ok: true; def: PageDef }
  | { ok: false; reason: string }

/** Serialize a page's def as a shareable, def-only file (never includes entries). */
export function serializePage(def: PageDef): string {
  return JSON.stringify({ kind: PAGE_FILE_KIND, format: PAGE_FILE_FORMAT, def }, null, 2)
}

const FIELD_TYPES: FieldType[] = ['count', 'number', 'duration', 'rating', 'bool', 'text']
const AGGS: Aggregation[] = ['sum', 'avg', 'last', 'max', 'min', 'count']
const BLOCK_TYPES = ['hero', 'entryLog', 'dailyRecord', 'statRow', 'heatmap', 'trend']

const isStr = (x: unknown): x is string => typeof x === 'string'
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function validField(f: unknown): f is FieldDef {
  if (typeof f !== 'object' || f === null) return false
  const x = f as Record<string, unknown>
  if (!isStr(x.key) || x.key === '') return false
  if (!FIELD_TYPES.includes(x.type as FieldType)) return false
  if (!isStr(x.label)) return false
  if (x.unit !== undefined && !isStr(x.unit)) return false
  if (x.step !== undefined && !isNum(x.step)) return false
  if (x.scale !== undefined && !isNum(x.scale)) return false
  if (x.default !== undefined && typeof x.default !== 'number' && typeof x.default !== 'boolean') return false
  return true
}

function validTarget(t: unknown): t is Target {
  if (typeof t !== 'object' || t === null) return false
  const x = t as Record<string, unknown>
  if (x.kind === 'atLeast' || x.kind === 'atMost') return isNum(x.value)
  if (x.kind === 'range') return isNum(x.value) && isNum(x.max)
  return false
}

function validBlock(b: unknown): b is BlockDef {
  if (typeof b !== 'object' || b === null) return false
  const x = b as Record<string, unknown>
  if (!isStr(x.type) || !BLOCK_TYPES.includes(x.type)) return false
  if (x.type === 'trend') {
    const m = x.metric as Record<string, unknown> | undefined
    if (!m || !isStr(m.field) || !AGGS.includes(m.agg as Aggregation)) return false
  }
  return true
}

export function parsePageFile(text: string): PageFileResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'not valid JSON' }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'not a page file' }
  const o = parsed as Record<string, unknown>
  if (o.kind !== PAGE_FILE_KIND) return { ok: false, reason: 'not a Life-Dashboard page file' }
  if (o.format !== PAGE_FILE_FORMAT) return { ok: false, reason: `unsupported file format: ${String(o.format)}` }

  const d = o.def as Record<string, unknown> | undefined
  if (!d || typeof d !== 'object') return { ok: false, reason: 'missing page definition' }
  if (d.schemaVersion !== 1) return { ok: false, reason: 'unsupported page schema' }
  if (!isStr(d.name) || d.name.trim() === '') return { ok: false, reason: 'page has no name' }
  if (!Array.isArray(d.fields) || d.fields.length === 0) return { ok: false, reason: 'page has no fields' }
  for (const f of d.fields) if (!validField(f)) return { ok: false, reason: 'a field is invalid' }
  const fieldKeys = (d.fields as FieldDef[]).map((f) => f.key)

  const pm = d.primaryMetric as Record<string, unknown> | undefined
  if (!pm || !isStr(pm.field) || !fieldKeys.includes(pm.field) || !AGGS.includes(pm.agg as Aggregation)) {
    return { ok: false, reason: 'invalid primary metric' }
  }
  if (!validTarget(d.target)) return { ok: false, reason: 'invalid target' }
  if (!Array.isArray(d.blocks) || d.blocks.length === 0) return { ok: false, reason: 'page has no blocks' }
  for (const b of d.blocks) if (!validBlock(b)) return { ok: false, reason: 'a block is invalid' }

  const templateId = isStr(d.templateId) ? d.templateId : crypto.randomUUID()
  const version = isNum(d.version) ? d.version : 1

  const def: PageDef = {
    schemaVersion: 1,
    id: isStr(d.id) ? d.id : templateId, // placeholder; the store mints a real local id on add
    templateId,
    version,
    name: d.name,
    emoji: isStr(d.emoji) ? d.emoji : undefined,
    iconPath: isStr(d.iconPath) ? d.iconPath : undefined,
    fields: d.fields as FieldDef[],
    primaryMetric: { field: pm.field, agg: pm.agg as Aggregation },
    target: d.target as Target,
    blocks: d.blocks as BlockDef[],
  }
  return { ok: true, def }
}
