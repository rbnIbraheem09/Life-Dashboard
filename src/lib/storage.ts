import type { StorageV2, V1Storage } from '../types'
import { BUILTIN_DEFS, BUILTIN_ORDER } from '../registry/builtins'
import { migrateV1toV2 } from './migrate'

const KEY_V1 = 'life-dashboard:v1'   // legacy — read once for migration, then left as backup
const KEY_V2 = 'life-dashboard:v2'
const WRITE_DEBOUNCE_MS = 300

/** Fresh empty v2 store: built-in pages with no data. */
export function emptyStorage(): StorageV2 {
  const pages: StorageV2['pages'] = {}
  for (const id of BUILTIN_ORDER) {
    pages[id] = { def: BUILTIN_DEFS[id], data: { days: {} } }
  }
  return { version: 2, pages, order: [...BUILTIN_ORDER], dismissed: [] }
}

export function isValidV2(data: unknown): data is StorageV2 {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { version?: unknown }).version === 2 &&
    typeof (data as { pages?: unknown }).pages === 'object' &&
    Array.isArray((data as { order?: unknown }).order)
  )
}

function isValidV1(data: unknown): data is V1Storage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { version?: unknown }).version === 1 &&
    typeof (data as { challenges?: unknown }).challenges === 'object'
  )
}

/**
 * Append any builtin pages missing from `store` (e.g. pages added in a later
 * release). Preserves every existing page, its data, and the user's order —
 * only adds what's new, never overwrites an existing def. Returns the same
 * object reference when nothing is missing.
 */
export function mergeMissingBuiltins(store: StorageV2): { store: StorageV2; added: boolean } {
  const missing = BUILTIN_ORDER.filter((id) => !(id in store.pages))
  if (missing.length === 0) return { store, added: false }

  const pages = { ...store.pages }
  for (const id of missing) pages[id] = { def: BUILTIN_DEFS[id], data: { days: {} } }
  const order = [...store.order, ...missing.filter((id) => !store.order.includes(id))]
  return { store: { ...store, pages, order }, added: true }
}

/**
 * Load order:
 *   1. valid v2 at KEY_V2  → use it (merge any new builtins)
 *   2. valid v1 at KEY_V1  → migrate → merge builtins → persist v2 (KEY_V1 left intact as backup)
 *   3. otherwise           → empty v2
 */
export function loadStorage(): StorageV2 {
  try {
    const rawV2 = localStorage.getItem(KEY_V2)
    if (rawV2) {
      const parsed = JSON.parse(rawV2)
      if (isValidV2(parsed)) {
        const { store, added } = mergeMissingBuiltins(parsed)
        if (added) flushStorage(store)
        return store
      }
    }
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const parsed = JSON.parse(rawV1)
      if (isValidV1(parsed)) {
        const migrated = mergeMissingBuiltins(migrateV1toV2(parsed)).store
        flushStorage(migrated) // persist immediately so the migration is durable
        return migrated
      }
    }
    return emptyStorage()
  } catch {
    return emptyStorage()
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

/** Debounced write so rapid [+] clicks don't thrash storage. */
export function saveStorage(data: StorageV2): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY_V2, JSON.stringify(data))
    } catch {
      // localStorage full/unavailable — single-user local app, silent ignore
    }
    timer = null
  }, WRITE_DEBOUNCE_MS)
}

/** Immediate, un-debounced flush (migration / import / reset). */
export function flushStorage(data: StorageV2): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(data))
  } catch {
    // ignore
  }
}
