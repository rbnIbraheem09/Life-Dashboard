import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useDashboard } from '../store/dashboard'
import { cn } from '../lib/cn'
import { TrafficLights } from './TrafficLights'
import { PanelToggle } from './PanelToggle'

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

const BUILT_IN_PAGES = [
  { id: 'pullups', path: '/pullups', label: 'Pullups', icon: <PullupsIcon /> },
  { id: 'water', path: '/water', label: 'Water', icon: <WaterIcon /> },
  { id: 'sleep', path: '/sleep', label: 'Sleep', icon: <SleepIcon /> },
  { id: 'reading', path: '/reading', label: 'Reading', icon: <ReadingIcon /> },
] as const

export function Sidebar() {
  const fileRef = useRef<HTMLInputElement>(null)

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
    e.target.value = ''
  }

  // The Sidebar renders as a FLOATING PANEL — a card with rounded
  // corners and a drop shadow, with margin all around (10px) so the
  // window background shows through on every side. The traffic
  // lights and the panel-toggle button sit inside the panel's top
  // zone.
  //
  // Because tauri.conf.json uses `titleBarStyle: "Transparent"`,
  // the OS doesn't draw traffic lights — we render them as React
  // buttons (see TrafficLights.tsx) and call `appWindow.minimize()`,
  // `toggleMaximize()`, `close()` from them. That's the only way
  // to get the traffic lights visually inside a panel that has
  // margin from the window's top-left.
  return (
    <div
      className={cn(
        'h-full w-[240px] flex flex-col overflow-hidden',
        'rounded-[var(--radius)]',
        'border border-[var(--border)]',
        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5),0_2px_8px_-2px_rgba(0,0,0,0.3)]',
        'bg-[var(--surface)]',
      )}
    >
      {/* Top chrome row — traffic lights on the left, panel toggle on
          the right. Both sit inside the panel's top zone with proper
          margin from the panel's rounded corner. data-window-drag-zone
          makes the empty space between them draggable. */}
      <div
        data-window-drag-zone
        className="h-[34px] flex items-center justify-between px-3 pt-2 shrink-0"
      >
        <TrafficLights />
        <PanelToggle />
      </div>

      {/* Brand block — sits below the chrome row. */}
      <div className="px-5 pt-3 pb-4 select-none">
        <div className="flex items-baseline gap-2">
          <span className="iz-display text-[17px] text-[var(--text)] tracking-tight">
            Life-Dashboard
          </span>
        </div>
        <span className="iz-label mt-1 block">v0.2 · desktop</span>
      </div>

      {/* Pages section — flex-1 so it claims all the space between brand and footer. */}
      <div className="px-3 pt-2 pb-3 flex-1 min-h-0 overflow-y-auto sidebar-scroll">
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
                    : 'border-l-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/[0.02]',
                )
              }
            >
              <span className="w-4 h-4 shrink-0">{page.icon}</span>
              <span>{page.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer — export / import. */}
      <div className="px-3 py-3 border-t border-[var(--border)] flex flex-col gap-0.5">
        <span className="iz-label px-3 mb-1">Data</span>
        <button
          type="button"
          onClick={handleExport}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--text-muted)]',
            'hover:text-[var(--text)] hover:bg-white/[0.03] transition-colors duration-[var(--motion-fast)]',
          )}
        >
          <span className="iz-mono w-4 inline-flex justify-center">↓</span>
          Export data
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
          Import data
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
