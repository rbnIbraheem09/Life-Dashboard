import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { usePages } from '../store/pages'
import { ScrollArea } from './ScrollArea'
import { cn } from '../lib/cn'
import { parsePageFile } from '../lib/pagefile'
import { ImportPageDialog } from './ImportPageDialog'
import type { PageDef } from '../types'

/* ── Builtin page icons (16×16, 1.5px stroke, currentColor) ── */

function PullupsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2 3.5h12" />
      <path d="M5 3.5v3" />
      <path d="M11 3.5v3" />
      <circle cx="8" cy="8" r="1.4" />
      <path d="M8 9.4v3.1M8 11l-2 1.5M8 11l2 1.5" />
    </svg>
  )
}

function WaterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 2s4 4.6 4 7.3A4 4 0 0 1 8 13.3a4 4 0 0 1-4-4C4 6.6 8 2 8 2Z" />
    </svg>
  )
}

function SleepIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M13 9.2A5.2 5.2 0 1 1 6.8 3 4.1 4.1 0 0 0 13 9.2Z" />
    </svg>
  )
}

function ReadingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 4.2C6.8 3.3 5.2 3 3.5 3.2v8c1.7-.2 3.3.1 4.5 1 1.2-.9 2.8-1.2 4.5-1v-8C10.8 3 9.2 3.3 8 4.2Z" />
      <path d="M8 4.2v8.8" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.6v1.8M8 12.6v1.8M2.6 8h1.8M11.6 8h1.8M4.05 4.05l1.27 1.27M10.68 10.68l1.27 1.27M11.95 4.05l-1.27 1.27M5.32 10.68l-1.27 1.27" />
    </svg>
  )
}

const BUILTIN_ICONS: Record<string, () => JSX.Element> = {
  pullups: PullupsIcon,
  water: WaterIcon,
  sleep: SleepIcon,
  reading: ReadingIcon,
}

/** Custom-page vector icon: a single SVG path rendered inside our own <svg>. */
function PathIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d={d} />
    </svg>
  )
}

/** Neutral vector glyph for pages with no icon — never an emoji. */
function FallbackIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3.5" y="2.5" width="9" height="11" rx="2" />
      <path d="M6 6h4M6 9h4" />
    </svg>
  )
}

/** Icon precedence: iconPath → builtin code-icon → neutral glyph. Emoji is
 *  never rendered as an icon (deliberate — vector only). */
function PageIcon({ id, iconPath }: { id: string; iconPath?: string }) {
  if (iconPath) return <PathIcon d={iconPath} />
  const Builtin = BUILTIN_ICONS[id]
  if (Builtin) return <Builtin />
  return <FallbackIcon />
}

function slugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
}

