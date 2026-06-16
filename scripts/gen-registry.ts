/**
 * Generates `registry/index.json` (the published marketplace manifest) from the
 * bundled catalog, so the in-app starter set and the GitHub-hosted registry can
 * never drift. Run after editing src/marketplace/catalog.ts:
 *
 *   npx vite-node scripts/gen-registry.ts
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BUNDLED_CATALOG } from '../src/marketplace/catalog'

const out = {
  schema: 1,
  note: 'Marketplace registry for Life-Dashboard. Each entry is a pure-data page (no code). Generated from src/marketplace/catalog.ts — see registry/README.md.',
  entries: BUNDLED_CATALOG,
}

const target = fileURLToPath(new URL('../registry/index.json', import.meta.url))
writeFileSync(target, JSON.stringify(out, null, 2) + '\n')
console.log(`wrote ${target} with ${BUNDLED_CATALOG.length} entries`)
