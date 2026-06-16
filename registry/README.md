# Life-Dashboard Marketplace Registry

This folder **is** the marketplace. It's a single public JSON file — no server, no
database, no hosting bill. The app reads it straight from GitHub's raw CDN:

```
https://raw.githubusercontent.com/rbnIbraheem09/Life-Dashboard/master/registry/index.json
```

If that file can't be reached (offline, or before the repo is pushed), the app
falls back to the **bundled starter catalog** baked into the build, so the
Marketplace is always usable.

## What's in `index.json`

```jsonc
{
  "schema": 1,
  "entries": [
    {
      "id": "meditation",                // unique slug
      "author": "your-github-handle",
      "description": "One line shown on the card.",
      "tags": ["mindfulness", "habit"],
      "page": {                          // a Life-Dashboard page file
        "kind": "life-dashboard/page",
        "format": 1,
        "def": { /* the page definition — fields, blocks, target, … */ }
      }
    }
  ]
}
```

A page is **pure data**. It's never executed — the app renders it with its own
built-in components from a validated schema. That's the whole safety model: a
file that doesn't pass validation simply can't be installed, and the in-app
inspector shows you the exact JSON plus a safety report before you install.

## Add your page (zero cost, no infrastructure)

1. In the app: **Marketplace → Publish**, pick your page, click **Copy registry entry**.
2. Edit `registry/index.json` here on GitHub (the app's "Open registry on GitHub" button takes you here).
3. Paste your entry into the `entries` array, fill in `author`/`description`/`tags`, and open a pull request.
4. A maintainer reviews it (every entry is plain data) and merges. It goes live for everyone the next time their app refreshes.

That's it — GitHub hosts the file, pull-request review is the safety gate, and
there's no cost to anyone.

## Maintainers

The starter entries are generated from the app's bundled catalog so the two can
never drift. After editing `src/marketplace/catalog.ts`:

```bash
npx vite-node scripts/gen-registry.ts
```

When you merge community PRs that hand-edit `index.json`, leave those entries in
place — only the bundled starter entries are regenerated, and the generator
writes the whole file, so re-run it only when the bundled set itself changes.
