# Life-Dashboard — Pullup Tracker

Local-first dashboard for personal life challenges. Phase 1 ships a single tracker: the **100 pullups per day** challenge.

## Download

Grab the latest build from the [**Releases**](../../releases/latest) page:

- **macOS** — `Life-Dashboard_<version>_universal.dmg` (works on both Apple Silicon and Intel)
- **Windows** — `Life-Dashboard_<version>_x64-setup.exe`

The builds are **unsigned** (no paid Apple/Windows code-signing certificate), so each OS shows a one-time "unknown developer" warning. To open it:

- **macOS** — after dragging it to Applications, **right-click the app → Open** → Open. (If macOS still refuses, run `xattr -dr com.apple.quarantine "/Applications/Life-Dashboard.app"` once.)
- **Windows** — on the SmartScreen prompt, click **More info → Run anyway**.

Your data lives only on your machine (`localStorage`); nothing is uploaded.

## Quickstart

```bash
cd ~/Desktop/Life-Dashboard
npm install
npm run dev   # http://localhost:5173
```

The pullup page is at `/pullups` (the root `/` redirects there). Water tracker and any future trackers are stubs at `/water` etc.

## What's where

- **`IMPLEMENTATION_PLAN.md`** — the full opus4.7-grade plan. Read this first. It contains the design system, architecture, data model, file tree, phased task breakdown, verification steps, hard constraints, pitfalls, and scope boundaries. It is the source of truth — if the plan and this README disagree, the plan wins.
- **`src/`** — the app code (created by `npm create vite` then filled in per the plan).
- **`src/lib/storage.ts`** — localStorage adapter under the `life-dashboard:v1` key.
- **`src/store/dashboard.ts`** — Zustand store. All data mutations go through this.

## Design system

Copied verbatim from IznicOS (`~/.iznicos/install/`). Three fonts, CSS variable tokens, `color-mix()` everywhere, generous spacing, no hardcoded colors, no Tailwind color classes. Read the **`Visual Design Concept`** and **`Appendix A`** sections of the plan before writing any component.

## Why a new app and not IznicOS?

IznicOS is the user's Hermes dashboard — its own thing with its own roadmap. Life-Dashboard is a separate, smaller app for personal challenge tracking. Same aesthetic DNA, different scope. The plan explicitly forbids refactoring or touching IznicOS code.

## Data export / import

Top-right of the nav bar. Downloads and uploads a JSON file containing the full schema. Useful for backup and for the videos the user records.
