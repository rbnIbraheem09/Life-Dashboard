# Design — Page-Schema Spine (sub-project 1 of 5)

**Date:** 2026-06-14
**Status:** Approved (design); pending spec review → implementation plan
**Scope:** The foundational data-driven page system. This is the spine the rest of the release program hangs off.

---

## 0. Why this exists

The user wants Life-Dashboard to become an open-source, community-shareable dashboard where people author, export, import, and trade custom tracker "pages." Six asks were raised (export/import, refined/authorable code+data, marketplace, more default pages, reusable animations, personalized feedback). They are **not six features** — they are one foundation plus five things that fall out of it.

The forcing evidence is the existing code: `types.ts`'s persisted shape is *already* a generic daily-tracker (`{ goalPerDay, startedAt, days: { date: { entries[], total, goalHit } } }`), and `PullupPage.tsx` is *already* a 4-block composition (`HeroCounter → EntryLog → StatRow → ActivityHeatmap`). The product is one short step away from being data-driven; this spec takes that step.

---

## 1. The program (roadmap context — only sub-project 1 is specced here)

Each sub-project gets its own spec → plan → implementation cycle. The public release cut is **after all five** (user chose the full-program release line); build order is unchanged by that.

1. **Spine** ← *this spec*: motion primitives + generic v2 schema + migration + generic store + 5 blocks + `PageRenderer` + pullups migrated onto it + **Water** added (a second page is what actually *proves* "generic").
2. **More pages**: Reading + Sleep (exercises `duration` / `rating` / `range`-target).
3. **Export / Import**: in-app, page-def JSON ± data.
4. **Marketplace**: GitHub-repo browser + one-click install (safe because payloads are JSON, never code).
5. **Insights engine**: per-page stats/heuristics → natural-language feedback (no API key, no neural ML — a bounded stats+heuristics engine over the known schema).

**This spec delivers #1 only.** Everything in §11 (Non-goals) belongs to #2–#5.

---

## 2. Decisions locked (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Pages are data or code | **Data-driven** (page = JSON block-definition the app interprets) |
| 2 | Build approach | **Extract** the 4 frozen pullup cards into generic blocks; render pullups *through* the system (single source of truth) — overrides `CLAUDE.md` rule #4 with user authorization |
| 3 | Schema generality | **Generic but bounded**: a *closed* vocabulary of 6 field types + 6 aggregations that compose |
| 4 | Motion engine | **framer-motion** (`motion`) — for spring number bumps + `layout`/`AnimatePresence` list reflow. Not a state lib, so `CLAUDE.md` rule #6 is untouched |
| 5 | Release line | Full program (1–5) before public release |

---

## 3. The schema (storage v2)

### 3.1 Field types — closed set of 6

```ts
type FieldType = 'count' | 'number' | 'duration' | 'rating' | 'bool' | 'text'
```

| Type | Stored as | Notes / display | Example |
|---|---|---|---|
| `count` | non-neg integer | steppable (+/−), `step` configurable | pullup reps, water glasses |
| `number` | float | decimals | km run, body weight |
| `duration` | integer **minutes** | rendered `7h 20m` | sleep, reading time |
| `rating` | integer `1..scale` | bounded; `scale` in field def | sleep quality, mood |
| `bool` | boolean | did / didn't | took vitamins |
| `text` | string | freeform; never aggregated | a note |

### 3.2 Aggregations — closed set of 6

```ts
type Aggregation = 'sum' | 'avg' | 'last' | 'max' | 'min' | 'count'
```

`count` here = "number of entries that day" (independent of any field). `text` fields are not aggregatable.

### 3.3 Core types

