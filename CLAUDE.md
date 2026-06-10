# Project: Life-Dashboard

## What this is

Local-first web app for personal life-challenge tracking. Phase 1 = a single tracker: 100 pullups per day.

## Source of truth

`IMPLEMENTATION_PLAN.md` in the project root. If the plan and the code disagree, the plan wins. Always read the relevant plan section before writing any code in a new area.

## Visual DNA (from IznicOS)

Dark theme, glassy cards, three-font system, `color-mix()` for depth. See `IMPLEMENTATION_PLAN.md` section 2 for tokens and Appendix A for spacing/typography. Reference source files in `~/.iznicos/install/frontend/src/glyphs/` — especially `TodayHero.tsx`, `WhispersCard.tsx`, `ActivityHeatmap.tsx`, `StatTile.tsx`.

## Hard rules (do not break)

1. No hardcoded colors. Only `var(--*)`, `color-mix()`, `bg-white/[0.0X]`.
2. No Tailwind color classes (`text-gray-*`, etc.). Use the `var(--*)` form.
3. Only three fonts: Fraunces (display), Inter (body), JetBrains Mono (mono).
4. No backend. No database. No auth. All persistence in `localStorage` under `life-dashboard:v1`.
5. No new global state libs beyond Zustand.
6. No tests for v1 unless something risky emerges.
7. Commit after each phase: `feat: phase N — <title>`.
8. Preserve `IMPLEMENTATION_PLAN.md` — it is the source of truth.

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
