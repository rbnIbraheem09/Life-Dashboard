# Project: Life-Dashboard

## What this is

Local-first personal dashboard for tracking life challenges. Phase 1 (web, complete): pullup tracker. Phase 2 (in progress): Tauri 2.0 desktop shell + ARC sidebar.

## Source of truth

- `IMPLEMENTATION_PLAN.md` — Phase 1 plan. Preserved, do not edit.
- `docs/PHASE_2_PLAN.md` — Phase 2 plan (Tauri shell + sidebar). Read this for any desktop / sidebar / native-menu work.

If a plan and the code disagree, the plan wins.

## Visual DNA (from IznicOS)

Dark theme, glassy cards, three-font system, `color-mix()` for depth. See `IMPLEMENTATION_PLAN.md` section 2 for tokens and Appendix A for spacing/typography. Reference source files in `~/.iznicos/install/frontend/src/glyphs/` — especially `TodayHero.tsx`, `WhispersCard.tsx`, `ActivityHeatmap.tsx`, `StatTile.tsx`.

## Hard rules (do not break)

1. No hardcoded colors. Only `var(--*)`, `color-mix()`, `bg-white/[0.0X]`.
2. No Tailwind color classes (`text-gray-*`, etc.). Use the `var(--*)` form.
3. Only three fonts: Fraunces (display), Inter (body), JetBrains Mono (mono).
4. **Phase 1 components are FROZEN.** During Phase 2, do not modify any of: `HeroChallengeCard.tsx`, `TodaysSetsCard.tsx`, `StatsCard.tsx`, `ActivityGrid.tsx`, `DayDrawer.tsx`, `HelpOverlay.tsx`, `PullupPage.tsx`, `src/lib/*`, `src/store/*`, `src/types.ts`, `src/main.tsx`, `src/index.css`. The only frontend files Phase 2 may modify are: `App.tsx` (for layout changes), plus the new `Sidebar.tsx`, `Ribbon.tsx`, `globals.d.ts`. `TopNav.tsx` is the browser-fallback during 2.3-2.4 and is removed in 2.5.
5. No backend. No database. No auth. All persistence in `localStorage` under `life-dashboard:v1` — including in the Tauri build (the WebView preserves it).
6. No new global state libs beyond Zustand.
7. No tests for v1 unless something risky emerges.
8. **Commit per phase.** One commit per Phase (2.0 through 2.5). Use the prefix `feat:`, `chore:`, or `fix:` as appropriate.
9. Preserve both plan files.

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind v3 (NOT v4 — peer-dep issues with the font import)
- React Router 6, Zustand 4, date-fns 3, clsx 2

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npx tsc --noEmit   # type-check
npm run build      # production build
```

## Phase completion status

Track progress with `git log --oneline`. Each phase is one commit.
