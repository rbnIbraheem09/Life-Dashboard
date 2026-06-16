# Marketplace (page-schema sub-project 4)

A community marketplace for dashboard **pages** — browse what others have made,
inspect exactly what a page contains, and install it in one click. It is the
distribution layer on top of the existing export/import system.

## Why it costs nothing to run

There is **no server, no database, no auth, no hosting bill**. The "marketplace"
is a single public JSON file in this repo (`registry/index.json`) served over
GitHub's raw CDN. The app reads it; people contribute pages by opening pull
requests. GitHub hosts the file and PR review is the safety gate.

```
app  ──fetch──►  raw.githubusercontent.com/<owner>/Life-Dashboard/master/registry/index.json
contributor  ──PR──►  registry/index.json  ──merge──►  live for everyone
```

## Always works (bundled-first, remote-additive)

The app ships a **bundled starter catalog** (`src/marketplace/catalog.ts`) baked
into the build, so the Marketplace is fully populated and usable **offline, with
no account**. On open it also tries to fetch the remote registry and merges it in
(remote wins by `id`). If the remote is unreachable — offline, or the repo isn't
pushed yet — it silently falls back to bundled. The registry goes live the moment
the repo is pushed to GitHub; nothing in the app needs to change.

`registry/index.json` is **generated** from the bundled catalog so the two never
drift: `npx vite-node scripts/gen-registry.ts`.

## Safety: pages are data, never code

A page is a `PageDef` — fields, blocks, a target, an icon path. The app renders
it with its own built-in components from a validated schema. **Nothing in a page
file is ever executed.** That is the core of the safety model:

- `lib/pagefile.ts` strictly validates every file at the import boundary. A file
  that fails cannot be installed.
- `marketplace/scan.ts` (`scanPage`) layers human-readable signals on top —
  size, field/block counts, web-style strings (`<script>`, `javascript:`, inline
  handlers, control chars), odd icon paths, unknown keys — and returns a verdict:
  - **safe** — valid, nothing notable.
  - **review** — valid and installable, but a `warn` finding is worth a glance.
  - **blocked** — fails validation; install disabled.
- The inspector shows the **exact JSON** that will be installed, alongside the
  report, so a person can eyeball anything before installing.

Install reuses the proven path: `parsePageFile → findByTemplate →` (existing →
`ImportPageDialog` update/copy) or (new → `addPage`). Pages install blank — no
one's personal data ever travels.

## Code map

| File | Role |
|---|---|
| `src/marketplace/types.ts` | `CatalogEntry`, `ScanResult`, `PageFile` shapes |
| `src/marketplace/catalog.ts` | bundled starter catalog (single source of truth) |
| `src/marketplace/scan.ts` | `scanPage` safety scanner (+ tests) |
| `src/marketplace/registry.ts` | remote fetch + merge + fail-safe fallback |
| `src/components/PageInspector.tsx` | inspect modal: report + raw-file viewer + install |
| `src/pages/MarketplacePage.tsx` | `/marketplace` route — Browse + Publish tabs |
| `registry/index.json` | the published manifest (generated) |
| `registry/README.md` | how to contribute a page |
| `scripts/gen-registry.ts` | regenerates `index.json` from the catalog |

## Publishing (from the app)

**Marketplace → Publish**: pick a page, then Download the `.lifepage.json`, Copy
the page JSON, or Copy a ready-made **registry entry** and open the registry on
GitHub to paste it into `entries` and open a PR. See `registry/README.md`.
