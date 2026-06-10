# Life-Dashboard — Pullup Tracker (Phase 1)

> **Project root:** `~/Desktop/Life-Dashboard/`
> **Build target:** Local web app (Vite + React + TypeScript) with a single-page dashboard for tracking a daily 100-pullup challenge. Designed to be extended later with additional "life tracker" pages.
> **Visual reference:** IznicOS dashboard at `~/.iznicos/install/` (especially `frontend/src/glyphs/`). Aesthetic DNA: dark, glassy, gradient-text heroes, generous whitespace, three-font system (Fraunces / Inter / JetBrains Mono), `color-mix()` everywhere.

---

## 1. Title + Elevator Pitch

**Life-Dashboard** is a local-first, single-user dashboard for tracking personal life challenges. Phase 1 ships **one tracker page: a 100-pullups-per-day challenge** with set-by-set logging, a GitHub-style yearly activity grid, and a stat strip. The architecture is intentionally multi-page so future trackers (water, reading, gym) drop in as additional routes.

**Why a new app and not IznicOS?** The user has a separate roadmap for IznicOS. This is its own thing — same aesthetic DNA, different domain, more minimal scope.

---

## 2. Context & Compatibility

| Aspect | IznicOS (reference) | Life-Dashboard (ours) | Match? |
|---|---|---|---|
| Build tool | Vite 5 | Vite 5 | ✅ match |
| Frontend | React 18 + TypeScript | React 18 + TypeScript | ✅ match |
| Styling | Tailwind v3 + CSS variables (`var(--*)`) | Tailwind v3 + CSS variables | ✅ match |
| Fonts | Fraunces (display) / Inter (body) / JetBrains Mono (mono) | Same three fonts | ✅ match |
| Theme tokens | `--bg`, `--surface`, `--text`, `--text-dim`, `--text-muted`, `--border`, `--border-active`, `--accent-1/2/3` | Same set, same naming | ✅ match |
| State | React + fetch (no global store in IznicOS glyphs) | React + fetch, single Zustand store for current-day live state | ⬆ small upgrade |
| Persistence | Hermes state.db (SQLite, owned by Hermes) | **Local `localStorage`** (zero backend, no auth) | ⬆ different by design |
| Backend | Bun + Hono on :5699 | **None** — pure SPA | ⬆ different by design |
| Routing | Sidebar + custom pages in `dashboard.json` | React Router 6 with `/pullups` and a stub `/` redirect | ⬆ simplified |

### Design tokens (locked — copy verbatim into `:root`)

```css
:root {
  --bg: #06040C;
  --surface: #0E0B18;
  --text: #E8E4F0;
  --text-dim: #A1A1AA;
  --text-muted: #71717A;
  --border: rgba(255, 255, 255, 0.06);
  --border-active: rgba(167, 139, 250, 0.25);
  --accent-1: #C4B5FD; /* violet — primary */
  --accent-2: #F472B6; /* pink — mid */
  --accent-3: #FBBF24; /* amber — end, warning */
  --radius: 14px;
  --font-display: 'Fraunces', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### New dependencies (add to `package.json`)

| Package | Purpose | Size | License |
|---|---|---|---|
| `react-router-dom@^6` | Multi-page routing for future trackers | ~50KB | MIT |
| `zustand@^4` | Tiny global store for "today's live set log" | ~3KB | MIT |
| `date-fns@^3` | Date math for the activity grid (year buckets, day keys) | ~20KB tree-shaken | MIT |
| `clsx@^2` | Conditional className joiner | ~1KB | MIT |

**No backend. No database. No auth.** All data in `localStorage` under key `life-dashboard:v1`.

### Fonts (load via Google Fonts `<link>` in `index.html`)

```
https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## 3. Visual Design Concept

