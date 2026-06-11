/**
 * UI store — non-data chrome state that the user expects to persist
 * across app restarts: which panels are open, the active theme, etc.
 *
 * Kept separate from `dashboard.ts` (which is frozen during Phase 2) so
 * we can grow UI concerns here without touching data logic.
 *
 * Persistence:
 *   Backed by a separate localStorage key (`life-dashboard:ui:v1`) so
 *   we don't entangle chrome state with the user's challenge data —
 *   the export/import flow only ships the data schema.
 */

import { create } from 'zustand'

const UI_KEY = 'life-dashboard:ui:v1'

type UiState = {
  /** Sidebar visibility. True = open (default), false = collapsed. */
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

type Persisted = {
  sidebarOpen?: boolean
}

function loadUi(): Persisted {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Persisted
  } catch {
    return {}
  }
}

function saveUi(state: Persisted): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silent ignore, same policy as storage.ts
  }
}

export const useUi = create<UiState>((set, get) => ({
  // Start from persisted value if present, otherwise default to open.
  sidebarOpen: loadUi().sidebarOpen ?? true,

  toggleSidebar: () => {
    const next = !get().sidebarOpen
    set({ sidebarOpen: next })
    saveUi({ sidebarOpen: next })
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
    saveUi({ sidebarOpen: open })
  },
}))
