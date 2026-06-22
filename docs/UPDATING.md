# Updating

Life-Dashboard keeps itself current with two independent channels. Only one of
them is a binary update.

## 1. Marketplace content — live, no app update

Community pages (merged into `registry/index.json` via pull request) are fetched
at runtime. **Marketplace → Refresh** pulls the newest registry, so newly merged
pages appear immediately on any installed version. Nothing to download, nothing
to restart. See `registry/README.md`.

## 2. App updates — one click, signed, non-destructive

New app code (features, blocks, fixes, the bundled starter catalog) ships as a
signed desktop build. The app updates itself via Tauri's updater:

- **On launch** it quietly checks our GitHub Releases. If a newer signed build
  exists, a slim banner offers **Update & restart**.
- **Anytime** from **Settings → Updates → Check for updates** — shows progress,
  release notes, and the result.

One click → download → **signature verification** → install → relaunch into the
new version.

### Why it's safe for your data

An update only replaces the **app bundle**. Your pages and every logged entry
live in the WebView's `localStorage`, keyed by the bundle identifier
(`com.iznicos.lifedashboard`) and stored **outside** the app at
`~/Library/WebKit/com.iznicos.lifedashboard/…`. The updater never touches it —
the same reason dragging a new `.app` over the old one preserves your data.

On top of that:
- New bundled pages / schema changes merge **additively** on next load
  (`normalizeStore` / `mergeMissingBuiltins`) — existing pages and data are
  never overwritten.
- **Settings → Export backup** writes a full JSON snapshot as a belt-and-braces
  safety net.

### Security model

Every update is verified against a public key baked into the app. A build that
isn't signed with the matching private key is rejected, so a tampered or
spoofed download can't install. (This is separate from OS code-signing /
notarization, which these unsigned-for-Gatekeeper builds don't have — the first
manual install still needs the one-time right-click → Open on macOS.)

### One-time bootstrap

Auto-update works from the **first version that ships the updater (v0.4.0)**
forward. A v0.3.0 install can't retro-adopt it — update to v0.4.0 once by hand
(download from Releases), and every version after that is one click.

## Maintainer notes

- **Config**: `src-tauri/tauri.conf.json` → `bundle.createUpdaterArtifacts: true`
  and `plugins.updater` (`endpoints` → the Releases `latest.json`, `pubkey`).
- **Plugins**: `tauri-plugin-updater` + `tauri-plugin-process` (Rust, registered
  in `src/lib.rs` under `#[cfg(desktop)]`); `@tauri-apps/plugin-updater` +
  `@tauri-apps/plugin-process` (JS, wrapped by `src/store/updater.ts`).
- **Signing keys**: a minisign keypair. The **public** key is in
  `tauri.conf.json`. The **private** key + password live ONLY in:
  - `~/.life-dashboard-keys/` on the maintainer's machine (back this up — losing
    it means you can't ship updates that existing installs will accept), and
  - GitHub Actions secrets `TAURI_SIGNING_PRIVATE_KEY` /
    `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
  They are git-ignored (`*.key`) and must never be committed.
- **Releasing**: push a tag `vX.Y.Z` (after bumping `package.json`,
  `tauri.conf.json`, and `src-tauri/Cargo.toml`/`Cargo.lock`). The release
  workflow builds, signs, and uploads the bundles **and** `latest.json`; the
  in-app updater reads `releases/latest/download/latest.json`.