### Page layout (Pullup Tracker — `/pullups`)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ● ACTIVE          Life-Dashboard         [Pullups] [•] [Water] [+] │  ← top nav, 64px
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PULLUP CHALLENGE                                                    │  ← .iz-label eyebrow
│  100 reps / day                                                       │
│                                                                      │
│  73 / 100                                                            │  ← hero number, gradient text
│                                                                      │
│  ── 27 reps to go · 4 sets logged · 10:24 AM ──                     │  ← .iz-mono detail
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ TODAY'S SETS                                       [+ Add]   │    │  ← narrative card
│  │                                                              │    │
│  │   1   12 reps   10:01 AM        [- 1] [+]                    │    │
│  │   2   10 reps   10:04 AM        [- 1] [+]                    │    │
│  │   3   11 reps   10:08 AM        [- 1] [+]                    │    │
│  │   4    8 reps   10:11 AM        [- 1] [+]                    │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────┐  ┌──────────────────────────────────────┐    │
│  │ STATS              │  │ ACTIVITY · 2026                      │    │
│  │                    │  │                                      │    │
│  │ Current streak  9  │  │ M  ░░▓▓░░ ░▓▓▓░ ░▓▓░ ...            │    │  ← GitHub-style
│  │ Best streak    14  │  │ T  ░░░▓░ ░▓░░▓ ▓▓▓▓░ ...            │    │     yearly grid
│  │ Avg / day    103   │  │ W  ░▓░░░ ▓░░▓░ ░▓░▓░ ...            │    │     7 rows × 53 cols
│  │ Goal hit    67%    │  │ T  ░▓▓▓░ ░░▓░░ ░▓▓░░ ...            │    │
│  │                    │  │ F  ░░░░░ ░▓▓░░ ░▓░░░ ...            │    │
│  │                    │  │ S  ▓▓▓░░ ░▓▓▓░ ░░▓▓░ ...            │    │
│  │                    │  │ S  ░▓░░░ ░▓░░░ ░▓▓▓░ ...            │    │
│  │                    │  │                                      │    │
│  │                    │  │ [less] ░▒▓█ [more]                  │    │
│  └────────────────────┘  └──────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Interaction design

| Action | Behavior |
|---|---|
| Click `+ Add` on sets card | Inline form expands: numeric input (default 10), Enter or `+ Add` button submits |
| Click `[+]` next to a set | Increments that set's reps by 1, animates a tiny pulse on the number |
| Click `[- 1]` next to a set | Decrements by 1, deletes the set if it hits 0 |
| Click a day cell on the activity grid | Tooltip shows date + reps + sets count. Click expands the day in a side drawer showing each set |
| Press `a` anywhere on the page | Focuses the "add set" input (keyboard shortcut) |
| Press `?` | Opens a small help overlay listing shortcuts |
| Hover a card | Border lifts to `var(--border-active)`, surface tints to `var(--accent-1)/[0.03]` |
| All day-cell colors | 0 reps = `bg-white/[0.04]`; 1-49 = `var(--accent-1)/20`; 50-79 = `var(--accent-1)/45`; 80-99 = `var(--accent-1)/70`; ≥100 = `var(--accent-1)` |

### Color philosophy (pulled from IznicOS `iznicos-dashboard` skill, section 1.1)

- Background: deepest `--bg` page wash, optional aurora spots behind the hero
- Cards: `bg-[var(--surface)]` with `border border-[var(--border)]` — no exceptions
- The hero number uses gradient text: `linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-3))` with `WebkitBackgroundClip: text`
- Sets card gets a premium gradient: `linear-gradient(135deg, color-mix(in srgb, var(--accent-1) 6%, transparent), color-mix(in srgb, var(--accent-2) 4%, transparent))`
- All decorative elements use `color-mix()` with low opacity — never flat colors

---

## 4. Architecture

### Data model

All data persists in `localStorage` under one key: `life-dashboard:v1`. Schema:

```ts
type Storage = {
  version: 1;
  challenges: {
    pullups: ChallengeData;
  };
};

type ChallengeData = {
  goalPerDay: number;          // 100 for pullups
  startedAt: string;           // ISO date of first logged set ever
  days: Record<string, DayEntry>;  // key = "YYYY-MM-DD"
};

type DayEntry = {
  date: string;                // "YYYY-MM-DD"
  sets: PullupSet[];
  totalReps: number;           // sum of sets[].reps — denormalized for fast heatmap read
  goalHit: boolean;            // totalReps >= goalPerDay
};

type PullupSet = {
  id: string;                  // crypto.randomUUID()
  reps: number;                // 1..100
  loggedAt: string;            // ISO timestamp
  note?: string;               // optional, future-proofed
};
```

### Derived data (computed at render time, never stored)

