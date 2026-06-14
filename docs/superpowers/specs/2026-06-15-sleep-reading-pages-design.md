# Sleep + Reading pages — design

**Date:** 2026-06-15
**Program:** page-schema (sub-project 2 of 5 — "More pages")
**Status:** approved, ready for implementation plan

## Goal

Build the two stubbed pages (`/sleep`, `/reading`, currently `ComingSoon`) as real
data-driven pages. This is the **genericity proof** for the page-schema engine: it
exercises the field types and target kinds that pullups/water never touched —
`duration`, `rating`, and a `range` target — and proves the engine can host two
pages with *different* logging models.

## Guiding principle (from the user)

> Each page has its own model. A page reuses an existing logging model **only if it
> genuinely matches** another page; otherwise it gets a new one. Don't contort one
> engine to force every page through a single logging interaction.

Concretely:

- **Reading** matches pullups/water (you log multiple additive sessions across the
  day, summed). → **Reuse and extend** the existing `EntryList` additive model.
- **Sleep** does not (you record one night, with a quality, and *edit* it rather
  than increment). → **New `DailyRecord` logging model.**

Everything *downstream* of logging — hero, stats, heatmap, trend, storage, migration
— stays generic and shared. Only the logging interaction is per-page.

## Page definitions

### Reading 📖 — additive sessions

```ts
{
  schemaVersion: 1,
  id: 'reading',
  name: 'Reading',
  emoji: '📖',
  fields: [
    { key: 'pages',   type: 'count',    label: 'Pages',   unit: 'pages', step: 1, default: 20 },
    { key: 'minutes', type: 'duration', label: 'Minutes', unit: 'min' },
  ],
  primaryMetric: { field: 'pages', agg: 'sum' },
  target: { kind: 'atLeast', value: 30 },
  blocks: [{ type: 'hero' }, { type: 'entryLog', fields: ['pages', 'minutes'] },
           { type: 'statRow' }, { type: 'heatmap' },
           { type: 'trend', metric: { field: 'pages', agg: 'sum' } }],
}
```

- `pages` is the primary (drives the hero, the `+/−` stepper, the goal).
- `minutes` is a **secondary** duration field captured at add-time and shown in the row.
- A session row reads `20 pages · 35m`. `+/−` bumps pages by `step`; delete removes the session.
- `minutes` is set when the session is logged; it is not inline-editable in v1.

### Sleep 🌙 — one record per night

```ts
{
  schemaVersion: 1,
  id: 'sleep',
  name: 'Sleep',
  emoji: '🌙',
  fields: [
    { key: 'hours',   type: 'duration', label: 'Hours',   unit: 'h', step: 0.5 },
    { key: 'quality', type: 'rating',   label: 'Quality', scale: 5 },
  ],
  primaryMetric: { field: 'hours', agg: 'sum' },
  target: { kind: 'range', value: 7, max: 9 },
  blocks: [{ type: 'hero' }, { type: 'dailyRecord' },
           { type: 'statRow' }, { type: 'heatmap' },
           { type: 'trend', metric: { field: 'hours', agg: 'sum' } }],
}
```

- One record per day: the `DailyRecord` block **creates or replaces** a single entry
  for the day. With one entry, `sum(hours)` equals the recorded value, so the generic
  hero/heatmap/trend all read correctly.
- `quality` is a secondary `rating` field, displayed on the record (and the heatmap
  drawer). It is not part of any metric in v1.
- Target is a `range` (7–9h). `lib/metrics.ts` already implements `range` for
  `isGoalHit`/`progressPct`; no math change needed.

## New shared primitives

### `lib/duration.ts` — `formatDuration(value, unit)`

Pure, unit-tested. Renders a duration stored in its declared base unit as human text:

| input          | output    |
|----------------|-----------|
| `(7.5, 'h')`   | `7h 30m`  |
| `(8, 'h')`     | `8h`      |
| `(35, 'min')`  | `35m`     |
| `(95, 'min')`  | `1h 35m`  |
| `(0, 'h')`     | `0h`      |

Implementation: convert to total minutes (`unit === 'h' ? value*60 : value`), split
into `h`/`m`, drop a zero component (`7h`, not `7h 0m`; `35m`, not `0h 35m`), keep
`0h` for an empty value.

### `DurationInput` (component)

- `unit: 'h'` → two boxes: `[ 7 ]h [ 30 ]m`, composing to a decimal-hours number.
- `unit: 'min'` → one box: `[ 35 ]m`.
- Emits a single number in the field's unit. Styling matches the existing
  `EntryList` number input (mono, `bg-white/[0.03]`, `var(--border)`).

### `RatingDots` (component)