export function Sidebar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const order = usePages((s) => s.data.order)
  const pages = usePages((s) => s.data.pages)
  const deletePage = usePages((s) => s.deletePage)
  const addPage = usePages((s) => s.addPage)
  const updatePageDef = usePages((s) => s.updatePageDef)
  const findByTemplate = usePages((s) => s.findByTemplate)
  const exportPage = usePages((s) => s.exportPage)
  const navigate = useNavigate()
  const pageFileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ def: PageDef; existingId: string } | null>(null)

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportPage(id: string, name: string) {
    setMenuFor(null)
    const json = exportPage(id)
    if (json) download(`${slugName(name)}.lifepage.json`, json)
  }

  function handleImportPageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parsePageFile(String(reader.result ?? ''))
      if (!result.ok) {
        // eslint-disable-next-line no-alert
        window.alert(`Import failed: ${result.reason}.`)
        return
      }
      const existingId = findByTemplate(result.def.templateId)
      if (existingId) {
        setPending({ def: result.def, existingId })
      } else {
        const id = addPage(result.def)
        navigate(`/p/${id}`)
      }
    }
    reader.readAsText(file)
  }

  function confirmUpdate() {
    if (!pending) return
    updatePageDef(pending.existingId, pending.def)
    navigate(`/p/${pending.existingId}`)
    setPending(null)
  }

  function confirmAddCopy() {
    if (!pending) return
    const id = addPage({ ...pending.def, templateId: crypto.randomUUID() })
    navigate(`/p/${id}`)
    setPending(null)
  }

  // which row's ⋯ menu is open, and whether its Delete is armed (2-step confirm)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [armedDelete, setArmedDelete] = useState(false)
  useEffect(() => {
    setArmedDelete(false) // re-arming required each time a menu opens
    if (!menuFor) return
    const close = () => setMenuFor(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuFor])

  function handleExport() {
    const json = usePages.getState().exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'life-dashboard.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      // eslint-disable-next-line no-alert
      if (!window.confirm('Import replaces ALL current data with the contents of this file. Continue?')) {
        return
      }
      const ok = usePages.getState().importData(text)
      if (!ok) {
        // eslint-disable-next-line no-alert
        window.alert('Import failed: not a valid Life-Dashboard backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Two-step inline confirm — first click arms, second deletes. Avoids
  // window.confirm, which is unreliable in webview runtimes (Tauri/WKWebView).
  function handleDelete(id: string) {
    if (armedDelete) {
      deletePage(id)
      setMenuFor(null)
      setArmedDelete(false)
    } else {
      setArmedDelete(true)
    }
  }

  return (
    <div
      className={cn(
        'iz-panel h-full w-[240px] flex flex-col overflow-hidden',
        'rounded-[var(--radius)]',
        'border border-[var(--border)]',
        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5),0_2px_8px_-2px_rgba(0,0,0,0.3)]',
      )}
    >
      <div data-app-chrome className="px-5 pt-9 pb-4 select-none">
        <div className="flex items-baseline gap-2">
          <span className="iz-display text-[17px] text-[var(--text)] tracking-tight">
            Life-Dashboard
          </span>
        </div>
        <span className="iz-label mt-1 block">v0.2 · desktop</span>
      </div>

      <div className="px-3 pt-2 pb-3 flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="iz-label">Pages</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <button
              type="button"
              onClick={() => pageFileRef.current?.click()}
              title="Import a page"
              className="iz-mono text-[13px] w-5 h-5 -mr-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.05] transition-colors duration-[var(--motion-fast)] inline-flex items-center justify-center"
            >
              +
            </button>
          </div>
          <input
            ref={pageFileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportPageFile}
            className="hidden"
          />
          <nav className="flex flex-col gap-0.5">
            {order.map((id) => {
              const page = pages[id]
              if (!page) return null
              const def = page.def
              return (
                <div key={id} className="relative group">
                  <NavLink
                    to={`/p/${id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px]',
                        'border-l-2 transition-colors duration-[var(--motion-fast)]',
                        isActive
                          ? 'bg-white/[0.04] border-l-[var(--accent-1)] text-[var(--text)]'
                          : 'border-l-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/[0.02]',
                      )
                    }
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <PageIcon id={id} iconPath={def.iconPath} />
                    </span>
                    <span className="truncate">{def.name}</span>
                  </NavLink>

                  {/* ⋯ menu trigger — appears on row hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setMenuFor(menuFor === id ? null : id)
                    }}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md',
                      'iz-mono text-[14px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.05]',
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--motion-fast)]',
                      menuFor === id && 'opacity-100',
                    )}
                    title="Page actions"
                  >
                    ⋯
                  </button>

                  {menuFor === id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'absolute right-1.5 top-[calc(100%-4px)] z-30 min-w-[120px]',
                        'iz-panel rounded-md border border-[var(--border)] py-1',
                        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleExportPage(id, def.name)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04] transition-colors duration-[var(--motion-fast)]"
                      >
                        Export page
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(id)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-[12px] transition-colors duration-[var(--motion-fast)]',
                          armedDelete
                            ? 'text-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)]'
                            : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04]',
                        )}
                      >
                        {armedDelete ? 'Click again to delete' : 'Delete page'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      <div className="px-3 py-3 border-t border-[var(--border)] flex flex-col gap-0.5">
        <span className="iz-label px-3 mb-1">Data</span>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px]',
              'transition-colors duration-[var(--motion-fast)]',
              isActive
                ? 'text-[var(--text)] bg-white/[0.04]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03]',
            )
          }
        >
          <span className="w-4 inline-flex justify-center">
            <GearIcon />
          </span>
          Settings
        </NavLink>
        <button
          type="button"
          onClick={handleExport}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)]',
            'hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]',
          )}
        >
          <span className="iz-mono w-4 inline-flex justify-center">↓</span>
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)]',
            'hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]',
          )}
        >
          <span className="iz-mono w-4 inline-flex justify-center">↑</span>
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
      <ImportPageDialog
        open={pending !== null}
        name={pending?.def.name ?? ''}
        localVersion={pending ? (pages[pending.existingId]?.def.version ?? 1) : 1}
        fileVersion={pending?.def.version ?? 1}
        onUpdate={confirmUpdate}
        onAddCopy={confirmAddCopy}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