```ts
function getStats(challenge: ChallengeData): Stats {
  // Current streak = consecutive days from today (or yesterday) backwards with goalHit
  // Best streak = longest run of goalHit days anywhere in history
  // Avg / day = mean totalReps across all logged days
  // Goal hit % = goalHit days / total logged days
}
```

### Component hierarchy

```
<App>                                  # BrowserRouter + ThemeProvider
  <TopNav />                           # 64px bar, page switcher (placeholder links for future trackers)
  <Routes>
    <Route path="/" element={<Navigate to="/pullups" />} />
    <Route path="/pullups" element={<PullupPage />} />
    <Route path="/water" element={<ComingSoon challenge="water" />} />  // stub for future
  </Routes>
</App>

<PullupPage>
  <HeroChallengeCard>                  # gradient text, total/today, "27 to go"
  <TodaysSetsCard>                     # set list + inline add form
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <StatsCard />                      # streak, best, avg, goal hit %
    <ActivityGrid className="col-span-2" />   # 7×53 year heatmap
  </div>
</PullupPage>
```

### State management

**Zustand store** (`src/store/dashboard.ts`):

```ts
type DashboardState = {
  data: Storage;
  // actions
  addSet: (challengeId: 'pullups', date: string, reps: number) => void;
  updateSet: (challengeId: 'pullups', date: string, setId: string, reps: number) => void;
  deleteSet: (challengeId: 'pullups', date: string, setId: string) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  resetAll: () => void;
};
```

On every state mutation: persist to `localStorage`. On mount: hydrate from `localStorage` (or seed an empty schema if missing).

### Persistence details

- **One key:** `life-dashboard:v1`
- **Debounced writes** (300ms) so rapid `[+]` clicks don't thrash storage
- **Schema version field** so future migrations are possible
- **Export / import** buttons in the top nav (small `↓` and `↑` icons) let the user back up or move data — useful for the video

---

## 5. Proposed File Structure

```
~/Desktop/Life-Dashboard/
├── README.md                           # Quickstart, what's where, design rationale
├── IMPLEMENTATION_PLAN.md              # This file
├── CLAUDE.md                           # Project memory for Claude Code itself
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html                          # Loads Google Fonts, mounts #root
├── .gitignore                          # node_modules, dist, .DS_Store
└── src/
    ├── main.tsx                        # ReactDOM root
    ├── App.tsx                         # BrowserRouter + routes
    ├── index.css                       # Tailwind base + :root tokens + utility classes
    ├── lib/
    │   ├── storage.ts                  # localStorage adapter with debounce + versioning
    │   ├── date.ts                     # dateKey(), todayKey(), getYearDays(), getStreak()
    │   └── cn.ts                       # clsx wrapper
    ├── store/
    │   └── dashboard.ts                # Zustand store
    ├── components/
    │   ├── TopNav.tsx                  # page switcher + export/import buttons
    │   ├── HeroChallengeCard.tsx       # gradient-text hero number
    │   ├── TodaysSetsCard.tsx          # set list + inline add form
    │   ├── StatsCard.tsx               # streak / best / avg / goal hit %
    │   ├── ActivityGrid.tsx            # 7×53 yearly GitHub-style heatmap
    │   ├── DayDrawer.tsx               # side drawer showing all sets for a clicked day
    │   ├── ComingSoon.tsx              # stub for unbuilt trackers
    │   └── HelpOverlay.tsx             # `?` keyboard shortcut overlay
    ├── pages/
    │   └── PullupPage.tsx              # composes the four cards
    └── types.ts                        # Storage, DayEntry, PullupSet, Stats interfaces
```

---

## 6. Key Technical Decisions

1. **No backend, no auth, no database.** Everything in `localStorage` because (a) the user is the only consumer, (b) the data is private health-adjacent info, (c) shipping a backend doubles the surface area. Trade-off: no cross-device sync, no real-time backup. Mitigated by export/import buttons.

2. **Zustand over React Context for global state.** Context re-renders the whole tree on every change; Zustand lets `TodaysSetsCard` and `ActivityGrid` subscribe independently to specific slices. Trade-off: one extra dependency. The win is no prop-drilling and clean selectors.

