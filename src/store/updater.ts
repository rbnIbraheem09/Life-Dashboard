import { create } from 'zustand'

/**
 * Self-update state. Wraps the Tauri updater + process plugins:
 *   check()   → asks our signed GitHub `latest.json` if a newer build exists.
 *   install() → downloads + verifies + installs the update, then relaunches.
 *
 * Safe everywhere: the plugins are dynamically imported and only invoked inside
 * the Tauri desktop shell. In a plain browser (dev server, tests) `check()`
 * resolves to `unsupported` and never touches IPC.
 *
 * Data safety: an update only swaps the app bundle. User data lives in the
 * WebView's localStorage (keyed by bundle id, outside the bundle), so it is
 * never touched — see docs/UPDATING.md.
 */

export type UpdaterStatus =
  | 'idle'        // nothing checked yet
  | 'checking'    // querying latest.json
  | 'uptodate'    // confirmed on the newest version
  | 'available'   // a newer version exists
  | 'downloading' // fetching + installing the bundle
  | 'ready'       // installed; relaunch imminent
  | 'error'       // something failed
  | 'unsupported' // running outside the desktop shell

/** Minimal structural shape of the updater plugin's Update object. */
type PendingUpdate = {
  version: string
  currentVersion: string
  body?: string | null
  downloadAndInstall: (
    onEvent: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void,
  ) => Promise<void>
}

// The live Update handle is non-serializable, so it lives outside the store.
let pending: PendingUpdate | null = null

function inTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
}

function message(e: unknown): string {
  if (e instanceof Error) return e.message
  return typeof e === 'string' ? e : 'Unknown error'
}

type UpdaterState = {
  status: UpdaterStatus
  currentVersion: string | null
  newVersion: string | null
  notes: string | null
  progress: number // 0..1 while downloading
  error: string | null
  dismissed: boolean // launch banner dismissed for this session
  /** Query for an update. `silent` keeps failures quiet (used on launch). */
  check: (opts?: { silent?: boolean }) => Promise<void>
  /** Download, install, and relaunch into the new version. */
  install: () => Promise<void>
  dismiss: () => void
}

export const useUpdater = create<UpdaterState>((set, get) => ({
  status: 'idle',
  currentVersion: null,
  newVersion: null,
  notes: null,
  progress: 0,
  error: null,
  dismissed: false,

  check: async ({ silent = false } = {}) => {
    if (!inTauri()) {
      set({ status: 'unsupported' })
      return
    }
    if (get().status === 'checking' || get().status === 'downloading') return
    set({ status: 'checking', error: null })
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = (await check()) as PendingUpdate | null
      if (update) {
        pending = update
        set({
          status: 'available',
          currentVersion: update.currentVersion,
          newVersion: update.version,
          notes: update.body?.trim() || null,
        })
      } else {
        pending = null
        // Best-effort current-version read for the "up to date" line.
        try {
          const { getVersion } = await import('@tauri-apps/api/app')
          set({ currentVersion: await getVersion() })
        } catch { /* ignore */ }
        set({ status: 'uptodate' })
      }
    } catch (e) {
      // On a silent launch check, a network hiccup shouldn't nag the user.
      set(silent ? { status: 'idle' } : { status: 'error', error: message(e) })
    }
  },

  install: async () => {
    if (!pending) return
    set({ status: 'downloading', progress: 0, error: null })
    try {
      let total = 0
      let downloaded = 0
      await pending.downloadAndInstall((e) => {
        if (e.event === 'Started') {
          total = e.data?.contentLength ?? 0
        } else if (e.event === 'Progress') {
          downloaded += e.data?.chunkLength ?? 0
          if (total > 0) set({ progress: Math.min(downloaded / total, 1) })
        } else if (e.event === 'Finished') {
          set({ progress: 1 })
        }
      })
      set({ status: 'ready' })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (e) {
      set({ status: 'error', error: message(e) })
    }
  },

  dismiss: () => set({ dismissed: true }),
}))
