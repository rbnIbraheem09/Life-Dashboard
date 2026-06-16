import type { PageDef } from '../types'

/**
 * The on-disk page-file envelope — exactly what `serializePage` emits and
 * `parsePageFile` reads. The marketplace never executes anything; a page is
 * pure data rendered by the app's built-in blocks.
 */
export type PageFile = { kind: string; format: number; def: unknown }

/**
 * One listing in a catalog (bundled or remote). `page` is the full page-file
 * object; everything shown on the card (name, icon, version) is derived by
 * parsing it, so there is a single source of truth and no metadata drift.
 */
export type CatalogEntry = {
  /** Stable registry slug, unique within a catalog. */
  id: string
  /** Who made it. "Life-Dashboard" for the bundled starter set. */
  author: string
  /** One-line pitch shown on the card. */
  description: string
  /** Search / browse tags. */
  tags: string[]
  /** The page-file object — installed via `parsePageFile(JSON.stringify(page))`. */
  page: PageFile
}

export type ScanLevel = 'ok' | 'info' | 'warn'
export type ScanFinding = { level: ScanLevel; label: string; detail?: string }
export type ScanVerdict = 'safe' | 'review' | 'blocked'

/** Result of inspecting a catalog entry's file for safety + validity. */
export type ScanResult = {
  /** safe = nothing notable · review = valid but worth a look · blocked = invalid, install disabled. */
  verdict: ScanVerdict
  /** True only if the file passes strict schema validation (installable). */
  valid: boolean
  /** The parsed, normalized def — present iff `valid`. */
  def?: PageDef
  findings: ScanFinding[]
}