3. **Activity grid is full-year, not trailing 53 weeks.** The user explicitly asked for "grid view of each day" — a yearly grid is the visual that reads strongest on video. GitHub uses 53 weeks; we use 53 weeks of the *current year*, but laid out as 7 rows × 53 columns. If the year started mid-week, prepend empty cells so Jan 1 sits in the correct row.

4. **Inline set editing with `[- 1]` and `[+]` buttons, not a modal.** The user adds sets rapidly (8-12 per set, 10 sets per day). A modal breaks flow. Inline buttons next to each set row keep the rhythm. Trade-off: 12 buttons per day visible at once is busier — but the design system already has hover states that make it feel intentional.

5. **Date keying uses local time, not UTC.** The user is in Asia/Colombo (UTC+5:30). A set logged at 11pm and another at 1am the next day should land on different days in *their* experience, not in UTC. We format keys with local `YYYY-MM-DD`.

6. **Gradient text on the hero only.** IznicOS uses gradient text sparingly (TodayHero, AchievementGrid). Following that restraint: only the main "73 / 100" gets the gradient. Other numbers use `var(--text)`.

7. **The keyboard shortcut `a` to focus the add-set input** is a small but high-impact detail for a user who'll use this 10× per day. Document it in the `?` overlay.

8. **No backend export/import round-trip — use a JSON file download/upload.** The user mentioned this is for video: they can show the dashboard, but also hand viewers the data file if asked. `<a download="life-dashboard.json">` is one line of code.

---

## 7. User Review Required

> [!IMPORTANT]
> **1. Storage: localStorage only, no cloud sync.** This is the simplest path. The trade-off is no automatic backup and no cross-device. The export/import JSON buttons mitigate this. **Do you want a different persistence model (IndexedDB, a tiny SQLite via sql.js, a remote backend)?** Default: localStorage. Approve to proceed.

> [!IMPORTANT]
> **2. Heatmap scope: current year only.** The activity grid renders 7 rows × 53 columns for the current calendar year. If the challenge spans years, prior years are summarized in a stat (e.g., "2025: 142 days logged, 18,400 reps") but the grid always shows the current year. **Approve, or do you want rolling 365 days / a multi-year view?**

> [!IMPORTANT]
> **3. No authentication, no multi-user, no sharing.** Single user on a single browser. **Approve.**

> [!IMPORTANT]
> **4. Future-proofing via the routing structure.** Even though Phase 1 only ships the `/pullups` page, the App already wires `/water` and `/` (redirect) to stubs. This locks in the pattern for future trackers. **Approve the naming and the routing structure, or suggest different page IDs.**

---

## 8. Open Questions

1. **Should the hero "73 / 100" animate when a new set is logged?** A 200ms tween from old total to new total feels nice on video. Risk: feels gimmicky if the user prefers snappy feedback. Investigate during Phase 2.
2. **What's the right default for "Add Set" reps?** Most users do 8-12. Default 10. But the input should remember the last-entered value (sticky across the same day) — investigate in Phase 3.
3. **Streak handling across timezones.** If the user travels, "today" shifts. Out of scope for v1 — use system timezone.
4. **Mobile responsiveness.** The grid is 53 columns wide; on a phone it needs horizontal scroll or a different layout. Phase 4 investigates, but desktop-first is acceptable for the primary use case (recording a video at a desk).
5. **Sound or haptic feedback on `[+]`?** Probably not for v1 — the visual pulse is enough.

---

## 9. Verification Plan

### Setup commands (run once after scaffold)

```bash
cd ~/Desktop/Life-Dashboard
npm install                          # or pnpm install / bun install
npx tsc --noEmit                     # type-check — must exit 0
npm run build                        # vite build — must exit 0
npm run dev                          # vite dev server on :5173
```

### Functional checklist (Phase 1)

- [ ] `npm run dev` opens `http://localhost:5173` and the pullup page renders
- [ ] Hero shows "0 / 100" on first load
- [ ] Clicking `+ Add` opens the inline form, default reps = 10
- [ ] Submitting a set of 12 updates the hero to "12 / 100" and adds a row to the sets card
- [ ] Clicking `+` on an existing set increments that set's reps and animates the number
- [ ] Clicking `[- 1]` decrements; clicking when reps=1 deletes the set
- [ ] The activity grid renders 7 rows × ~53 columns, all current year, day 1 in correct position
- [ ] Today is highlighted on the grid (subtle border or different color)
- [ ] Goal-hit days are full `--accent-1` color; missed days are dim
- [ ] Reload the page — all data persists
- [ ] Click `↓` export in top nav — downloads `life-dashboard.json`
- [ ] Clear localStorage, click `↑` import, select the file — data is restored
- [ ] Press `a` — focus jumps to the add-set input
- [ ] Press `?` — help overlay appears listing shortcuts

