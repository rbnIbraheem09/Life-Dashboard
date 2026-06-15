# Page Sharing — design

**Date:** 2026-06-15
**Program:** page-schema (sub-project 3 of 5 — "Export / Import")
**Status:** approved, ready for implementation plan

## Goal

Let a user **export one page as a blank template**, send the file to someone else, and
have them **import it as a new page added to their dashboard** — without losing their
own pages or data. This is the feature that turns Life-Dashboard into something a
community can build on (serves the product vision; precedes the marketplace, sub-project
4).

The existing "Export data / Import data" buttons are a **whole-store backup/restore** —
a *different* feature that stays as-is (relabeled "Export/Import backup" for clarity).

## The hidden prerequisite

The sidebar (`Sidebar.tsx`) and routes (`App.tsx`) are currently **hardcoded** — a fixed
list of `pullups/water/sleep/reading` with fixed paths and hand-drawn SVG icon
components. The store already holds pages generically (`data.pages` map + `order`), but
the UI can't show arbitrary pages. So "import a page and use it" requires making
navigation **data-driven** first. This sub-project therefore has two coupled phases:

1. **Dynamic pages** — store-driven sidebar + routing + delete.
2. **Sharing** — single-page export + validated import with template identity.

## Decisions (from brainstorming)

- **Export payload:** blank template — the `PageDef` only, **no personal entries**.
- **Import identity:** smart update via a stable `templateId` — re-importing a page you
  already have offers **Update (keeps your data)** or **Add as copy** (fork).
