import { parsePageFile } from '../lib/pagefile'
import type { ScanFinding, ScanResult } from './types'

/**
 * Safety scan for a marketplace page file. Pages are pure DATA — the app never
 * evaluates anything from them, it renders a fixed set of built-in blocks from
 * a validated schema. So the real guarantee is `parsePageFile`'s strict
 * validation (a file that fails it can't be installed). On top of that this
 * scan surfaces a few human-meaningful signals — size, field/block counts,
 * web-style strings, odd icon paths, unknown keys — so a person can eyeball a
 * file before installing and understand WHY it's safe.
 *
 *   blocked -> fails strict validation; install disabled.
 *   review  -> valid, but something is worth a glance (a `warn` finding).
 *   safe    -> valid, nothing notable.
 */

const MAX_BYTES = 64 * 1024
const MAX_FIELDS = 24
const MAX_BLOCKS = 16
const ICONPATH_MAX = 4000
// SVG path data: commands + numbers only. Anything else is suspicious.
const ICONPATH_ALLOWED = /^[\sMmLlHhVvCcSsQqTtAaZz0-9.,+\-eE]*$/

const SCRIPTY: { re: RegExp; what: string }[] = [
  { re: /<\s*script/i, what: 'a <script> tag' },
  { re: /<\s*iframe/i, what: 'an <iframe> tag' },
  { re: /javascript:/i, what: 'a javascript: URL' },
  { re: /data:text\/html/i, what: 'a data:text/html URL' },
  { re: /\bon[a-z]+\s*=/i, what: 'an inline event handler' },
  { re: /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/, what: 'control characters' },
]
const URL_RE = /\bhttps?:\/\/\S+/i

const KNOWN_DEF_KEYS = new Set([
  'schemaVersion', 'id', 'templateId', 'version', 'name',
  'emoji', 'iconPath', 'fields', 'primaryMetric', 'target', 'blocks',
])

/** Every string value anywhere in the structure. */
function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === 'string') { out.push(v); return }
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, out); return }
  if (v && typeof v === 'object') {
    for (const x of Object.values(v as Record<string, unknown>)) collectStrings(x, out)
  }
}

export function byteLength(s: string): number {
  try { return new TextEncoder().encode(s).length } catch { return s.length }
}

export function scanPage(page: unknown): ScanResult {
  let text = ''
  try { text = JSON.stringify(page) } catch { /* circular / non-serializable */ }
  if (!text) {
    return {
      verdict: 'blocked',
      valid: false,
      findings: [{ level: 'warn', label: 'Unreadable file', detail: 'This entry could not be read as JSON.' }],
    }
  }

  const parsed = parsePageFile(text)
  if (!parsed.ok) {
    return {
      verdict: 'blocked',
      valid: false,
      findings: [
        { level: 'warn', label: 'Not a valid page file', detail: parsed.reason },
        { level: 'info', label: 'Install blocked', detail: 'Only files that pass strict schema validation can be installed.' },
      ],
    }
  }

  const def = parsed.def
  const findings: ScanFinding[] = [
    { level: 'ok', label: 'Valid page definition', detail: "Passes Life-Dashboard's strict schema check." },
    { level: 'ok', label: 'Data only, never code', detail: 'Installed as a definition and drawn with the app built-in components. Nothing in this file is ever executed.' },
  ]

  const bytes = byteLength(text)
  const kb = (bytes / 1024).toFixed(1)
  if (bytes > MAX_BYTES) findings.push({ level: 'warn', label: `Large file (${kb} KB)`, detail: 'Bigger than a page definition normally needs.' })
  else findings.push({ level: 'ok', label: `Compact (${kb} KB)` })

  if (def.fields.length > MAX_FIELDS) findings.push({ level: 'warn', label: `Unusually many fields (${def.fields.length})` })
  if (def.blocks.length > MAX_BLOCKS) findings.push({ level: 'warn', label: `Unusually many blocks (${def.blocks.length})` })

  if (def.iconPath) {
    if (def.iconPath.length > ICONPATH_MAX) findings.push({ level: 'warn', label: 'Oversized icon path' })
    else if (!ICONPATH_ALLOWED.test(def.iconPath)) {
      findings.push({ level: 'warn', label: 'Unexpected characters in icon path', detail: 'An icon should be plain SVG path data (commands and numbers).' })
    }
  }

  const strings: string[] = []
  collectStrings(page, strings)
  const scripty = new Set<string>()
  let hasUrl = false
  for (const s of strings) {
    for (const rule of SCRIPTY) if (rule.re.test(s)) scripty.add(rule.what)
    if (URL_RE.test(s)) hasUrl = true
  }
  if (scripty.size) {
    findings.push({
      level: 'warn',
      label: 'Web-style content in text',
      detail: `Found ${[...scripty].join(', ')}. Text is always shown literally and never run, but give it a read.`,
    })
  }
  if (hasUrl) {
    findings.push({
      level: 'info',
      label: 'Contains a link',
      detail: 'A text field includes a link. Links are shown as plain text and are never opened automatically.',
    })
  }

  const defObj = (page as { def?: Record<string, unknown> } | null)?.def
  if (defObj && typeof defObj === 'object') {
    const extra = Object.keys(defObj).filter((k) => !KNOWN_DEF_KEYS.has(k))
    if (extra.length) {
      findings.push({
        level: 'info',
        label: 'Extra fields (ignored)',
        detail: `Not part of the schema and dropped on install: ${extra.join(', ')}.`,
      })
    }
  }

  const hasWarn = findings.some((f) => f.level === 'warn')
  return { verdict: hasWarn ? 'review' : 'safe', valid: true, def, findings }
}
