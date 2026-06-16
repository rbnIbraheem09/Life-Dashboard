# Life-Dashboard — Icon Prototype

> **Status:** Draft. Not yet wired into the app. Nothing in `public/` or `src-tauri/icons/` has been changed.
> **Location:** `prototype/icon/`
> **Open with:** `open prototype/icon/preview.html` (or just `preview.html` in your editor of choice)

## Files

| File | What it is |
|---|---|
| `icon.svg` | The icon. 1024×1024 master, pure SVG, ~8 KB. Scales losslessly from 16 px favicon to 1024 px `.icns` source. |
| `preview.html` | Self-contained prototype page. Open in any browser — no build step. Shows the icon at every size, in macOS context (dock / launchpad / ⌘-Tab), on every background, plus the wordmark and a snippet of source. |
| `README.md` | This file. |

## The concept: "The Life Grid"

A 5×5 abstraction of the app's signature activity heatmap, set on a true iOS / macOS squircle in the project's exact palette. The cells follow a **rising-tide** intensity pattern — faint violet in the top-left (the past, low activity) growing in opacity through the three accent hues, ending in a single **peak cell** in the bottom-right corner. That cell uses the full violet → pink → amber gradient (the same one the hero numbers use throughout the dashboard) and gets a soft pink glow. It is the only cell that breaks the pattern — drawing the eye to *today*, the only cell that matters.

There is **no text, no monogram, no chrome beyond the squircle itself**. At 16 px the grid reads as a single coloured mass; at 1024 px the designed pattern and the peak cell reward inspection.

## Why this concept

1. **The 7×53 activity heatmap is the only visual that uniquely identifies this product.** No other app in the user's dock has one. Lifting it to icon scale gives the brand something a monogram or a generic glyph never could: instant recognition in the dock, the app switcher, and the favicon — without ever needing to be re-read.
2. **The squircle is the only correct shape for a Mac icon.** A plain rounded rectangle reads as "Windows" or "web app"; a circle reads as "generic avatar". The icon uses a `rx="229"` rounded rectangle on the 1024 canvas (22.4% of the side) — the exact value Apple's iOS / macOS app icon mask uses. Long straight sides, full corners, the unmistakable "macOS app" silhouette.
3. **The palette is faithful to the design system.** Every colour maps to a CSS variable in `src/index.css`:
   - Base: `--bg` (`#06040C`) → a slightly lifted variant for the diagonal wash
   - Aurora: `--accent-1` (violet) top-right, `--accent-2` (pink) bottom-left — same recipe as the app's `aurora-1` / `aurora-2` defaults
   - Cell ladder: a five-stop gradient from `accent-1/10` to full `accent-1/78`, then the peak uses the three-stop `accent-1 → accent-2 → accent-3` gradient that mirrors the dashboard's hero text
   - Top shine: white at 13 % opacity, fading down — the macOS glass highlight

## Anatomy of the SVG (one-paragraph tour)

The icon is a single `<g>` clipped to a squircle `<clipPath>` (a `rx=229` rounded rect on the 1024 canvas). Inside that clip: a base wash rect, two radial-gradient aurora rects, the 5×5 grid of 25 `<rect>` cells (140 px each, 20 px gap, 26 px corner radius — `rx` is ~19 % of cell side, which echoes `--radius: 14px` from the app at icon scale), a top-of-squircle highlight rect, and then — outside the clip — a 1.5 px white-at-7 %-opacity outer stroke for crispness on light backgrounds. The only filter is a `feGaussianBlur` + `feFlood` glow applied to the peak cell. Total: 5 linear gradients, 2 radial gradients, 1 filter, 1 clip, 27 shapes, 0 rasterised content.

## What's NOT in the prototype (and why)

- **No `.icns`, `.ico`, or PNG exports.** The SVG is the source of truth and can be exported to any size with `rsvg-convert`, `svgexport`, or `npx @resvg/resvg-js`. Happy to do that pass once the concept is approved.
- **No light-mode variant.** The app is dark-first; the icon is designed for dark surfaces. On the macOS light dock, the outer stroke is what saves it.
- **No animated version.** Could add a slow `breath` to the peak cell if you want it to feel alive in the dock. Easy to add — say the word.

## Verdict questions for you

1. **Concept approval** — does the heatmap read as "Life-Dashboard" to you, or does it feel too generic (a "data" icon)?
2. **The peak cell** — keep it bottom-right (temporal: this is *now*) or move it somewhere else (e.g. centre, for a "balanced" reading)?
3. **The grid** — 5×5 is the largest square that still reads at 16 px. Want to try 4×4 (cleaner, less heatmap-y) or 7×5 (the app's true 7-day-week aspect ratio, landscape)?
4. **The aurora** — keep both glows (top-right violet, bottom-left pink) or strip back to one for a flatter, more focused read?
5. **Wordmark** — the `Life · Dashboard` lockup with the bullet is a bonus; not required for the app icon. Keep, tweak, or drop.

## If you want to promote it to the real icon

The path forward (when you say go):

1. `icon.svg` → `public/favicon.svg` (overwrite the lightning bolt)
2. `icon.svg` → `src-tauri/icons/icon.svg` (replaces the placeholder set)
3. Export PNG ladder to `src-tauri/icons/`: 32, 64, 128, 256, 512, 1024, plus the `Square*Logo` and `StoreLogo` sizes the Tauri bundler expects
4. Export `icon.icns` (macOS) and `icon.ico` (Windows) for cross-platform builds
5. Update `index.html` `<link rel="icon">` if needed (already points at `/favicon.svg` — drop-in)

Until then, the prototype is a draft. Touch nothing else.
