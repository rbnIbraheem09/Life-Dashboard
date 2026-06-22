/**
 * Regenerates the bundled starter entries in `registry/index.json` from the app's
 * bundled catalog, so the in-app starter set and the GitHub-hosted registry can
 * never drift. Run after editing src/marketplace/catalog.ts:
 *
 *   npx vite-node scripts/gen-registry.ts
 *
 * NON-DESTRUCTIVE: community entries already merged into index.json (anything
 * whose `id` is not part of the bundled set) are preserved. Re-running this
 * never drops a community page. If index.json exists but is malformed, the
 * script refuses to overwrite rather than risk losing entries.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BUNDLED_CATALOG } from '../src/marketplace/catalog'

const target = fileURLToPath(new URL('../registry/index.json', import.meta.url))
const bundledIds = new Set(BUNDLED_CATALOG.map((e) => e.id))

/** Keep every community (non-bundled) entry already published in index.json. */
function readCommunityEntries(): unknown[] {
  if (!existsSync(target)) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(target, 'utf8'))
  } catch (err) {
    console.error(`Refusing to overwrite ${target}: it exists but isn't valid JSON.`)
    console.error(`Fix or delete it by hand first (${err instanceof Error ? err.message : String(err)}).`)
    process.exit(1)
  }
  const entries = (parsed as { entries?: unknown }).entries
  if (!Array.isArray(entries)) return []
  return entries.filter(
    (e): e is { id: string } =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as { id?: unknown }).id === 'string' &&
      !bundledIds.has((e as { id: string }).id),
  )
}

const community = readCommunityEntries()

const out = {
  schema: 1,
  note: 'Marketplace registry for Life-Dashboard. Each entry is a pure-data page (no code). Bundled starter entries are generated from src/marketplace/catalog.ts; community entries are added via pull request and preserved on regeneration. See registry/README.md.',
  entries: [...BUNDLED_CATALOG, ...community],
}

writeFileSync(target, JSON.stringify(out, null, 2) + '\n')
console.log(
  `wrote ${target}: ${BUNDLED_CATALOG.length} bundled + ${community.length} community = ${out.entries.length} entries`,
)