### Edge case checklist

- [ ] Empty state: no sets logged today, hero reads "0 / 100", sets card has an inviting empty state
- [ ] Set entered as 0 — does not save
- [ ] Set entered as 999 — saves (no upper bound; user is an adult, can self-regulate)
- [ ] Two days of data with no sets on day 2 — day 2 cell is dim
- [ ] Set logged at 23:59 — lands on today's key
- [ ] Set logged at 00:01 — lands on tomorrow's key (not today's)
- [ ] Browser refresh mid-set-edit — form clears (acceptable v1; persistent forms are Phase 2)
- [ ] Year boundary (Dec 31 → Jan 1) — grid cleanly switches years; prior year still queryable in stats

### Visual verification (this is the hard one)

Open the dev server, take a screenshot, and compare against:
- `~/.iznicos/install/frontend/src/glyphs/iznic/TodayHero.tsx` — the hero number uses the same gradient text treatment
- `~/.iznicos/install/frontend/src/glyphs/chart/ActivityHeatmap.tsx` — same `bg-white/[0.04]` for empty cells, same `var(--accent-1)` opacity ladder
- `~/.iznicos/install/frontend/src/glyphs/iznic/WhispersCard.tsx` — same narrative card with gradient background

**Hard test:** if you can put a screenshot of this dashboard next to a screenshot of IznicOS's Today page and a stranger can't tell which is which, the design is right.

---

## 10. Implementation Order

### Phase 0 — Scaffold (1 turn)
- `npm create vite@latest` (React + TypeScript template)
- Install dependencies: `react-router-dom zustand date-fns clsx tailwindcss postcss autoprefixer`
- Configure Tailwind with the `content: ["./index.html", "./src/**/*.{ts,tsx}"]` glob
- Copy `:root` tokens into `src/index.css` after the `@tailwind base;` directive
- Add Google Fonts `<link>` to `index.html`
- Verify: `npm run dev` shows a blank page with the right background color

### Phase 1 — Routing + Empty Page (1 turn)
- Wire `BrowserRouter` in `App.tsx` with `/` → redirect to `/pullups`
- Build minimal `TopNav` with the title and a placeholder link
- Build `PullupPage` with a single placeholder card
- Verify: route navigation works, no console errors

### Phase 2 — Storage + Zustand (1 turn)
- Implement `src/lib/storage.ts` with debounced write + versioned schema
- Implement `src/store/dashboard.ts` with the `DashboardState` shape
- Implement `src/lib/date.ts` with `dateKey()`, `todayKey()`, `getStreak()`, `getYearDays()`
- Seed an empty `Storage` on first load
- Verify: open DevTools, see `life-dashboard:v1` key in localStorage, add a set via the store's `addSet` action and confirm it persists across refresh

### Phase 3 — Today's Sets Card (2 turns)
- Build `TodaysSetsCard` with the set list, inline add form, and per-row `[- 1] [+] [×]` controls
- Wire to the store's `addSet` / `updateSet` / `deleteSet` actions
- Implement the `a` keyboard shortcut
- Implement the per-set number pulse animation (CSS keyframe in `index.css`)
- Verify: full add/edit/delete cycle works; data persists; `a` focuses the input

### Phase 4 — Hero + Stats (1 turn)
- Build `HeroChallengeCard` with the gradient text "X / 100" and the "X reps to go" sub-line
- Build `StatsCard` with current streak, best streak, avg/day, goal hit %
- Verify: hero number updates immediately on set add; stats recalculate

### Phase 5 — Activity Grid (2 turns)
- Build `ActivityGrid` — 7 rows × 53 columns, current year only, opacity ladder by `totalReps / goalPerDay`
- Today cell gets a 1px `--accent-2` border
- Click handler opens `DayDrawer` showing that day's sets
- Build the legend ("less [░][▒][▓][█] more")
- Verify: visual matches the GitHub contribution graph reference; today is highlighted; click opens the drawer