- Renders `scale` dots; filled up to `value` use `var(--accent-1)`, empty use the
  muted border tone. Click a dot to set the value. Echoes the 6px accent dot in
  block headers (chosen over stars/numerals).
- Read-only mode for display, interactive mode for the form.

## Block-layer changes

| File | Change |
|------|--------|
| `types.ts` | Add `{ type: 'dailyRecord' }` to the `BlockDef` union. (`duration`/`rating`/`range` already exist.) |
| `blocks/EntryList.tsx` | Honor the block's secondary `fields`: render an input per configured field in the add form, and show secondary values in each row. Primary `count` keeps its `+/−` stepper behavior unchanged. Secondary `duration` uses `DurationInput`. |
| `blocks/DailyRecord.tsx` (new) | Sleep's logger. Empty → a form (`DurationInput` hours + `RatingDots` quality). Present → the filled record with click-to-edit + clear. Create-or-replace the single day entry via `addEntry`/`updateEntry`/`deleteEntry`. |
| `blocks/HeroCounter.tsx` | Format `duration` primaries via `formatDuration` (number + goal). Make the subline **range-aware**: `In range ✓` / `30m under` / `1h over`, instead of always `X to go`. |
| `blocks/StatRow.tsx` | Format the average via `formatDuration` when the primary is a duration. |
| `lib/metrics.ts` | `computeStats` returns `avgPerDay` **unrounded** (raw float). Rounding moves to the display layer so count pages round (`47 reps`) and duration pages format (`7h 45m`) — no precision loss. Update `metrics.test.ts` accordingly. |
| `blocks/EntryLog.tsx` + `components/DayDrawer.tsx` | Stop hardcoding `EntryList`. Resolve the page's logger from its blocks: `entryLog → EntryList`, `dailyRecord → DailyRecord`. Makes retroactive logging from the heatmap work for Sleep. |
| `blocks/ActivityHeatmap.tsx`, `blocks/TrendChart.tsx` | Format duration values in the tooltip / unit label. |
| `blocks/PageRenderer.tsx` | Render the `dailyRecord` block where `entryLog` would go. |

### The logger seam

`EntryLog` and `DayDrawer` currently `import { EntryList }` directly. Introduce a
small resolver — given a page's blocks, return the logging component to mount
(`EntryList` for `entryLog`, `DailyRecord` for `dailyRecord`). Both call sites use it.
Keep it dead simple (a function/switch in one place), not a registry abstraction —
there are two models.

## Storage: additive builtin merge

Migration seeds builtins **once** (`emptyStorage` / `migrateV1toV2`), so an existing
v2 store (the user already has one with pullups + water) will not contain Sleep or
Reading. `loadStorage` must additively merge:

- After loading a valid v2, for every id in `BUILTIN_ORDER` not present in
  `store.pages`, add `{ def: BUILTIN_DEFS[id], data: { days: {} } }` and append the id
  to `store.order`.
- **Never** overwrite an existing page's `def` (the user may have edited it) and
  **never** reorder existing ids — only append missing builtins.
- Persist immediately after a merge (like migration) so it is durable.
- Unit-tested: existing pages + data + order preserved; missing builtins appended.

## Registry / routing / sidebar

- New `registry/sleep.ts`, `registry/reading.ts`; add both to `registry/builtins.ts`
  `BUILTIN_DEFS` and `BUILTIN_ORDER` (order: `pullups, water, sleep, reading` — to
  match the sidebar's existing visual order in `Sidebar.tsx`).
- `App.tsx`: replace the `/sleep` and `/reading` `ComingSoon` routes with
  `<PageRenderer pageId="sleep" />` / `"reading"`. Delete `components/ComingSoon.tsx`.
- `Sidebar.tsx` already lists Sleep + Reading with icons — no change needed.

## Out of scope (v1)

- Avg-quality stat cell (quality stays display-only on the record + drawer).
- Range-aware heatmap coloring (intensity ladder stays `value / max`; a 9h night
  reads as the darkest cell — acceptable, documented limitation).
- Naps as separate Sleep entries (the daily-record model is one entry/day).

## Verification

- `npx tsc --noEmit` clean.
- `npm run test` — new tests pass: `duration.test.ts` (`formatDuration` table),
  `metrics.test.ts` (unrounded avg), `storage`/`migrate` additive-merge test.
- Manual: Sleep + Reading appear in the sidebar with existing pullup/water data
  intact; log a Reading session (pages + minutes) and a Sleep night (hours + quality);
  hero shows `7h 30m` in range; retroactive logging via the heatmap works for both.

## Hard rules honored

No hardcoded colors (only `var(--*)` / `color-mix()` / `bg-white/[0.0X]`), three fonts
only, no new global state libs, no new deps, one `feat:` commit for the sub-project.
