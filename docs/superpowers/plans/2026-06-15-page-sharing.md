# Page Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user export one page as a blank template, share the file, and import it as a new page added to their dashboard — with smart update (keeps data) when they already have that template.

**Architecture:** Two phases. Phase 1 makes navigation data-driven (store-driven sidebar + `/p/:id` routing) and adds page delete (with a `dismissed` list so builtins can be removed). Phase 2 adds a pure `pagefile` serialize/validate boundary, store actions for add/update/find/export, and the import UI (file picker + a 3-way update/fork dialog).

**Tech Stack:** Vite + React 18 + TypeScript, Zustand, React Router 6, framer-motion, Tailwind v3, vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-page-sharing-design.md`

**Conventions (hard rules — do not break):**
- No hardcoded colors. Only `var(--*)`, `color-mix()`, `bg-white/[0.0X]`.
- Three fonts only (`iz-display`, body, `iz-mono`). No Tailwind color classes.
- No new dependencies. No new global-state libs.
- The page file is **pure JSON, never code** — validated before anything installs.
- Pure logic is TDD'd (vitest); React components are verified by `npm run typecheck` + `npm run build` + manual.

**Commands:**
- Type-check: `npm run typecheck`
- All tests: `npm run test`
- One test file: `npx vitest run src/lib/<file>.test.ts`
- Build: `npm run build`
- Dev server: `npm run dev` → http://localhost:5173

**Test env note:** vitest runs in `node`. `localStorage` is absent, but `loadStorage`/`flushStorage`/`saveStorage` already wrap access in try/catch, and `crypto.randomUUID()` exists in node — so the store (`usePages`) is importable and testable (it falls back to `emptyStorage()` on load).

---

## File map

**Create:**
- `src/lib/pagefile.ts` — serialize + validate a shareable page file (Phase 2)
- `src/lib/pagefile.test.ts` — its tests (Phase 2)
- `src/components/PageRoute.tsx` — resolves `/p/:id` → renderer or redirect/empty (Phase 1)
- `src/components/ImportPageDialog.tsx` — 3-way update/fork modal (Phase 2)

**Modify:**
- `src/types.ts` — `PageDef` +`templateId`/`version`/`iconPath`; `StorageV2` +`dismissed` (Phase 1)
- `src/registry/pullups.ts`, `water.ts`, `sleep.ts`, `reading.ts` — add `templateId`+`version` (Phase 1)
- `src/lib/storage.ts` — `emptyStorage`+`dismissed`; `mergeMissingBuiltins` respects `dismissed`; new `normalizeStore`; `loadStorage` uses it (Phase 1)
- `src/lib/migrate.ts` — migrated store includes `dismissed: []` (Phase 1)
- `src/lib/storage.test.ts` — `normalizeStore` tests (Phase 1)
- `src/store/pages.ts` — `importData` uses `normalizeStore`; `deletePage` (Phase 1); `addPage`/`updatePageDef`/`findByTemplate`/`exportPage` (Phase 2)
- `src/store/pages.test.ts` — delete + add/update/find/export tests
- `src/components/Sidebar.tsx` — store-driven list + icon precedence + `⋯` Delete (Phase 1); `[+]` Import + `⋯` Export + dialog (Phase 2)
- `src/App.tsx` — dynamic routing (Phase 1)

---

# PHASE 1 — Dynamic pages

## Task 1: Schema foundation (types + builtins + storage constructors)

These must land together or `tsc` breaks (new required fields force every `PageDef` literal and `StorageV2` constructor to set them).

**Files:**
- Modify: `src/types.ts`
- Modify: `src/registry/pullups.ts`, `water.ts`, `sleep.ts`, `reading.ts`
- Modify: `src/lib/storage.ts` (`emptyStorage` only)
- Modify: `src/lib/migrate.ts`

- [ ] **Step 1: Extend the types**

In `src/types.ts`, replace the `PageDef` type with:

```ts
export type PageDef = {
  schemaVersion: 1       // PageDef format version (for future export compat)
  id: string             // LOCAL store key — unique within this store; the route + sidebar key
  templateId: string     // STABLE lineage id — shared across copies/versions; what import matches on
  version: number        // template version — informational + update-hint gate
  name: string
  emoji?: string
  iconPath?: string      // optional SVG path `d` string, rendered inside our own <svg>
  fields: FieldDef[]
  primaryMetric: Metric
  target: Target
  blocks: BlockDef[]
}
```

In the same file, replace the `StorageV2` type with:

```ts
export type StorageV2 = {
  version: 2
  pages: Record<string, PageState>
  order: string[]        // page id order (sidebar)
  dismissed: string[]    // builtin ids the user deleted — the merge skips these
}
```

- [ ] **Step 2: Stamp identity on the four builtins**

In `src/registry/pullups.ts`, add the two fields right after `id: 'pullups',`:

```ts
  templateId: 'builtin:pullups',
  version: 1,
