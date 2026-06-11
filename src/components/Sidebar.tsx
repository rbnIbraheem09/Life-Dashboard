import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useDashboard } from '../store/dashboard'
import { cn } from '../lib/cn'

/* ── Page icons (16×16, 1.5px stroke, currentColor — no icon library) ── */

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  )
}

const BUILT_IN_PAGES = [
  { id: 'pullups', path: '/pullups', label: 'Pullups', icon: <PullupsIcon /> },
  { id: 'water', path: '/water', label: 'Water', icon: <WaterIcon /> },
  { id: 'sleep', path: '/sleep', label: 'Sleep', icon: <SleepIcon /> },
  { id: 'reading', path: '/reading', label: 'Reading', icon: <ReadingIcon /> },
] as const

export function Sidebar() {
  const fileRef = useRef<HTMLInputElement>(null)

  // Moved verbatim from TopNav — same store calls, same behavior.
  function handleExport() {
    const json = useDashboard.getState().exportJSON()
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
      try {
        const parsed = JSON.parse(text)
        if (parsed?.version !== 1 || typeof parsed.challenges !== 'object') {
          throw new Error('Unrecognized schema')
        }
        useDashboard.getState().importJSON(text)
      } catch {
        // eslint-disable-next-line no-alert
        window.alert('Import failed: not a valid Life-Dashboard backup file.')
      }
    }
    reader.readAsText(file)
    // Reset so selecting the same file again still fires onChange.
    e.target.value = ''
  }

  return (
    /* The <aside> opts out of drag so the nav links and buttons stay clickable.
       The native macOS title bar (decorations: true + titleBarStyle: "Overlay")
       is the drag region — the user grabs the top of the window to move it,
       and our content flows underneath the floating traffic lights. */
    <aside
      className="w-[240px] shrink-0 h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)]"
      data-tauri-drag-region={false}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Brand block — padding-left 80px leaves room for the floating macOS
          traffic lights that sit at top-left of the window via
          titleBarStyle: "Overlay". They overlay our content (don't push it),
          so we pad the brand row to keep the "Active" dot clear. */}
      <div
        className="px-5 pt-3 pb-3 flex items-center gap-2"
        style={{ paddingLeft: '80px' }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full bg-[var(--accent-1)]"
          style={{
            boxShadow:
              '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
          }}
        />
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Active
        </span>
      </div>
      <div className="px-5 pb-5">
        <span className="iz-display text-lg text-[var(--text)] tracking-tight">
          Life-Dashboard
        </span>
      </div>

      {/* Pages section */}
      <div className="px-3 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-2 px-2 mb-2">
          <span className="iz-label">Pages</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        <nav className="flex flex-col gap-0.5">
          {BUILT_IN_PAGES.map((page) => (
            <NavLink
              key={page.id}
              to={page.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] relative',
                  'border-l-2 transition-colors duration-[var(--motion-fast)]',
                  isActive
                    ? 'bg-white/[0.04] border-l-[var(--accent-1)] text-[var(--text)]'
                    : 'border-l-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/[0.02]'
                )
              }
            >
              <span className="w-4 h-4 shrink-0">{page.icon}</span>
              <span>{page.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            disabled
            title="Coming in Phase 3"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[var(--text-muted)] opacity-50 cursor-default border-l-2 border-l-transparent"
          >
            <span className="w-4 h-4 shrink-0">
              <PlusIcon />
            </span>
            <span>Add page</span>
          </button>
        </nav>
      </div>

      {/* Export / Import at bottom */}
      <div className="px-3 py-3 border-t border-[var(--border)] flex flex-col gap-1">
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]"
        >
          <span className="iz-mono">↓</span> Export data
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]"
        >
          <span className="iz-mono">↑</span> Import data
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </aside>
  )
}
