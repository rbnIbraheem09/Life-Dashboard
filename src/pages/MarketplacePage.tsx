import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePages } from '../store/pages'
import { cn } from '../lib/cn'
import { loadCatalog, type CatalogSource, REGISTRY_BROWSE_URL, REGISTRY_CONTRIBUTE_URL } from '../marketplace/registry'
import { scanPage } from '../marketplace/scan'
import type { CatalogEntry, ScanResult } from '../marketplace/types'
import { PageInspector, PageGlyph } from '../components/PageInspector'
import { ImportPageDialog } from '../components/ImportPageDialog'
import type { PageDef } from '../types'

/* ── small helpers ── */

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function openExternal(url: string) {
  try { window.open(url, '_blank', 'noopener,noreferrer') } catch { /* webview may block; copy fallback exists */ }
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Prepared = { entry: CatalogEntry; scan: ScanResult; name: string; iconPath?: string; templateId?: string }

/* ── Browse tab ── */

function BrowseTab() {
  const navigate = useNavigate()
  const addPage = usePages((s) => s.addPage)
  const updatePageDef = usePages((s) => s.updatePageDef)
  const findByTemplate = usePages((s) => s.findByTemplate)
  const pages = usePages((s) => s.data.pages)

  const installedTemplates = useMemo(
    () => new Set(Object.values(pages).map((p) => p.def.templateId)),
    [pages],
  )

  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [source, setSource] = useState<CatalogSource>('bundled')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Prepared | null>(null)
  const [pending, setPending] = useState<{ def: PageDef; existingId: string } | null>(null)

  async function refresh() {
    setLoading(true)
    const res = await loadCatalog()
    setEntries(res.entries)
    setSource(res.source)
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  const prepared = useMemo<Prepared[]>(() => {
    return entries.map((entry) => {
      const scan = scanPage(entry.page)
      return { entry, scan, name: scan.def?.name ?? entry.id, iconPath: scan.def?.iconPath, templateId: scan.def?.templateId }
    })
  }, [entries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return prepared
    return prepared.filter((p) =>
      [p.name, p.entry.description, p.entry.author, ...p.entry.tags].join(' ').toLowerCase().includes(q),
    )
  }, [prepared, query])

  const selectedInstalled = selected?.templateId ? installedTemplates.has(selected.templateId) : false

  function install() {
    if (!selected?.scan.valid || !selected.scan.def) return
    const def = selected.scan.def
    const existingId = findByTemplate(def.templateId)
    setSelected(null)
    if (existingId) {
      setPending({ def, existingId })
    } else {
      const id = addPage(def)
      navigate(`/p/${id}`)
    }
  }

  function openInstalled() {
    if (!selected?.templateId) return
    const id = findByTemplate(selected.templateId)
    setSelected(null)
    if (id) navigate(`/p/${id}`)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tags, authors…"
            className="iz-mono text-[13px] w-full pl-9 pr-3 py-2.5 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <circle cx="7" cy="7" r="4.2" />
              <path d="M10.2 10.2 13.5 13.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="iz-mono text-[12px] px-3 py-2.5 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)] disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <p className="iz-mono text-[11px] text-[var(--text-muted)]">
        {loading
          ? 'Checking the community registry…'
          : `${filtered.length} ${filtered.length === 1 ? 'page' : 'pages'} · ${source === 'remote' ? 'updated from GitHub' : 'bundled (offline)'}`}
      </p>

      {/* Grid */}
      {filtered.length === 0 && !loading ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-[14px] text-[var(--text-dim)]">No pages match “{query}”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const installed = p.templateId ? installedTemplates.has(p.templateId) : false
            const review = p.scan.verdict !== 'safe'
            return (
              <button
                key={p.entry.id}
                type="button"
                onClick={() => setSelected(p)}
                className={cn(
                  'text-left rounded-[var(--radius)] border p-5 flex flex-col gap-3 h-full',
                  'border-[var(--border)] bg-white/[0.02] hover:bg-white/[0.04]',
                  'hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 shrink-0 rounded-lg grid place-items-center text-[var(--accent-1)]"
                    style={{ background: 'color-mix(in srgb, var(--accent-1) 10%, transparent)', border: '1px solid var(--border)' }}
                  >
                    <PageGlyph d={p.iconPath} className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[15px] text-[var(--text)] block truncate">{p.name}</span>
                    <span className="iz-mono text-[10px] text-[var(--text-muted)]">by {p.entry.author}</span>
                  </div>
                  {installed ? (
                    <span className="iz-mono text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--accent-1)', background: 'color-mix(in srgb, var(--accent-1) 12%, transparent)' }}>
                      Installed
                    </span>
                  ) : review ? (
                    <span className="w-[7px] h-[7px] rounded-full shrink-0 mt-1.5" style={{ background: p.scan.verdict === 'blocked' ? 'var(--accent-2)' : 'var(--accent-3)' }} title="Worth a look" />
                  ) : null}
                </div>
                <p
                  className="text-[12px] text-[var(--text-dim)] leading-relaxed"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {p.entry.description}
                </p>
                <div className="mt-auto flex items-center gap-1.5 flex-wrap">
                  {p.entry.tags.slice(0, 3).map((t) => (
                    <span key={t} className="iz-mono text-[10px] px-2 py-0.5 rounded-full text-[var(--text-muted)] border border-[var(--border)]">
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <PageInspector
        entry={selected?.entry ?? null}
        scan={selected?.scan ?? null}
        installed={selectedInstalled}
        onInstall={install}
        onOpen={openInstalled}
        onClose={() => setSelected(null)}
      />
      <ImportPageDialog
        open={pending !== null}
        name={pending?.def.name ?? ''}
        localVersion={pending ? (pages[pending.existingId]?.def.version ?? 1) : 1}
        fileVersion={pending?.def.version ?? 1}
        onUpdate={() => {
          if (!pending) return
          updatePageDef(pending.existingId, pending.def)
          navigate(`/p/${pending.existingId}`)
          setPending(null)
        }}
        onAddCopy={() => {
          if (!pending) return
          const id = addPage({ ...pending.def, templateId: crypto.randomUUID() })
          navigate(`/p/${id}`)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}

/* ── Publish tab ── */

function PublishTab() {
  const order = usePages((s) => s.data.order)
  const pages = usePages((s) => s.data.pages)
  const exportPage = usePages((s) => s.exportPage)

  const [pageId, setPageId] = useState<string>(order[0] ?? '')
  const [copied, setCopied] = useState<string | null>(null)

  const def = pageId ? pages[pageId]?.def : undefined
  const json = useMemo(() => (pageId ? exportPage(pageId) : ''), [pageId, exportPage])

  const entryJson = useMemo(() => {
    if (!def || !json) return ''
    let pageObj: unknown = null
    try { pageObj = JSON.parse(json) } catch { pageObj = null }
    return JSON.stringify(
      {
        id: slug(def.name),
        author: 'your-github-handle',
        description: `A page for tracking ${def.name.toLowerCase()}.`,
        tags: [],
        page: pageObj,
      },
      null,
      2,
    )
  }, [def, json])

  async function copy(key: string, text: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600)
    }
  }

  if (order.length === 0) {
    return (
      <div className="rounded-[12px] border border-[var(--border)] bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-[14px] text-[var(--text-dim)]">You have no pages to publish yet. Install one from Browse, then come back.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* page picker */}
      <div className="flex flex-col gap-2">
        <span className="iz-label">Choose a page</span>
        <div className="flex flex-wrap gap-2">
          {order.map((id) => {
            const p = pages[id]
            if (!p) return null
            const active = id === pageId
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPageId(id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-[13px] border transition-colors duration-[var(--motion-fast)]',
                  active
                    ? 'border-[var(--accent-1)] text-[var(--text)] bg-white/[0.04]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-active)]',
                )}
              >
                <span className="w-4 h-4 text-[var(--accent-1)]"><PageGlyph d={p.def.iconPath} /></span>
                {p.def.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* file preview + actions */}
      {def && (
        <div className="rounded-[12px] border border-[var(--border)] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <span className="iz-label">{slug(def.name)}.lifepage.json</span>
            <span className="iz-mono text-[10px] text-[var(--text-muted)] ml-auto">template only · no personal data</span>
          </div>
          <pre className="iz-mono text-[11px] leading-relaxed text-[var(--text-dim)] p-4 max-h-[240px] overflow-auto whitespace-pre iz-noscroll">
            {json}
          </pre>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] flex-wrap">
            <button
              type="button"
              onClick={() => download(`${slug(def.name)}.lifepage.json`, json)}
              className="text-[13px] font-medium px-4 py-2 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
            >
              Download file
            </button>
            <button
              type="button"
              onClick={() => void copy('json', json)}
              className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
            >
              {copied === 'json' ? 'Copied ✓' : 'Copy page JSON'}
            </button>
            <button
              type="button"
              onClick={() => void copy('entry', entryJson)}
              className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-active)] transition-colors duration-[var(--motion-fast)]"
            >
              {copied === 'entry' ? 'Copied ✓' : 'Copy registry entry'}
            </button>
          </div>
        </div>
      )}

      {/* how publishing works */}
      <div className="rounded-[12px] border border-[var(--border)] bg-white/[0.02] p-5">
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Share with the community</span>
        <p className="text-[13px] text-[var(--text-dim)] leading-relaxed mt-2">
          The marketplace is just a public file on GitHub — no servers, no accounts, no cost. To add your page,
          open a pull request that appends your <span className="iz-mono text-[12px] text-[var(--text)]">registry entry</span> to
          <span className="iz-mono text-[12px] text-[var(--text)]"> registry/index.json</span>. Every page is plain data and
          gets reviewed before it merges, so nothing harmful can slip in.
        </p>
        <ol className="text-[12px] text-[var(--text-dim)] leading-relaxed mt-3 ml-4 list-decimal flex flex-col gap-1">
          <li>Copy your registry entry (button above).</li>
          <li>Open the registry on GitHub and edit <span className="iz-mono">index.json</span>.</li>
          <li>Paste your entry into the <span className="iz-mono">entries</span> array and propose the change.</li>
        </ol>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            type="button"
            onClick={() => openExternal(REGISTRY_BROWSE_URL)}
            className="text-[13px] font-medium px-4 py-2 rounded-md text-[var(--text)] border border-[var(--border-active)] hover:bg-white/[0.04] transition-colors duration-[var(--motion-fast)] cursor-pointer"
          >
            Open registry on GitHub →
          </button>
          <button
            type="button"
            onClick={() => void copy('repo', REGISTRY_BROWSE_URL)}
            className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)]"
          >
            {copied === 'repo' ? 'Copied ✓' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => openExternal(REGISTRY_CONTRIBUTE_URL)}
            className="iz-mono text-[12px] px-3 py-2 rounded-md text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:border-[var(--border)] transition-colors duration-[var(--motion-fast)] ml-auto"
          >
            Contribution guide
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */

export default function MarketplacePage() {
  const [tab, setTab] = useState<'browse' | 'publish'>('browse')

  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-7">
      <div>
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>Community</span>
        <h1 className="iz-display text-3xl text-[var(--text)] mt-2">Marketplace</h1>
        <p className="text-[14px] text-[var(--text-dim)] mt-2 max-w-[560px]">
          Discover pages other people have made, inspect exactly what they contain, and install them with one click.
          Everything is plain data — never code — and hosted free on GitHub.
        </p>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--border)] bg-white/[0.02] self-start">
        {(['browse', 'publish'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-[13px] capitalize transition-colors duration-[var(--motion-fast)]',
              tab === t ? 'bg-white/[0.06] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'browse' ? <BrowseTab /> : <PublishTab />}
    </div>
  )
}