```ts
type FieldDef = {
  key: string                 // stable id, e.g. "reps", "hours", "quality"
  type: FieldType
  label: string               // "Reps", "Hours slept"
  unit?: string               // "reps", "glasses", "pages"
  step?: number               // count/number stepper increment (default 1)
  scale?: number              // rating only: max value (e.g. 5)
  default?: number | boolean  // prefilled value when adding an entry
}

type Metric = { field: string; agg: Aggregation }   // e.g. { field:'reps', agg:'sum' }

type Target = {
  kind: 'atLeast' | 'atMost' | 'range'
  value: number               // atLeast/atMost: the threshold; range: the min
  max?: number                // range only: the upper bound
}

type Entry = {
  id: string                  // crypto.randomUUID()
  at: string                  // ISO timestamp
  fields: Record<string, number | boolean | string>  // keyed by FieldDef.key
}

type DayData = { entries: Entry[] }   // totals are DERIVED, never stored

type BlockType = 'hero' | 'entryLog' | 'statRow' | 'heatmap' | 'trend'
type BlockDef =
  | { type: 'hero';     metric?: Metric }                 // defaults to primaryMetric
  | { type: 'entryLog'; fields?: string[] }               // defaults to all fields
  | { type: 'statRow';  metric?: Metric }
  | { type: 'heatmap';  metric?: Metric }
  | { type: 'trend';    metric: Metric }                  // line/area over time

type PageDef = {
  schemaVersion: 1            // version of the PageDef format (for future export compat)
  id: string                  // "pullups", "water", or a uuid for user pages
  name: string                // "Pullup Challenge"
  emoji?: string              // sidebar/identity glyph (icons stay as today for built-ins)
  fields: FieldDef[]
  primaryMetric: Metric       // the headline metric (hero, target, streaks key off this)
  target: Target
  blocks: BlockDef[]          // ordered; rendered top→bottom in the standard layout
}

type PageState = { def: PageDef; data: { days: Record<string, DayData> } }

type StorageV2 = {
  version: 2
  pages: Record<string, PageState>
  order: string[]             // page id order (sidebar)
}
```

### 3.4 Target semantics (derived "goalHit")

For a day's aggregated primary-metric value `v`:
- `atLeast`: hit ⇔ `v >= value`
- `atMost`:  hit ⇔ `v <= value` **and** the day has ≥1 entry (an empty day is not a "win" by default for limit trackers; revisit if it feels wrong)
- `range`:   hit ⇔ `value <= v <= max`

This single enum covers count-up goals (pullups `atLeast 100`), ranges (sleep `range 420–540` min), and reduce-X trackers (sugar `atMost`) — the last unlocks a whole marketplace category for one enum value.

---

## 4. Aggregation & stats engine (`src/lib/metrics.ts`, new)

Pure functions, no React, fully unit-testable in isolation:

```ts
aggregate(entries: Entry[], metric: Metric): number          // applies agg over field values
dayValue(day: DayData, metric: Metric): number               // aggregate over one day
isGoalHit(value: number, target: Target): boolean
computeStats(days, primaryMetric, target): {                 // generalizes today's date.ts
  currentStreak, bestStreak, avgPerDay, goalHitPct, daysLogged
}
```

The current `date.ts` streak/stats logic is **pullup-specific** (reads `.sets`, `.totalReps`, `.goalHit`). It is generalized here to read through `dayValue(...)` + `isGoalHit(...)`. `getYearDays()` (the 7×53 grid builder) is generic already and stays in `date.ts`.

---

## 5. Migration (v1 → v2) — must preserve the user's real pullup data

The user has live data (`18/100` today). The migration is mandatory and non-lossy.

- localStorage keys: read existing `life-dashboard:v1`; write v2 to **`life-dashboard:v2`**. **Leave `life-dashboard:v1` in place as an untouched backup** (do not delete — safety net for an early release).
- On boot, `loadStorage()`:
  1. If `life-dashboard:v2` exists and validates → use it.
  2. Else if `life-dashboard:v1` exists and validates → **migrate** → write v2 → use it.
  3. Else → seed empty v2 (pullups + water built-ins, no data).
