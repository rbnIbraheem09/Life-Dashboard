import { create } from 'zustand'
import type { Entry, FieldValue, PageDef, StorageV2 } from '../types'
import { emptyStorage, flushStorage, isValidV2, loadStorage, normalizeStore, saveStorage } from '../lib/storage'
import { BUILTIN_DEFS } from '../registry/builtins'
import { serializePage } from '../lib/pagefile'

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
}

function uniqueId(base: string, taken: Record<string, unknown>): string {
  if (!(base in taken)) return base
  let n = 2
  while (`${base}-${n}` in taken) n += 1
  return `${base}-${n}`
}

type PagesState = {
  data: StorageV2
  addEntry: (pageId: string, date: string, fields: Record<string, FieldValue>) => void
  updateEntry: (pageId: string, date: string, entryId: string, fields: Record<string, FieldValue>) => void
  deleteEntry: (pageId: string, date: string, entryId: string) => void
  exportData: () => string
  /** Returns true on a successful import, false if the JSON is missing/invalid. */
  importData: (json: string) => boolean
  resetAll: () => void
  deletePage: (localId: string) => void
  addPage: (def: PageDef) => string
  updatePageDef: (localId: string, def: PageDef) => void
  findByTemplate: (templateId: string) => string | undefined
  exportPage: (localId: string) => string
}

/** Replace one day's data immutably, dropping the day if it ends up empty, then persist. */
function commitDay(
  state: PagesState,
  pageId: string,
  date: string,
  mutate: (entries: Entry[]) => Entry[]
): { data: StorageV2 } {
  const page = state.data.pages[pageId]
  if (!page) return { data: state.data }

  const current = page.data.days[date]?.entries ?? []
  const nextEntries = mutate(current)

  const days = { ...page.data.days }
  if (nextEntries.length === 0) delete days[date]
  else days[date] = { entries: nextEntries }

  const data: StorageV2 = {
    ...state.data,
    pages: { ...state.data.pages, [pageId]: { ...page, data: { days } } },
  }
  saveStorage(data)
  return { data }
}

export const usePages = create<PagesState>((set, get) => ({
  data: loadStorage(),

  addEntry: (pageId, date, fields) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) => [
        ...entries,
        { id: crypto.randomUUID(), at: new Date().toISOString(), fields },
      ])
    ),

  updateEntry: (pageId, date, entryId, fields) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) =>
        entries.map((e) => (e.id === entryId ? { ...e, fields: { ...e.fields, ...fields } } : e))
      )
    ),

  deleteEntry: (pageId, date, entryId) =>
    set((state) =>
      commitDay(state, pageId, date, (entries) => entries.filter((e) => e.id !== entryId))
    ),

  exportData: () => JSON.stringify(get().data, null, 2),

  importData: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (!isValidV2(parsed)) return false
      // Same merge the load path uses: an older backup may predate newer
      // builtin pages (e.g. sleep/reading), and without this they'd be dropped
      // — their sidebar links would then render a blank page.
      const merged = normalizeStore(parsed).store
      flushStorage(merged)
      set({ data: merged })
      return true
    } catch {
      return false
    }
  },

  resetAll: () => {
    const data = emptyStorage()
    flushStorage(data)
    set({ data })
  },

  deletePage: (localId) =>
    set((state) => {
      if (!(localId in state.data.pages)) return { data: state.data }
      const pages = { ...state.data.pages }
      delete pages[localId]
      const order = state.data.order.filter((id) => id !== localId)
      const isBuiltin = localId in BUILTIN_DEFS
      const dismissed =
        isBuiltin && !state.data.dismissed.includes(localId)
          ? [...state.data.dismissed, localId]
          : state.data.dismissed
      const data: StorageV2 = { ...state.data, pages, order, dismissed }
      saveStorage(data)
      return { data }
    }),

  addPage: (def) => {
    const state = get()
    const id = uniqueId(slug(def.name), state.data.pages)
    const finalDef: PageDef = {
      ...def,
      id,
      templateId: def.templateId || crypto.randomUUID(),
      version: typeof def.version === 'number' ? def.version : 1,
    }
    const pages = { ...state.data.pages, [id]: { def: finalDef, data: { days: {} } } }
    const order = [...state.data.order, id]
    const dismissed = state.data.dismissed.filter((d) => d !== id)
    const data: StorageV2 = { ...state.data, pages, order, dismissed }
    saveStorage(data)
    set({ data })
    return id
  },

  updatePageDef: (localId, def) =>
    set((state) => {
      const page = state.data.pages[localId]
      if (!page) return { data: state.data }
      const finalDef: PageDef = { ...def, id: localId } // keep the local key
      const pages = { ...state.data.pages, [localId]: { def: finalDef, data: page.data } }
      const data: StorageV2 = { ...state.data, pages }
      saveStorage(data)
      return { data }
    }),

  findByTemplate: (templateId) => {
    const { pages } = get().data
    for (const [id, page] of Object.entries(pages)) {
      if (page.def.templateId === templateId) return id
    }
    return undefined
  },

  exportPage: (localId) => {
    const page = get().data.pages[localId]
    return page ? serializePage(page.def) : ''
  },
}))
