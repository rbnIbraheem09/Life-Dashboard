import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'

const tabs = [
  { to: '/pullups', label: 'Pullups' },
  { to: '/water', label: 'Water' },
]

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'iz-mono text-[12px] px-3 py-1.5 rounded-md transition-colors duration-[var(--motion-mid)]',
    isActive
      ? 'text-[var(--text)] bg-white/[0.05] border border-[var(--border-active)]'
      : 'text-[var(--text-muted)] border border-transparent hover:text-[var(--text-dim)] hover:bg-white/[0.03]'
  )
}

export function TopNav() {
  return (
    <header className="h-16 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm">
      <div className="h-full max-w-[1180px] mx-auto px-9 flex items-center gap-6">
        {/* Active indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)]"
            style={{
              boxShadow:
                '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)',
            }}
          />
          <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
            Active
          </span>
        </div>

        {/* Title */}
        <span className="iz-display text-[15px] text-[var(--text)] tracking-tight">
          Life-Dashboard
        </span>

        {/* Page switcher */}
        <nav className="flex items-center gap-1.5 ml-auto">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={navClass}>
              {t.label}
            </NavLink>
          ))}
          <button
            type="button"
            disabled
            title="More trackers coming soon"
            className="iz-mono text-[13px] w-8 h-8 rounded-md text-[var(--text-muted)] border border-[var(--border)] opacity-50 cursor-default"
          >
            +
          </button>
        </nav>
      </div>
    </header>
  )
}