- Migration mapping for pullups:
  - `challenges.pullups.days[d].sets[]` → `pages.pullups.data.days[d].entries[]`, each `{ id, at: loggedAt, fields: { reps } }`.
  - `goalPerDay: 100` → `pages.pullups.def.target = { kind:'atLeast', value:100 }`, `primaryMetric = { field:'reps', agg:'sum' }`.
  - `def` for pullups comes from the built-in registry (§8); only the *data* is carried over.
  - `order: ['pullups', 'water']`.

The existing whole-data `exportJSON`/`importJSON` (the "Export data" / "Import data" buttons in `Sidebar.tsx`) continue to work but now serialize/validate the **v2** shape. (Per-page template export is sub-project #3, a different feature — out of scope here.)

---

## 6. Store refactor (`src/store/pages.ts`, replaces `dashboard.ts`)

`dashboard.ts` (frozen in Phase 1, hard-rule #4) is generalized into `usePages`:

```ts
usePages: {
  data: StorageV2
  addEntry(pageId, date, fields): void
  updateEntry(pageId, date, entryId, fields): void   // empty/zeroed primary field may delete (per type)
  deleteEntry(pageId, date, entryId): void
  exportData(): string                                // whole-store v2 backup (existing button)
  importData(json): void
  resetAll(): void
}
```

Selectors stay referentially stable (the `EMPTY` constant pattern in `TodaysSetsCard.tsx` is preserved). The 300ms debounced write in `storage.ts` is kept. `dashboard.ts` is deleted once consumers (`Sidebar`, blocks) point at `usePages`.

---

## 7. Blocks + `PageRenderer` (`src/blocks/`, new)

Five blocks, each binding to the schema via a `Metric`/field keys and reading data through `usePages` + `metrics.ts`. Four are extractions of the existing cards (same visuals, parameterized); one is new.

| Block | Extracted from | Binds | New? |
|---|---|---|---|
| `HeroCounter` | `HeroChallengeCard` | `primaryMetric` + `target` (progress fill, sub-line) | — |
| `EntryLog` | `TodaysSetsCard` | `fields[]` → one input control per field type; +/− steppers for `count` | — |
| `StatRow` | `StatsCard` | `computeStats(...)` | — |
| `ActivityHeatmap` | `ActivityGrid` | day `dayValue` vs `target` → cell intensity | — |
| `TrendChart` | **new** | a `Metric` over time (line/area; lightweight inline SVG, no chart lib) | ✅ |

`PageRenderer.tsx`:

```tsx
function PageRenderer({ pageId }: { pageId: string }) {
  const page = usePages(s => s.data.pages[pageId])
  // renders page.def.blocks[] in the standard layout:
  //   hero → entryLog → [ statRow | heatmap ] (2-col row, today's PullupPage grid)
  //   trend, if present, spans full width under the 2-col row
}
```

Layout is the **fixed standard layout** that mirrors today's `PullupPage` (vertical stack + one optional 2-col row). A free-form drag-drop layout *editor* is explicitly out of scope (a future spec). `EntryLog`'s per-field input rendering:
- `count` → number + `−1`/`+`/`×` row (today's pullup UX, now generic)
- `number` → number input with `step`
- `duration` → `h`/`m` paired inputs (or a single "minutes" input rendered as `7h 20m`)
- `rating` → a `1..scale` segmented control
- `bool` → a toggle
- `text` → a small note input

`TrendChart` is a hand-rolled inline-SVG sparkline/area (no new charting dependency — consistent with the "no icon library" precedent in `Sidebar.tsx`). framer-motion animates the path draw.

---

## 8. Built-in page registry (`src/registry/builtins.ts`, new)

Built-in pages are `PageDef` objects shipped in code (they are also the first reference templates):

- `pullups.ts`: field `reps` (count, step configurable in add form), `primaryMetric {reps,sum}`, `target {atLeast,100}`, blocks `[hero, entryLog, statRow, heatmap]`.
- `water.ts` *(the genericity proof)*: field `glasses` (count, default 1), `primaryMetric {glasses,sum}`, `target {atLeast,8}`, blocks `[hero, entryLog, statRow, heatmap]`. A different unit, default, and goal than pullups — proves the renderer is data-driven, not pullup-shaped.

Routing/nav: `App.tsx` replaces `<ComingSoon challenge="water"/>` with `<PageRenderer pageId="water"/>`; `/pullups` becomes `<PageRenderer pageId="pullups"/>`. `Sidebar.tsx` already lists all four pages — pullups + water now resolve to real pages; sleep + reading keep `ComingSoon` until sub-project #2. (The hand-drawn SVG icons in `Sidebar.tsx` stay; `emoji` in `PageDef` is for *user-authored* pages later.)

---

## 9. Motion primitives (`src/motion/`, new) — framer-motion

The user's screenshot pain: the per-set "8→9" bump (`iz-pulse`, retriggered by key-remount in `TodaysSetsCard.tsx:128`) exists *only* there; the hero "18" total has none. Root cause: motion lives inside one component instead of being shared. The fix is the spine's motion layer.

```
src/motion/
  springs.ts          // named presets (see below)
  AnimatedNumber.tsx  // tweens digits with a spring on value change (tabular-nums, no layout shift)
  AnimatedBar.tsx     // progress fill that springs to its target width
```

- `HeroCounter` uses `AnimatedNumber` for the headline → fixes the screenshot directly. `EntryLog` per-entry value and the running total also use it → the bump is everywhere, consistently.
- `EntryLog` list uses framer-motion `layout` + `AnimatePresence` so adding/removing/reordering entries reflows with the "liquid" slide, replacing the key-remount `iz-pulse` hack.

**Spring presets — grounded, not ballparked.** framer-motion's modern spring is parameterized by `duration` + `bounce` (the same response/damping-fraction model SwiftUI uses for `.smooth`/`.snappy`/`.bouncy`). Starting presets:

```ts
// springs.ts — starting values; final numbers tuned in the prototype harness
export const SPRING = {
  smooth: { type: 'spring', bounce: 0,    duration: 0.45 }, // no overshoot — bars, fades
  snappy: { type: 'spring', bounce: 0.18, duration: 0.40 }, // slight pop — number bumps
  bouncy: { type: 'spring', bounce: 0.32, duration: 0.55 }, // playful — celebratory only
} as const
```

Per the user's documented workflow (he tunes visuals himself and hands over exact numbers), these are **starting points**. A throwaway `prototype/motion-tuner.html` (mirroring the existing `prototype/aurora-tuner.html`) lets him *feel* `AnimatedNumber`/`EntryLog` with live `bounce`/`duration` sliders and report final values before they're committed. No exact Apple SDK constants are asserted — framer-motion's `bounce`/`duration` is used as the principled equivalent.

`prefers-reduced-motion` is honored (springs collapse to instant) — accessibility + it keeps the user's "no gratuitous motion" sensibility.

---

## 10. File-by-file change map

**New**
- `src/types.ts` — extend with the v2 types in §3 (keep a `migration`-local copy of the v1 types).
- `src/lib/metrics.ts` — aggregation + stats engine (§4).
- `src/lib/migrate.ts` — v1→v2 migration (§5).
- `src/store/pages.ts` — generic store (§6).
- `src/registry/builtins.ts` + `src/registry/pullups.ts` + `src/registry/water.ts` — built-in PageDefs (§8).
- `src/blocks/HeroCounter.tsx`, `EntryLog.tsx`, `StatRow.tsx`, `ActivityHeatmap.tsx`, `TrendChart.tsx`, `PageRenderer.tsx` (§7).
- `src/motion/springs.ts`, `AnimatedNumber.tsx`, `AnimatedBar.tsx` (§9).
- `prototype/motion-tuner.html` — throwaway tuning harness.

**Modified**
- `src/lib/storage.ts` — v2 load/validate/migrate wiring; keep debounce; v1 left as backup.
- `src/lib/date.ts` — keep `getYearDays`/`dateKey`; move pullup-specific stats out to `metrics.ts`.
- `src/App.tsx` — route `/pullups` + `/water` to `<PageRenderer/>`.
- `src/components/Sidebar.tsx` — point export/import at `usePages`; nav unchanged.
- `src/pages/PullupPage.tsx` — becomes a thin `<PageRenderer pageId="pullups"/>` (or is removed and routed directly).
- `package.json` — add `framer-motion`.

**Removed (logic absorbed elsewhere)**
- `src/store/dashboard.ts` → `src/store/pages.ts`.
- `src/components/HeroChallengeCard.tsx`, `TodaysSetsCard.tsx`, `StatsCard.tsx`, `ActivityGrid.tsx` → `src/blocks/*`.
- `src/components/ComingSoon.tsx` use for water (kept for sleep/reading until #2).

---

## 11. Non-goals (explicitly out of scope for the spine)

- **Export/import of a single page as a template** (sub-project #3). Whole-store data backup stays as-is.
- **Marketplace / GitHub browser** (#4).
- **Insights / feedback engine** (#5).
- **Reading + Sleep pages**, and therefore the *UI* for `range` targets and `rating`/`duration` entry inputs beyond what Water/pullups exercise (#2). The *schema* supports them now; the polished input UX lands with those pages.
- **Drag-drop layout editor** and user-authored-page creation UI. Built-ins are defined in code this round.
- **Per-page custom theming/emoji UI.**

---

## 12. Risks & gotchas

- **Frozen-component override**: §2.2 deliberately overrides `CLAUDE.md` rule #4 (and the `ui.ts` note that `dashboard.ts` is frozen). User authorized. The extraction must be visually 1:1 — the blocks should render pixel-identically to today's pullup page (verify by eye before/after).
- **Migration is one-way and touches real data.** v1 key is preserved as a backup; migration must be idempotent and guarded by the v2-exists check. Test with a copy of real localStorage.
- **`position:fixed` re-anchoring** (handoff gotcha): framer-motion sets `transform` during `layout` animations. Do **not** wrap anything that contains a `position:fixed` descendant (e.g. `DayDrawer`) in a `motion` `layout` element — it would re-anchor the fixed child. Keep `layout` scoped to the `EntryLog` list items.
- **No banding / no invented surface values** (handoff gotcha): motion changes opacity/transform only; it must not introduce new background/blur values. Panels keep `.iz-panel`/`--panel-bg`.
- **framer-motion + `tabular-nums`**: `AnimatedNumber` must reserve width (tabular figures) so digit changes don't reflow neighbors.

---

## 13. Success criteria (verification before "done")

1. `npx tsc --noEmit` → 0 errors; `npm run build` → exit 0; `cargo check` (tauri) → Finished.
2. Existing pullup data survives boot (the `18/100` day, all sets, streaks, heatmap identical to pre-migration).
3. The pullup page renders **pixel-identically** to today, but now via `PageRenderer` + blocks.
4. The **Water** page works end-to-end (add/edit/delete glasses, hero/stats/heatmap update, target `atLeast 8`) — proving genericity on a non-pullup page.
5. The hero number animates with the same (now shared) spring as the per-entry number — the screenshot complaint is resolved — and `EntryLog` items slide on add/remove.
6. `prefers-reduced-motion` disables springs.
7. Unit tests for `metrics.ts` + `migrate.ts` (the two pure, risky, data-touching modules — justified exception to the "no tests for v1" rule, which is about UI).

---

## 14. Commit strategy

The spine is large; per `CLAUDE.md` rule #8 (commit-per-phase) this program's sub-projects are the new "phases." The spine commits as a small ordered series (schema+migration+store → blocks+renderer → motion → water+wiring), each `feat:`/`chore:` with the `Co-Authored-By: Claude Opus 4.8` trailer, so the diff stays reviewable. Final commit message references this spec.