- **Custom icons:** add `iconPath?: string` (SVG path data) to `PageDef` so custom pages
  can ship a portable vector icon, rendered inside our own `<svg>` (safe — path data
  can't execute). Single path; multi-shape icons fall back to emoji.
- **Deletable builtins:** yes, via a `dismissed: string[]` list so the builtin-merge
  won't resurrect a deleted builtin on reload.

## Data model

### `PageDef` gains three fields (`src/types.ts`)

```ts
export type PageDef = {
  schemaVersion: 1
  id: string             // LOCAL store key — unique within THIS user's store; the route + sidebar key
  templateId: string     // STABLE lineage id — shared across copies/versions; what import matches on (NEW)
  version: number        // template version — informational + update-hint gate (NEW)
  name: string
  emoji?: string
  iconPath?: string      // optional SVG path `d` string, rendered in our own <svg> (NEW)
  fields: FieldDef[]
  primaryMetric: Metric
  target: Target
  blocks: BlockDef[]
}
```

- `id` = where it lives in your store (minted fresh on import — the file's `id` is ignored).
- `templateId` = which template lineage it descends from (preserved on import/update;
  minted fresh on fork or first authoring).

### `StorageV2` gains `dismissed`

```ts
export type StorageV2 = {
  version: 2
  pages: Record<string, PageState>
  order: string[]
  dismissed: string[]    // builtin ids the user deleted — merge skips these (NEW)
}
```

### Builtins get stable identity (`src/registry/*.ts`)

Each builtin def gains `templateId: 'builtin:pullups'` (etc.) and `version: 1`. So
exporting a builtin and importing it on another machine that has the same builtin matches
by `templateId` and offers Update — the smart-update path.

### Export file format (`*.lifepage.json`)

```jsonc
{
  "kind": "life-dashboard/page",   // magic string, checked on import
  "format": 1,                      // file-format version
  "def": { /* PageDef incl. templateId, version, iconPath; the `id` is ignored on import */ }
}
```

No `data` — def only.

## New unit: `src/lib/pagefile.ts` (pure, TDD)

The import safety boundary. Untrusted input is never trusted; only validated data installs.

```ts
export type PageFileResult =
  | { ok: true; def: PageDef }
  | { ok: false; reason: string }

/** Serialize a page's def as a shareable, def-only file (no entries). */
export function serializePage(def: PageDef): string

/**
 * Parse + validate untrusted file text into a PageDef.
 * STRICT on structure: kind/format, every FieldDef (key:string, type ∈ FieldType,
 *   label:string, optional unit/step/scale/default of the right types), primaryMetric
 *   (field:string, agg ∈ Aggregation), target (kind ∈ atLeast|atMost|range with numbers),
 *   blocks (type ∈ known set; `trend` requires a metric). Reject → { ok:false, reason }.
 * LENIENT on identity: mint templateId (crypto.randomUUID) if absent, default version
 *   to 1, pass iconPath through if it's a string. The returned def always has a
 *   templateId + version.
 */
export function parsePageFile(text: string): PageFileResult
```

`serializePage` strips nothing but data (there is no data on a def); it emits
`{ kind, format: 1, def }`.

## Store actions (`src/store/pages.ts`)

```ts
addPage: (def: PageDef) => string          // mint unique local id from name slug; if def has no
                                            // templateId, mint one; append to pages + order; remove
                                            // from dismissed; persist; return the new local id
updatePageDef: (localId: string, def: PageDef) => void  // swap def, KEEP data.days; persist
deletePage: (localId: string) => void      // remove from pages + order; if builtin id, add to dismissed; persist
findByTemplate: (templateId: string) => string | undefined  // local id of a page with that templateId
exportPage: (localId: string) => string    // serializePage(pages[localId].def)
```

`addPage` id minting: `slug(name)`; if taken, append `-` + a short base36 suffix until
unique. (`slug` = lowercase, spaces→`-`, strip non `[a-z0-9-]`.)

## Storage / migration (`src/lib/storage.ts`)

Introduce **`normalizeStore(store): StorageV2`** — the single pipeline used by *both*
`loadStorage` and the whole-store `importData`, so any store entering the app is brought
to current shape consistently. It:

- Runs `mergeMissingBuiltins` (add missing builtins, respecting `dismissed`).
- Ensures `dismissed: []` exists on older stores.
- Backfills canonical `templateId` + `version` onto builtin pages missing them.
- Mints a `templateId` for any non-builtin page missing one.

And `mergeMissingBuiltins` skips ids present in `dismissed` (so a deleted builtin stays
  gone), in addition to ids already present. It reads `store.dismissed ?? []` so it
  tolerates older stores that predate the field.
- Persist only if something changed (like the existing merge).

`emptyStorage` and the v1→v2 migration include `dismissed: []` and stamp builtin
identity. **`isValidV2` stays lenient — it does NOT require `dismissed`** (older
whole-store backups lack it, and that path must keep importing); the normalize step
backfills `dismissed: []` onto any loaded/imported store missing it.

## Dynamic pages (UI)

### Sidebar (`src/components/Sidebar.tsx`)

- Replace the hardcoded `BUILT_IN_PAGES` array with a map over the store's `order` →
  `pages`. Each row links to `/p/:id`, shows the name + an icon.
- **Icon precedence:** `def.iconPath` (rendered as `<svg viewBox="0 0 16 16"
  stroke="currentColor" …><path d={iconPath} /></svg>`) → a builtin `id → icon`
  component map (keeps the existing hand-drawn SVGs) → `def.emoji` → a fallback dot.
- **Per-row `⋯` menu** (appears on hover): **Export page** (Phase 2) and **Delete page**
  (`window.confirm`, consistent with the import guard).
- **`[+]` on the "Pages" header** → Import page file picker (Phase 2).
- Footer: existing whole-store buttons relabeled **Export backup / Import backup**.

### Routing (`src/App.tsx`)

- Replace the four fixed page routes with one dynamic route:
  `<Route path="/p/:pageId" element={<PageRoute />} />`, where `PageRoute` reads the
  param and renders `<PageRenderer pageId={id} />`, or redirects to the first page if the
  id isn't in the store.
- `/` redirects to the first page in `order` (not a hardcoded `/pullups`).
- `/settings` unchanged.
- Old `/pullups` (etc.) redirect to `/p/pullups` so existing links/muscle-memory don't break.

## Import flow (`ImportPageDialog`)

The sidebar `[+]` opens a file picker → reads text → `parsePageFile`:

1. `{ ok:false }` → `window.alert('Import failed: <reason>')`.
2. `{ ok:true, def }` → `findByTemplate(def.templateId)`:
   - **none** → `const id = addPage(def)` → navigate to `/p/${id}`.
   - **match (existingId)** → open **`ImportPageDialog`** (`src/components/ImportPageDialog.tsx`),
     a small overlay styled like the existing modals (`bg-black/40` backdrop + `iz-panel`
     card). It shows the page name and `you: v{local} · file: v{file}`, with three actions:
     - **Update** → `updatePageDef(existingId, def)` (keeps the user's data), navigate to it.
     - **Add as copy** → `addPage({ ...def, templateId: crypto.randomUUID() })` (forks a new
       lineage), navigate to the copy.
     - **Cancel** → close, no change.

### Error handling / edge cases

- Invalid/hostile file → rejected by `parsePageFile` with a human reason; nothing installs.
- Field-key mismatch on Update (a new def renames/removes a field) → old entries for the
  gone key are kept (lossless) but simply don't aggregate under the new schema. Documented
  behavior, not a bug.
- Deleting the currently-open page → navigate to the first remaining page.
- Deleting the last page → allowed; `/` shows an empty-state (no pages) until one is added
  back or imported. (Builtins can be restored later via a Settings "restore" affordance —
  out of scope here; the `dismissed` list makes it possible.)

## Testing

- **`src/lib/pagefile.test.ts`** (pure): serialize→parse round-trip; reject wrong
  `kind`/`format`; reject bad field type, bad `agg`, bad `target`, unknown block type;
  mint `templateId` when missing; default `version`; preserve `iconPath`; confirm export
  carries no `data`.
- **`src/store/pages.test.ts`** (extend): `addPage` mints a unique id + appends `order`;
  `updatePageDef` keeps `data.days`; `deletePage` removes + records builtin in `dismissed`;
  `findByTemplate`; `exportPage` → `parsePageFile` round-trip; a dismissed builtin is not
  resurrected by the merge.
- **Storage**: normalize backfills `templateId`/`version`; merge respects `dismissed`.
- **Components** (Sidebar, PageRoute, ImportPageDialog): `npm run typecheck` + `npm run
  build` + manual check (matches the project's component testing approach).

## Phasing (one plan, two phases)

- **Phase 1 — Dynamic pages.** `types.ts` (+`templateId`/`version`/`iconPath`,
  `StorageV2.dismissed`); builtins get identity; `storage.ts` normalize + merge-respects-
  dismissed + `emptyStorage`/migration; store `deletePage`; dynamic `Sidebar` (icon
  precedence + `⋯`→Delete) and `/p/:id` routing. **Ships: data-driven nav + deletable
  pages.**
- **Phase 2 — Sharing.** `lib/pagefile.ts`; store `addPage`/`updatePageDef`/
  `findByTemplate`/`exportPage`; sidebar `[+]` Import + `⋯`→Export; `ImportPageDialog`.
  **Ships: full export/import.**

## Out of scope (this sub-project)

- In-app page **authoring** (creating/editing a page through UI). Pages are authored in
  code/JSON; export/import is the sharing mechanism.
- **Marketplace** / GitHub browser (sub-project 4).
- Multi-shape custom SVG icons (would need a whitelist sanitizer).
- Version *channels* / semver / auto-update notifications (`version` stays a simple
  informational integer).
- A Settings "restore dismissed builtins" UI (the `dismissed` list enables it later).

## Hard rules honored

No hardcoded colors (only `var(--*)` / `color-mix()` / `bg-white/[0.0X]`), three fonts
only, no new global-state libs, no new deps, the file payload is pure JSON (never code) —
validated before install. Commits per phase (`feat:`).