### Phase 6 — Export / Import + Help Overlay (1 turn)
- Wire the `↓` and `↑` buttons in `TopNav` to download / upload JSON
- Build `HelpOverlay` and wire the `?` shortcut
- Verify: export downloads a valid JSON file; import restores data

### Phase 7 — Final Polish (1 turn)
- Audit every card against IznicOS source files (TodayHero, WhispersCard, ActivityHeatmap)
- Verify no hardcoded colors anywhere — search for `#` hex values in `.tsx` files, replace with tokens
- Verify no Tailwind color classes (`text-gray-*`, `bg-zinc-*`, etc.)
- Verify no fourth font has crept in
- Add aurora background spots (optional, behind the hero)
- Run `npx tsc --noEmit` and `npm run build` — both must exit 0
- Open the dashboard, take a screenshot, compare to the IznicOS reference

---

## Appendix A — Quick reference: spacing & typography

| Where | Class | Pixels |
|---|---|---|
| Page padding | `p-9` | 36px |
| Card padding (narrative) | `px-7 py-6` | 28px / 24px |
| Card padding (stat tile) | `p-5` | 20px |
| Section gap | `gap-6` | 24px |
| Top nav height | `h-16` | 64px |
| Hero number | `.iz-display text-6xl` | 60px (Fraunces 300) |
| Card eyebrow | `.iz-label` | 10px mono, uppercase, 0.16em tracking |
| Set row | `text-sm` | 14px Inter |
| Mono timestamps | `.iz-mono text-[11px]` | 11px JetBrains Mono |
| Day cell | `w-3 h-3` | 12px square, 3px gap |

## Appendix B — Source files to study before writing any visual code

These are the references Claude Code should read first:

1. `~/.iznicos/install/frontend/src/glyphs/iznic/TodayHero.tsx` — gradient text hero pattern
2. `~/.iznicos/install/frontend/src/glyphs/iznic/WhispersCard.tsx` — premium gradient card with eyebrow + content + actions
3. `~/.iznicos/install/frontend/src/glyphs/chart/ActivityHeatmap.tsx` — the GitHub-style grid pattern (copy this almost verbatim, just swap the data source)
4. `~/.iznicos/install/frontend/src/glyphs/stat/StatTile.tsx` — compact stat with eyebrow + value + sub
5. `~/.iznicos/install/frontend/src/glyphs/index.ts` — how components get registered (we don't need this; we use routes instead)
6. `~/.iznicos/theme.json` — current theme token values (we'll hardcode the same values in `:root`)

---

## Context — already done

Iznic (Hermes agent) created this folder and wrote this plan. The following are already in place:
1. Folder `~/Desktop/Life-Dashboard/` created
2. `IMPLEMENTATION_PLAN.md` written with full scope, architecture, file tree, phased tasks, and verification
3. Visual reference locked: IznicOS install at `~/.iznicos/install/`
4. Design tokens copied verbatim from IznicOS theme into Section 2
5. All dependency decisions made; sizes and licenses listed

## What YOU need to do

Execute Phases 0 through 7 in order. Each phase produces a runnable, verifiable artifact. Don't skip verification — `npx tsc --noEmit` and `npm run build` must exit 0 at the end of Phase 7.

After Phase 7, report:
- All files created (with absolute paths)
- All files modified (and why)
- The exact `npm run dev` URL the user should open
- Anything you deviated from this plan and why
- Anything the user should know about (e.g., "I had to use Tailwind v3 because v4 had a peer-dep issue with the Fraunces font import")

## Hard constraints

1. **No hardcoded colors** anywhere. Only `var(--*)`, `color-mix()`, and `bg-white/[0.0X]`. No hex values, no `rgba()` literals in `.tsx` files (CSS files can have them in `:root` only).
2. **No Tailwind color classes** (`text-gray-*`, `bg-zinc-*`, etc.). Use the `var(--*)` form.
3. **Only three fonts:** Fraunces (display), Inter (body), JetBrains Mono (mono). Load via Google Fonts `<link>` in `index.html`.
4. **No backend.** All persistence in `localStorage` under `life-dashboard:v1`. Period.
5. **No new global state libraries beyond Zustand.** No Redux, no Jotai, no Recoil.
6. **No analytics, no telemetry, no error reporting.** Single user, local app.
7. **No tests for v1** unless something genuinely risky emerges during build.
8. **Commit after each phase** with a clear `feat: phase N — <title>` message. The user uses git log to track progress.
9. **Preserve this README and plan.** Don't delete `IMPLEMENTATION_PLAN.md` after building; it's the source of truth.

## Verification commands (with expected output)

```bash
cd ~/Desktop/Life-Dashboard
npx tsc --noEmit                    # exit 0, no output
npm run build                       # exit 0, "✓ built in XXXms"
npm run dev &                       # background
sleep 3
curl -s http://localhost:5173 | head -20   # <!doctype html>... <div id="root">
```

## Verification trap to avoid

**Do NOT use `curl -sf` against `http://localhost:5173` to check the dev server.** Vite's dev server returns 200 for the root, but `--fail` (the `f` in `-sf`) treats any 4xx as failure. Use `curl -s http://localhost:5173 | head -5` to check it's serving HTML. If the port is wrong, the test will still pass via the wrong server. Verify port by checking Vite's startup output, not by guessing.

## Pitfalls to avoid

- **Vite scaffold sometimes picks Tailwind v4** which has different config syntax. **Force v3:** `npm install -D tailwindcss@3 postcss autoprefixer` *after* the scaffold, then `npx tailwindcss init -p`. Tailwind v4 has a `:root` CSS conflict with our hand-written tokens.
- **Google Fonts `<link>` must come before Tailwind's `@tailwind base;` import in CSS** — otherwise the FOUC (flash of unstyled content) shows serif fallback for ~200ms on first load. Add the `<link>` to `index.html` *first*, then import the CSS in `main.tsx`.
- **`localStorage` is synchronous and blocks the main thread on large writes.** Our schema is tiny (<10KB even after a year of dense data) so this is fine, but the 300ms debounce in `src/lib/storage.ts` is still worth it for the rapid `[+]` clicks.
- **Date math is the #1 source of bugs.** Use `date-fns` everywhere — `format(new Date(), 'yyyy-MM-dd')` for keys, `startOfYear` / `endOfYear` for grid bounds, `differenceInDays` for streak. Don't roll your own.
- **Zustand selectors.** Don't subscribe to the whole `data` object. Subscribe to `state => state.data.challenges.pullups.days[todayKey()]?.sets ?? []` for the sets card. Otherwise the card re-renders on every state change.
- **The `rounded-sm` cells in the activity grid need `bg-white/[0.04]` for empty, NOT `bg-[var(--surface)]`** — surface is too dark and the cells disappear. Match `ActivityHeatmap.tsx` exactly.
- **When the user is editing an inline set row and the store updates from elsewhere, the input should NOT lose focus.** Implement edit-in-place with a local controlled component, not a controlled-by-store input.

## Scope — Do NOT

- Do NOT add a backend. Do not add Express, Hono, Bun, or any server framework. Do not add a database.
- Do NOT add authentication, accounts, or multi-user support.
- Do NOT add a settings/preferences page (theme is locked to dark for v1).
- Do NOT add a chart library (Chart.js, Recharts, etc.). The stats card uses typography and simple numbers, not visualizations.
- Do NOT add a CSS framework beyond Tailwind. No shadcn/ui, no Mantine, no Chakra.
- Do NOT add a router other than react-router-dom.
- Do NOT add a date library other than date-fns.
- Do NOT add a state library other than Zustand.
- Do NOT add a sound library, animation library, or any 3D.
- Do NOT refactor or rewrite IznicOS code — this is a standalone project.

## When to stop and ask

- **After Phase 0 and Phase 1**, briefly report "scaffold up, routing works, here's the URL" — don't ask, just continue unless something is broken.
- **After Phase 5 (Activity Grid)**, this is a big visual milestone. Take a screenshot, embed it in your summary. If the grid doesn't look right, iterate.
- **After Phase 7**, stop and write a final summary (see "What YOU need to do" above).
- **At any phase**, if a constraint in this plan is impossible to satisfy (e.g., a dependency conflict you can't resolve), stop and report the issue rather than working around it silently.

---

**Good luck. Make it beautiful.**