```

In `src/registry/water.ts`, after `id: 'water',`:

```ts
  templateId: 'builtin:water',
  version: 1,
```

In `src/registry/sleep.ts`, after `id: 'sleep',`:

```ts
  templateId: 'builtin:sleep',
  version: 1,
```

In `src/registry/reading.ts`, after `id: 'reading',`:

```ts
  templateId: 'builtin:reading',
  version: 1,
```

- [ ] **Step 3: Add `dismissed` to the two store constructors**

In `src/lib/storage.ts`, in `emptyStorage`, change the return to include `dismissed`:

```ts
  return { version: 2, pages, order: [...BUILTIN_ORDER], dismissed: [] }
```

In `src/lib/migrate.ts`, change the returned object to include `dismissed`:

```ts
  return {
    version: 2,
    pages: {
      pullups: { def: pullupsDef, data: { days } },
      water: { def: WATER_DEF, data: { days: {} } },
    },
    order: ['pullups', 'water'],
    dismissed: [],
  }
```

- [ ] **Step 4: Verify it all compiles and existing tests pass**

Run: `npm run typecheck`
Expected: clean (no missing-property errors).

Run: `npm run test`
Expected: all pass. (The existing `storage.test.ts` builds `StorageV2` literals — they will now need `dismissed`. If any test object is missing it, that's expected to surface here; fix those literals by adding `dismissed: []`. Check `src/lib/storage.test.ts` and `src/store/pages.test.ts` and add `dismissed: []` to any `StorageV2` literal that lacks it.)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/registry/*.ts src/lib/storage.ts src/lib/migrate.ts src/lib/storage.test.ts src/store/pages.test.ts
git commit -m "feat: PageDef gains templateId/version/iconPath; StorageV2 gains dismissed"
```

---

## Task 2: `normalizeStore` + dismissed-aware merge

**Files:**
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`
- Modify: `src/store/pages.ts` (route whole-store import through `normalizeStore`)

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/storage.test.ts` (import `normalizeStore` alongside the existing imports):

```ts
import { mergeMissingBuiltins, normalizeStore } from './storage'

describe('normalizeStore', () => {
  it('backfills templateId/version on a builtin page missing them', () => {
    const store = {
      version: 2 as const,
      pages: { pullups: { def: { ...BUILTIN_DEFS.pullups, templateId: undefined, version: undefined } as never, data: { days: {} } } },
      order: ['pullups'],
      dismissed: [],
    }
    const { store: out, changed } = normalizeStore(store)
    expect(changed).toBe(true)
    expect(out.pages.pullups.def.templateId).toBe('builtin:pullups')
    expect(out.pages.pullups.def.version).toBe(1)
  })

  it('adds a dismissed array when missing', () => {
    const store = { version: 2 as const, pages: {}, order: [] } as never
    const { store: out } = normalizeStore(store)
    expect(Array.isArray(out.dismissed)).toBe(true)
  })

  it('does not resurrect a dismissed builtin', () => {
    const store = {
      version: 2 as const,
      pages: { pullups: { def: BUILTIN_DEFS.pullups, data: { days: {} } } },
      order: ['pullups'],
      dismissed: ['water'],
    }
    const { store: out } = normalizeStore(store)
    expect(out.pages.water).toBeUndefined()
  })

  it('is unchanged for an already-normal store', () => {
    const { store: normal } = normalizeStore({
      version: 2, pages: {}, order: [], dismissed: [],
    } as never)
    const again = normalizeStore(normal)
    expect(again.changed).toBe(false)
    expect(again.store).toBe(normal)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `normalizeStore is not a function`.

- [ ] **Step 3: Make `mergeMissingBuiltins` dismissed-aware and add `normalizeStore`**

In `src/lib/storage.ts`, replace `mergeMissingBuiltins` with:

```ts
export function mergeMissingBuiltins(store: StorageV2): { store: StorageV2; added: boolean } {
  const dismissed = store.dismissed ?? []
  const missing = BUILTIN_ORDER.filter((id) => !(id in store.pages) && !dismissed.includes(id))
  if (missing.length === 0) return { store, added: false }

  const pages = { ...store.pages }
  for (const id of missing) pages[id] = { def: BUILTIN_DEFS[id], data: { days: {} } }
  const order = [...store.order, ...missing.filter((id) => !store.order.includes(id))]
  return { store: { ...store, pages, order }, added: true }
}

