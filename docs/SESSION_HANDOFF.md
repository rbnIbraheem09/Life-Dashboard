# Session Hand-off — 2026-06-14

Context for picking this up in a fresh session. Repo: `~/Desktop/Life-Dashboard`. Branch: `master`. Tree is clean; everything below is committed.

---

## TL;DR — what this session was

Took a Tauri 2 + React desktop app whose window chrome, scrolling, and theme had been butchered by a previous AI, and rebuilt it the right way, then made it gorgeous. The throughline: **stop faking native behavior, let macOS/the GPU do their jobs, and only style what's genuinely ours.**

Everything is committed and builds clean (`npx tsc --noEmit && npm run build` → exit 0; `cargo check --manifest-path src-tauri/Cargo.toml` → Finished).

---

## What got done (in order, with the commit)

1. **Native window chrome** (`e664111`, `0579c96`) — ripped out fake React traffic lights + fake drag. Now uses the **real macOS traffic lights** (repositioned on-screen via `trafficLightPosition` in `tauri.conf.json`, not pushed off-screen). Green = real fullscreen, hover glyphs, etc. Red button = **hide-to-dock + reopen on dock click** (handled in `src-tauri/src/lib.rs` via `WindowEvent::CloseRequested` → `hide()` + `RunEvent::Reopen` → `show()`). Window drag = a tiny `mousedown→startDragging()` hook on the top 36px (`src/hooks/useWindowDrag.ts`). Deleted `TrafficLights.tsx`.
2. **Native scroll** (`9e01320`, `40cbadc`) — rewrote `ScrollArea.tsx` to use **native `overflow:auto`** (real momentum) with a thin custom thumb drawn from real `scrollTop`; self-adjusting native-bar hide (so the ugly grey scrollbar never shows). `index.css` locks the document (`html,body{overflow:hidden;overscroll-behavior:none}`) → kills the rubber-band; `user-select:none` default → kills the I-beam-on-drag and whole-app text selection.
3. **Arc-style sidebar** (`665dfbe`, `6e8eb9b`) — pinned/unpinned + **hover-peek** (hover the left edge, sidebar slides in as an overlay). Toggle lives INSIDE the sidebar panel (so hovering it doesn't snap the peek shut). Native lights + toggle alignment tuned (`4a5b791`, `9db6bd2`).
4. **Vertical centering** (`799bb8c`) — page content centers when it fits, scrolls from the top when it overflows (auto-margins, not `justify-center`). Reusable via `ScrollArea`'s `contentClassName` prop.
5. **Theme system** (`fc7c936`) — localStorage, no backend. `store/theme.ts` writes tokens onto `:root`; 4 themes (Aurora, Forest, Paperback, Nocturne); Settings page at `/settings` (sidebar Data section). Ported the IznicOS **aurora glow** atmosphere that had been dropped.
6. **"Make it alive"** (`7617195`) then **GPU aurora** (`462793c`, `cc1b2f3`) — replaced the CSS aurora (which bands + can't flow) with a **WebGL shader** (`src/components/AuroraCanvas.tsx`): domain-warped fbm = liquid flow, cursor-reactive, per-pixel Jimenez dither = zero banding. Toned intensity down (0.22 dark / 0.15 light) for content contrast. Removed the cursor-spotlight-on-cards.
7. **DayDrawer glitch fix** (`6407af7`) — a `transform` on `.glow-card:hover` was making the hovered ActivityGrid the containing block for the fixed `DayDrawer`, breaking its layout. Removed the transform (hover is border+shadow only now).
8. **Panel-style toggle** (`1c41c4e`) — Settings → Surface: flips ALL panels between two **pre-existing** looks, 1-to-1: `opaque` = the Stats/Activity surface (`var(--surface)`), `transparent` = the Hero/Sets accent gradient. All panels share `.iz-panel` → `background: var(--panel-bg)`; toggle swaps `--panel-bg`. Persisted, default opaque.

---

## Architecture map (the files that matter)

- `src/App.tsx` — layout: aurora layer (z-0) behind a transparent `z-10` content layer; Arc sidebar (pin/peek); vertical centering; mounts `useWindowDrag`.
- `src/components/AuroraCanvas.tsx` — the WebGL flowing aurora (the "wow"). `AuroraLayer.tsx` picks it (or a CSS fallback if no WebGL).
- `src/components/ScrollArea.tsx` — native scroll + custom thumb; `contentClassName` prop for centering.
- `src/components/WindowChrome.tsx` + `PanelToggle.tsx` — the sidebar toggle (rides inside the panel).
- `src/hooks/useWindowDrag.ts` — top-strip native window drag.
- `src/store/theme.ts` — themes, token engine, `themeId` + `panelStyle`, both persisted; applies on module-load before first paint.
- `src/pages/SettingsPage.tsx` — theme swatches + the Opaque/Transparent surface toggle.
- `src/index.css` — tokens, document lock, aurora/grain fallback, `.glow-card`, `.iz-panel` + `--panel-bg`.
- `src-tauri/tauri.conf.json` — `titleBarStyle: Overlay`, `trafficLightPosition`, decorations.
- `src-tauri/src/lib.rs` — native menu + hide-on-close/reopen.
- `prototype/aurora-tuner.html` — standalone browser tuner with sliders (aurora params, card opacity, blur) + theme switch. Open with `open prototype/aurora-tuner.html`. Use it to dial values, then hand me the numbers.

**Frozen Phase-1 components** (per `CLAUDE.md`): the pullup cards etc. The user has explicitly authorized touching them this session where needed (we added `.iz-panel`/`.glow-card` classes, removed inline card backgrounds). Don't gratuitously refactor them.

---

## Tunable knobs (all hot-reload unless noted)

- **Aurora flow/look** → `AuroraCanvas.tsx`: `INTENSITY_DARK=0.22`, `INTENSITY_LIGHT=0.15`, flow speed `uTime*0.06`, zoom `2.4`, cursor push `*0.8`, fbm octaves `4`, DPR cap `2`.
- **Native light position** → `tauri.conf.json` `trafficLightPosition {x:23,y:27}` (needs a `tauri dev` restart). **Toggle position** → `WindowChrome.tsx` `top-[15px] left-[82px]`.
- **Panel surface opacity** → `store/theme.ts` `SURFACE_ALPHA = 0.78`.
- **Sidebar peek** → `App.tsx`: hot-zone `w-[14px] top-[40px]`, peek-close grace `140ms`.

---

## Hard-won gotchas (don't relearn these)

- **A CSS `transform`/`filter`/`will-change` on an ancestor re-anchors `position:fixed` descendants** to that ancestor. This broke the DayDrawer (hover transform on its card ancestor). Keep transforms off any element that contains a fixed overlay.
- **You cannot draw fake macOS traffic lights and match native** (green-button fullscreen is OS-only). Reposition the real ones.
- **CSS radial-gradients band in dark colors** (8-bit). Only a GPU per-pixel dither truly fixes it.
- **`bg-[var(--x)]` is `background-color`** → can't hold a gradient. Use `.iz-panel { background: var(--panel-bg) }` (shorthand) when the value may be a gradient.
- **`backdrop-filter` requires WKWebView support** — fine in Tauri/macOS, but a prototyped opaque/clear blur toggle was **reverted** because the user wanted the two EXISTING configs reused 1-to-1, not new blur/opacity values invented. Don't reintroduce invented values.

---

## User & working style (important)

- Highly **aesthetics-obsessed**, makes social-media content with this app, it'll be **open-source**. Loves the IznicOS look (forked it). Vision: easy-to-author + exportable dashboard "pages" for community sharing (future, not built).
- Demands **precision + evidence, no assumptions** — read the code/confirm before acting. A prior AI's blind flailing enraged him.
- Prefers **deletion over complexity**, clean/maintainable code.
- Tunes visuals himself via the prototype and hands over exact numbers — don't ballpark when he's offered to measure.
- Commits frequently with `feat:`/`fix:`/`chore:` + the `Co-Authored-By: Claude Opus 4.8` trailer.

See also the persistent memory files in `~/.claude/projects/.../memory/` (product-vision, native-chrome-principle, user-profile, theme-system).

---

## Open / possible next items

- **Panel-style default**: currently `opaque`. The user may want `transparent` as default, or the **sidebar excluded** from the toggle (so nav stays solid in transparent mode) — he was asked, hasn't answered.
- **Paperback (light theme)** may need a light-mode pass: `bg-white/[0.0X]` overlays go faint on light bg. `data-theme-mode="light"` is already set on `<html>` for targeting.
- The bigger product vision (authorable/exportable pages) is untouched and is the real roadmap.
- `prototype/aurora-tuner.html` is a dev tool committed to the repo — fine to keep or delete later.
