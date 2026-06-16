import type { CatalogEntry } from './types'
import { BUNDLED_CATALOG } from './catalog'

/**
 * The remote registry: a single public JSON file on GitHub, served free over
 * the raw CDN (no server, no hosting cost). It lists community pages; the app
 * fetches it and merges it over the bundled starter set. If it is unreachable
 * — offline, not yet published, a network hiccup — we silently fall back to
 * the bundled catalog, so the Marketplace is ALWAYS usable.
 *
 * The published file lives at `registry/index.json` in the repo; see
 * registry/README.md for how anyone can contribute a page via pull request.
 */
/** The public GitHub repo that hosts the registry (owner/name) + branch. */
export const REGISTRY_REPO = 'rbnIbraheem09/Life-Dashboard'
export const REGISTRY_BRANCH = 'master'

export const DEFAULT_REGISTRY_URL =
  `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}/registry/index.json`

/** GitHub web links used by the Publish flow (browse + propose a contribution). */
export const REGISTRY_BROWSE_URL = `https://github.com/${REGISTRY_REPO}/tree/${REGISTRY_BRANCH}/registry`
export const REGISTRY_CONTRIBUTE_URL = `https://github.com/${REGISTRY_REPO}/blob/${REGISTRY_BRANCH}/registry/README.md`

const FETCH_TIMEOUT_MS = 6000

export type CatalogSource = 'bundled' | 'remote'
export type LoadResult = { entries: CatalogEntry[]; source: CatalogSource; error?: string }

function isEntry(x: unknown): x is CatalogEntry {
  if (!x || typeof x !== 'object') return false
  const e = x as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.author === 'string' &&
    typeof e.description === 'string' &&
    Array.isArray(e.tags) &&
    !!e.page &&
    typeof e.page === 'object'
  )
}

/** Merge remote over bundled by id — remote wins, bundled fills the gaps. */
function merge(bundled: CatalogEntry[], remote: CatalogEntry[]): CatalogEntry[] {
  const byId = new Map<string, CatalogEntry>()
  for (const e of bundled) byId.set(e.id, e)
  for (const e of remote) byId.set(e.id, e)
  return [...byId.values()]
}

/**
 * Load the catalog: bundled first, then merge in the remote registry if it can
 * be reached. Never throws — a failure resolves to the bundled set with the
 * error attached (so the UI can show "offline · showing bundled pages").
 */
export async function loadCatalog(url: string = DEFAULT_REGISTRY_URL): Promise<LoadResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json: unknown = await res.json()
    const raw = Array.isArray(json)
      ? json
      : json && typeof json === 'object' && Array.isArray((json as { entries?: unknown }).entries)
        ? (json as { entries: unknown[] }).entries
        : null
    if (!raw) throw new Error('unexpected registry shape')
    const remote = raw.filter(isEntry)
    return { entries: merge(BUNDLED_CATALOG, remote), source: 'remote' }
  } catch (e) {
    return { entries: BUNDLED_CATALOG, source: 'bundled', error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}