/**
 * Bring any store entering the app to current shape: merge missing builtins
 * (respecting `dismissed`), ensure `dismissed` exists, and backfill identity
 * (templateId/version) onto pages saved before those fields existed. Used by
 * both loadStorage and the whole-store import. Returns the same reference when
 * nothing changed.
 */
export function normalizeStore(input: StorageV2): { store: StorageV2; changed: boolean } {
  const merged = mergeMissingBuiltins(input)
  let store = merged.store
  let changed = merged.added

  if (!Array.isArray(store.dismissed)) {
    store = { ...store, dismissed: [] }
    changed = true
  }

  let pagesChanged = false
  const pages: StorageV2['pages'] = { ...store.pages }
  for (const [id, page] of Object.entries(pages)) {
    const def = page.def as { templateId?: unknown; version?: unknown }
    const hasId = typeof def.templateId === 'string'
    const hasVer = typeof def.version === 'number'
    if (hasId && hasVer) continue
    const builtin = BUILTIN_DEFS[id]
    const templateId = hasId ? (def.templateId as string) : builtin?.templateId ?? crypto.randomUUID()
    const version = hasVer ? (def.version as number) : builtin?.version ?? 1
    pages[id] = { ...page, def: { ...page.def, templateId, version } }
    pagesChanged = true
  }
  if (pagesChanged) {
    store = { ...store, pages }
    changed = true
  }

  return { store, changed }
}
```

- [ ] **Step 4: Wire `loadStorage` to use `normalizeStore`**

In `src/lib/storage.ts`, in `loadStorage`, replace the v2 branch body and the v1-migration line:

```ts
      if (isValidV2(parsed)) {
        const { store, changed } = normalizeStore(parsed)
        if (changed) flushStorage(store)
        return store
      }
```

```ts
        const migrated = normalizeStore(migrateV1toV2(parsed)).store
        flushStorage(migrated) // persist immediately so the migration is durable
        return migrated
```

- [ ] **Step 5: Wire whole-store import through `normalizeStore`**

In `src/store/pages.ts`, update the import from storage to include `normalizeStore`:

```ts
import { emptyStorage, flushStorage, isValidV2, loadStorage, normalizeStore, saveStorage } from '../lib/storage'
```

(If `mergeMissingBuiltins` was imported there, remove it.) In `importData`, replace the merge line:

```ts
      const merged = normalizeStore(parsed).store
      flushStorage(merged)
      set({ data: merged })
      return true
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/lib/storage.test.ts && npm run test && npm run typecheck`
Expected: all pass, clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts src/store/pages.ts
git commit -m "feat: normalizeStore (dismissed-aware merge + identity backfill) on load + import"
```

---

## Task 3: `deletePage` store action

**Files:**
- Modify: `src/store/pages.ts`
- Modify: `src/store/pages.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/store/pages.test.ts`:

```ts
describe('deletePage', () => {
  it('removes a page from pages + order, and records a deleted builtin in dismissed', () => {
    // start from a clean known state
    usePages.getState().resetAll()
    expect(usePages.getState().data.pages.water).toBeDefined()

    usePages.getState().deletePage('water')
    const after = usePages.getState().data
    expect(after.pages.water).toBeUndefined()
    expect(after.order).not.toContain('water')
    expect(after.dismissed).toContain('water')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/pages.test.ts`
Expected: FAIL — `deletePage is not a function`.

- [ ] **Step 3: Implement `deletePage`**

In `src/store/pages.ts`, add `BUILTIN_DEFS` to imports:

```ts
import { BUILTIN_DEFS } from '../registry/builtins'
```

Add to the `PagesState` type (after `resetAll`):

```ts
  deletePage: (localId: string) => void
```

Add the action inside the store (after `resetAll`):

```ts
  deletePage: (localId) =>
    set((state) => {
      if (!(localId in state.data.pages)) return { data: state.data }
      const pages = { ...state.data.pages }
      delete pages[localId]
      const order = state.data.order.filter((id) => id !== localId)
      const isBuiltin = localId in BUILTIN_DEFS
      const dismissed =
        isBuiltin && !state.data.dismissed.includes(localId)
          ? [...state.data.dismissed, localId]
          : state.data.dismissed
      const data: StorageV2 = { ...state.data, pages, order, dismissed }
      saveStorage(data)
      return { data }
    }),
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run src/store/pages.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/pages.ts src/store/pages.test.ts
git commit -m "feat: deletePage store action (records dismissed builtins)"
```

---

## Task 4: Dynamic sidebar (store-driven list + icon precedence + ⋯ Delete)

Replaces the hardcoded `BUILT_IN_PAGES` nav with a list driven by the store's `order`, keeps the builtin SVG icons via an id→component map, renders `iconPath`/`emoji` for other pages, adds a per-row `⋯` menu with Delete, and relabels the footer backup buttons. (`[+]` import and `⋯` Export arrive in Phase 2.)

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Replace the file with the dynamic version**

Replace the entire contents of `src/components/Sidebar.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { usePages } from '../store/pages'
import { ScrollArea } from './ScrollArea'
import { cn } from '../lib/cn'

/* ── Builtin page icons (16×16, 1.5px stroke, currentColor) ── */

function PullupsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2 3.5h12" />
      <path d="M5 3.5v3" />
      <path d="M11 3.5v3" />
      <circle cx="8" cy="8" r="1.4" />
      <path d="M8 9.4v3.1M8 11l-2 1.5M8 11l2 1.5" />
    </svg>
  )
}

function WaterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 2s4 4.6 4 7.3A4 4 0 0 1 8 13.3a4 4 0 0 1-4-4C4 6.6 8 2 8 2Z" />
    </svg>
  )
}

function SleepIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M13 9.2A5.2 5.2 0 1 1 6.8 3 4.1 4.1 0 0 0 13 9.2Z" />
    </svg>
  )
}

function ReadingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 4.2C6.8 3.3 5.2 3 3.5 3.2v8c1.7-.2 3.3.1 4.5 1 1.2-.9 2.8-1.2 4.5-1v-8C10.8 3 9.2 3.3 8 4.2Z" />
      <path d="M8 4.2v8.8" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.6v1.8M8 12.6v1.8M2.6 8h1.8M11.6 8h1.8M4.05 4.05l1.27 1.27M10.68 10.68l1.27 1.27M11.95 4.05l-1.27 1.27M5.32 10.68l-1.27 1.27" />
    </svg>
  )
}

const BUILTIN_ICONS: Record<string, () => JSX.Element> = {
  pullups: PullupsIcon,
  water: WaterIcon,
  sleep: SleepIcon,
  reading: ReadingIcon,
}

/** Custom-page vector icon: a single SVG path rendered inside our own <svg>. */
function PathIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d={d} />
    </svg>
  )
}

/** Icon precedence: iconPath → builtin code-icon → emoji → fallback dot. */
function PageIcon({ id, iconPath, emoji }: { id: string; iconPath?: string; emoji?: string }) {
  if (iconPath) return <PathIcon d={iconPath} />
  const Builtin = BUILTIN_ICONS[id]
  if (Builtin) return <Builtin />
  if (emoji) return <span className="text-[14px] leading-none">{emoji}</span>
  return <span className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--text-muted)]" />
}

export function Sidebar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const order = usePages((s) => s.data.order)
  const pages = usePages((s) => s.data.pages)
  const deletePage = usePages((s) => s.deletePage)

  // which row's ⋯ menu is open
  const [menuFor, setMenuFor] = useState<string | null>(null)
  useEffect(() => {
    if (!menuFor) return
    const close = () => setMenuFor(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuFor])

  function handleExport() {
    const json = usePages.getState().exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'life-dashboard.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      // eslint-disable-next-line no-alert
      if (!window.confirm('Import replaces ALL current data with the contents of this file. Continue?')) {
        return
      }
      const ok = usePages.getState().importData(text)
      if (!ok) {
        // eslint-disable-next-line no-alert
        window.alert('Import failed: not a valid Life-Dashboard backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleDelete(id: string, name: string) {
    setMenuFor(null)
    // eslint-disable-next-line no-alert
    if (window.confirm(`Delete "${name}"? This removes the page and its logged data.`)) {
      deletePage(id)
    }
  }

  return (
    <div
      className={cn(
        'iz-panel h-full w-[240px] flex flex-col overflow-hidden',
        'rounded-[var(--radius)]',
        'border border-[var(--border)]',
        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5),0_2px_8px_-2px_rgba(0,0,0,0.3)]',
      )}
    >
      <div data-app-chrome className="px-5 pt-9 pb-4 select-none">
        <div className="flex items-baseline gap-2">
          <span className="iz-display text-[17px] text-[var(--text)] tracking-tight">
            Life-Dashboard
          </span>
        </div>
        <span className="iz-label mt-1 block">v0.2 · desktop</span>
      </div>

      <div className="px-3 pt-2 pb-3 flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="iz-label">Pages</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <nav className="flex flex-col gap-0.5">
            {order.map((id) => {
              const page = pages[id]
              if (!page) return null
              const def = page.def
              return (
                <div key={id} className="relative group">
                  <NavLink
                    to={`/p/${id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px]',
                        'border-l-2 transition-colors duration-[var(--motion-fast)]',
                        isActive
                          ? 'bg-white/[0.04] border-l-[var(--accent-1)] text-[var(--text)]'
                          : 'border-l-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/[0.02]',
                      )
                    }
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <PageIcon id={id} iconPath={def.iconPath} emoji={def.emoji} />
                    </span>
                    <span className="truncate">{def.name}</span>
                  </NavLink>

                  {/* ⋯ menu trigger — appears on row hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setMenuFor(menuFor === id ? null : id)
                    }}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md',
                      'iz-mono text-[14px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.05]',
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--motion-fast)]',
                      menuFor === id && 'opacity-100',
                    )}
                    title="Page actions"
                  >
                    ⋯
                  </button>

                  {menuFor === id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'absolute right-1.5 top-[calc(100%-4px)] z-30 min-w-[120px]',
                        'iz-panel rounded-md border border-[var(--border)] py-1',
                        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleDelete(id, def.name)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04] transition-colors duration-[var(--motion-fast)]"
                      >
                        Delete page
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      <div className="px-3 py-3 border-t border-[var(--border)] flex flex-col gap-0.5">
        <span className="iz-label px-3 mb-1">Data</span>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px]',
              'transition-colors duration-[var(--motion-fast)]',
              isActive
                ? 'text-[var(--text)] bg-white/[0.04]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03]',
            )
          }
        >
          <span className="w-4 inline-flex justify-center">
            <GearIcon />
          </span>
          Settings
        </NavLink>
        <button
          type="button"
          onClick={handleExport}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)]',
            'hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]',
          )}
        >
          <span className="iz-mono w-4 inline-flex justify-center">↓</span>
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)]',
            'hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]',
          )}
        >
          <span className="iz-mono w-4 inline-flex justify-center">↑</span>
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: clean, build succeeds. (`exportData`/`importData` still exist on the store; `deletePage` was added in Task 3.)

- [ ] **Step 3: Manual check**

Run `npm run dev`. The sidebar lists pages from the store; hovering a row reveals `⋯`; opening it shows "Delete page"; deleting a page removes it from the list. (Routing still uses the old paths until Task 5 — clicking a row may 404 until then; that's expected mid-phase.)

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: store-driven sidebar with icon precedence + per-page delete menu"
```

---

## Task 5: Dynamic routing (`/p/:id`)

**Files:**
- Create: `src/components/PageRoute.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `PageRoute`**

```tsx
// src/components/PageRoute.tsx
import { Navigate, useParams } from 'react-router-dom'
import { usePages } from '../store/pages'
import { PageRenderer } from '../blocks/PageRenderer'

/**
 * Resolves the dynamic page route. Renders the page if `:pageId` exists in the
 * store; otherwise redirects to the first page, or shows an empty state when
 * the dashboard has no pages. Used for `/`, `/p/:pageId`, and the `*` fallback.
 */
export function PageRoute() {
  const { pageId } = useParams()
  const order = usePages((s) => s.data.order)
  const hasPage = usePages((s) => (pageId ? pageId in s.data.pages : false))

  if (pageId && hasPage) return <PageRenderer pageId={pageId} />

  const first = order[0]
  if (first) return <Navigate to={`/p/${first}`} replace />
  return <EmptyPages />
}

function EmptyPages() {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-16 flex flex-col items-center justify-center text-center">
      <span className="iz-label" style={{ color: 'var(--accent-1)' }}>NO PAGES</span>
      <h1 className="iz-display text-3xl text-[var(--text)] mt-4 mb-2">Your dashboard is empty</h1>
      <p className="text-[14px] text-[var(--text-dim)] max-w-[420px]">
        Import a page from the sidebar to get started.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Swap App's routes to dynamic**

In `src/App.tsx`, replace the import of `PageRenderer` with `PageRoute`:

```ts
import { PageRoute } from './components/PageRoute'
```

(Remove the `import { PageRenderer } from './blocks/PageRenderer'` line — App no longer uses it directly.)

Replace the entire `<Routes>…</Routes>` block with:

```tsx
              <Routes>
                <Route path="/" element={<PageRoute />} />
                <Route path="/p/:pageId" element={<PageRoute />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/pullups" element={<Navigate to="/p/pullups" replace />} />
                <Route path="/water" element={<Navigate to="/p/water" replace />} />
                <Route path="/sleep" element={<Navigate to="/p/sleep" replace />} />
                <Route path="/reading" element={<Navigate to="/p/reading" replace />} />
                <Route path="*" element={<PageRoute />} />
              </Routes>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run test && npm run build`
Expected: clean, all pass, build succeeds.

- [ ] **Step 4: Manual check**

Run `npm run dev`. Clicking any sidebar page navigates to `/p/<id>` and renders it. `/` lands on the first page. Old `/pullups` redirects to `/p/pullups`. Deleting the currently-open page auto-redirects to the first remaining page (PageRoute re-resolves). Deleting every page shows the empty state.

- [ ] **Step 5: Commit**

```bash
git add src/components/PageRoute.tsx src/App.tsx
git commit -m "feat: dynamic /p/:id routing + empty state; old paths redirect"
```

**✅ Phase 1 ships here: data-driven navigation + deletable pages.**

---

# PHASE 2 — Sharing

## Task 6: `pagefile.ts` — serialize + validate (the safety boundary)

**Files:**
- Create: `src/lib/pagefile.ts`
- Test: `src/lib/pagefile.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/pagefile.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/pagefile.test.ts`
Expected: FAIL — cannot resolve `./pagefile`.

- [ ] **Step 3: Implement `pagefile.ts`**

```ts
// src/lib/pagefile.ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/pagefile.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagefile.ts src/lib/pagefile.test.ts
git commit -m "feat: pagefile serialize + strict validate (the import safety boundary)"
```

---

## Task 7: Store actions — add / update / find / export

**Files:**
- Modify: `src/store/pages.ts`
- Modify: `src/store/pages.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/store/pages.test.ts`:

```ts
import { serializePage } from '../lib/pagefile'
import type { PageDef } from '../types'

const sampleDef: PageDef = {
  schemaVersion: 1, id: 'ignored', templateId: 'tmpl-abc', version: 1,
  name: 'Cold Plunge', emoji: '🧊',
  fields: [{ key: 'mins', type: 'duration', label: 'Minutes', unit: 'min' }],
  primaryMetric: { field: 'mins', agg: 'sum' },
  target: { kind: 'atLeast', value: 3 },
  blocks: [{ type: 'hero' }, { type: 'entryLog' }],
}

describe('addPage / findByTemplate / updatePageDef / exportPage', () => {
  it('addPage mints a unique local id from the name and appends to order', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    expect(id).toBe('cold-plunge')
    const data = usePages.getState().data
    expect(data.pages[id]).toBeDefined()
    expect(data.pages[id].def.id).toBe(id)        // local id stamped onto the def
    expect(data.pages[id].def.templateId).toBe('tmpl-abc')
    expect(data.order).toContain(id)
  })

  it('addPage avoids id collisions with a suffix', () => {
    const id2 = usePages.getState().addPage(sampleDef)
    expect(id2).toBe('cold-plunge-2')
  })

  it('findByTemplate locates a page by templateId', () => {
    expect(usePages.getState().findByTemplate('tmpl-abc')).toBeDefined()
    expect(usePages.getState().findByTemplate('nope')).toBeUndefined()
  })

  it('updatePageDef swaps the def but keeps logged data', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    usePages.getState().addEntry(id, '2026-06-01', { mins: 5 })
    usePages.getState().updatePageDef(id, { ...sampleDef, name: 'Ice Bath' })
    const page = usePages.getState().data.pages[id]
    expect(page.def.name).toBe('Ice Bath')
    expect(page.def.id).toBe(id)                  // local id preserved
    expect(page.data.days['2026-06-01'].entries).toHaveLength(1)
  })

  it('exportPage round-trips through serialize (def only, no data)', () => {
    usePages.getState().resetAll()
    const id = usePages.getState().addPage(sampleDef)
    usePages.getState().addEntry(id, '2026-06-01', { mins: 5 })
    const json = usePages.getState().exportPage(id)
    expect(json).toBe(serializePage(usePages.getState().data.pages[id].def))
    expect('data' in JSON.parse(json)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/pages.test.ts`
Expected: FAIL — `addPage is not a function`.

- [ ] **Step 3: Implement the actions**

In `src/store/pages.ts`, add imports:

```ts
import type { Entry, FieldValue, PageDef, StorageV2 } from '../types'
import { serializePage } from '../lib/pagefile'
```

(Extend the existing `../types` import to include `PageDef` if it isn't already there.)

Add to the `PagesState` type:

```ts
  addPage: (def: PageDef) => string
  updatePageDef: (localId: string, def: PageDef) => void
  findByTemplate: (templateId: string) => string | undefined
  exportPage: (localId: string) => string
```

Add these pure helpers near the top of the file (after the imports):

```ts
function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
}

function uniqueId(base: string, taken: Record<string, unknown>): string {
  if (!(base in taken)) return base
  let n = 2
  while (`${base}-${n}` in taken) n += 1
  return `${base}-${n}`
}
```

Add the actions inside the store (after `deletePage`):

```ts
  addPage: (def) => {
    const state = get()
    const id = uniqueId(slug(def.name), state.data.pages)
    const finalDef: PageDef = {
      ...def,
      id,
      templateId: def.templateId || crypto.randomUUID(),
      version: typeof def.version === 'number' ? def.version : 1,
    }
    const pages = { ...state.data.pages, [id]: { def: finalDef, data: { days: {} } } }
    const order = [...state.data.order, id]
    const dismissed = state.data.dismissed.filter((d) => d !== id)
    const data: StorageV2 = { ...state.data, pages, order, dismissed }
    saveStorage(data)
    set({ data })
    return id
  },

  updatePageDef: (localId, def) =>
    set((state) => {
      const page = state.data.pages[localId]
      if (!page) return { data: state.data }
      const finalDef: PageDef = { ...def, id: localId } // keep the local key
      const pages = { ...state.data.pages, [localId]: { def: finalDef, data: page.data } }
      const data: StorageV2 = { ...state.data, pages }
      saveStorage(data)
      return { data }
    }),

  findByTemplate: (templateId) => {
    const { pages } = get().data
    for (const [id, page] of Object.entries(pages)) {
      if (page.def.templateId === templateId) return id
    }
    return undefined
  },

  exportPage: (localId) => {
    const page = get().data.pages[localId]
    return page ? serializePage(page.def) : ''
  },
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/pages.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/pages.ts src/store/pages.test.ts
git commit -m "feat: addPage/updatePageDef/findByTemplate/exportPage store actions"
```

---

## Task 8: `ImportPageDialog` (3-way update/fork modal)

**Files:**
- Create: `src/components/ImportPageDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ImportPageDialog.tsx
import { cn } from '../lib/cn'

/**
 * Shown when an imported page matches a template the user already has.
 * Three choices: Update (replace the def, keep data), Add as copy (fork a new
 * lineage), Cancel. Styled like the app's other overlays.
 */
export function ImportPageDialog({
  open,
  name,
  localVersion,
  fileVersion,
  onUpdate,
  onAddCopy,
  onCancel,
}: {
  open: boolean
  name: string
  localVersion: number
  fileVersion: number
  onUpdate: () => void
  onAddCopy: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div
        onClick={onCancel}
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(420px,90vw)]',
          'iz-panel rounded-[var(--radius)] border border-[var(--border)] p-7',
          'shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]',
          'transition-opacity duration-[var(--motion-mid)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
            style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
          />
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Import page</span>
        </div>
        <h2 className="iz-display text-2xl text-[var(--text)]">You already have “{name}”</h2>
        <p className="iz-mono text-[12px] text-[var(--text-dim)] mt-2">
          yours: v{localVersion} · file: v{fileVersion}
        </p>
        <p className="text-[13px] text-[var(--text-dim)] mt-3">
          Update keeps your logged data and swaps in the new definition. Add as copy creates a
          separate page and leaves your existing one untouched.
        </p>
        <div className="flex items-center gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAddCopy}
            className="iz-mono text-[12px] ml-auto px-3 py-2 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
          >
            Add as copy
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
          >
            Update
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: clean. (Unused until Task 9 wires it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ImportPageDialog.tsx
git commit -m "feat: ImportPageDialog (update / add-as-copy / cancel)"
```

---

## Task 9: Wire import + export into the sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add imports and the navigate hook**

In `src/components/Sidebar.tsx`, update the React Router import and add the others:

```ts
import { NavLink, useNavigate } from 'react-router-dom'
import { parsePageFile } from '../lib/pagefile'
import { ImportPageDialog } from './ImportPageDialog'
import type { PageDef } from '../types'
```

- [ ] **Step 2: Add page-file state + handlers inside `Sidebar`**

Inside the component, after the existing `deletePage` selector, add:

```ts
  const addPage = usePages((s) => s.addPage)
  const updatePageDef = usePages((s) => s.updatePageDef)
  const findByTemplate = usePages((s) => s.findByTemplate)
  const exportPage = usePages((s) => s.exportPage)
  const navigate = useNavigate()
  const pageFileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ def: PageDef; existingId: string } | null>(null)

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportPage(id: string, name: string) {
    setMenuFor(null)
    const json = exportPage(id)
    if (json) download(`${slugName(name)}.lifepage.json`, json)
  }

  function handleImportPageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parsePageFile(String(reader.result ?? ''))
      if (!result.ok) {
        // eslint-disable-next-line no-alert
        window.alert(`Import failed: ${result.reason}.`)
        return
      }
      const existingId = findByTemplate(result.def.templateId)
      if (existingId) {
        setPending({ def: result.def, existingId })
      } else {
        const id = addPage(result.def)
        navigate(`/p/${id}`)
      }
    }
    reader.readAsText(file)
  }

  function confirmUpdate() {
    if (!pending) return
    updatePageDef(pending.existingId, pending.def)
    navigate(`/p/${pending.existingId}`)
    setPending(null)
  }

  function confirmAddCopy() {
    if (!pending) return
    const id = addPage({ ...pending.def, templateId: crypto.randomUUID() })
    navigate(`/p/${id}`)
    setPending(null)
  }
```

Add this tiny helper next to the existing top-level `PageIcon` etc. (module scope, not inside the component):

```ts
function slugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
}
```

- [ ] **Step 3: Add the `[+]` button to the "Pages" header**

Replace the Pages header row:

```tsx
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="iz-label">Pages</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
```

with:

```tsx
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="iz-label">Pages</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <button
              type="button"
              onClick={() => pageFileRef.current?.click()}
              title="Import a page"
              className="iz-mono text-[13px] w-5 h-5 -mr-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.05] transition-colors duration-[var(--motion-fast)] inline-flex items-center justify-center"
            >
              +
            </button>
          </div>
          <input
            ref={pageFileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportPageFile}
            className="hidden"
          />
```

- [ ] **Step 4: Add "Export page" to the ⋯ menu**

In the `⋯` menu, above the "Delete page" button, add:

```tsx
                      <button
                        type="button"
                        onClick={() => handleExportPage(id, def.name)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04] transition-colors duration-[var(--motion-fast)]"
                      >
                        Export page
                      </button>
```

- [ ] **Step 5: Mount the dialog**

Just before the final closing `</div>` of the sidebar's root element, add:

```tsx
      <ImportPageDialog
        open={pending !== null}
        name={pending?.def.name ?? ''}
        localVersion={pending ? (pages[pending.existingId]?.def.version ?? 1) : 1}
        fileVersion={pending?.def.version ?? 1}
        onUpdate={confirmUpdate}
        onAddCopy={confirmAddCopy}
        onCancel={() => setPending(null)}
      />
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run test && npm run build`
Expected: clean, all pass, build succeeds.

- [ ] **Step 7: Manual check**

Run `npm run dev`:
- `⋯` → **Export page** downloads `<name>.lifepage.json`.
- `[+]` → pick that file → since the templateId matches, the **ImportPageDialog** appears: **Add as copy** creates a second page; re-import and choose **Update** → the page's def updates and its logged data survives.
- Edit the file's `templateId` to something new (or import a hand-written page file) → it adds as a brand-new page and navigates to it.
- A malformed/garbage `.json` → the alert names the reason.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: per-page export + page import with update/fork dialog"
```

**✅ Phase 2 ships here: full page export/import.**

---

## Self-review notes (for the implementer)

- **Spec coverage:** identity fields + file format (Task 1, 6) ✓; `dismissed`/deletable builtins (Task 1, 3) ✓; `normalizeStore` backfill + dismissed-aware merge, used by load + whole-store import (Task 2) ✓; dynamic sidebar with icon precedence (Task 4) ✓; `iconPath` render (Task 4, `PathIcon`) ✓; `/p/:id` routing + redirects + empty state (Task 5) ✓; pagefile validate/serialize, lenient identity (Task 6) ✓; add/update(keep-data)/find/export (Task 7) ✓; ImportPageDialog 3-way (Task 8) ✓; `[+]` import + `⋯` export + orchestration (Task 9) ✓.
- **Intentional deviation:** `slug`/`slugName` logic is duplicated (store helper in Task 7, sidebar export-filename helper in Task 9) rather than shared — they serve different layers (id minting vs filename) and are two lines each; extracting a shared util is optional cleanup, not required.
- **Known limitation (documented in spec):** updating a page whose new def renames a field key leaves old entries for the gone key inert (kept, not aggregated). Not handled here by design.
- **Builtins are not deletable-then-permanently-gone across reinstall:** the `dismissed` list lives in the store, so a reset (`resetAll`) clears it and builtins return. Expected.
- **Manual-only surfaces:** Sidebar/PageRoute/ImportPageDialog are verified by typecheck+build+manual (no DOM test harness in this project), consistent with prior phases.
