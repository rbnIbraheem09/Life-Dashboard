import { useEffect, useState } from 'react'
import { THEMES, useThemeStore, type PanelStyle } from '../store/theme'
import { useUpdater } from '../store/updater'
import { cn } from '../lib/cn'

/**
 * A live preview swatch for one theme — the theme's own bg + its aurora
 * glows + a mini surface card + its accent gradient. Rendered with the
 * theme's literal colors (not var(--*)) so each card previews itself.
 */
function ThemeCard({ id }: { id: string }) {
  const theme = THEMES.find((t) => t.id === id)!
  const activeId = useThemeStore((s) => s.themeId)
  const setTheme = useThemeStore((s) => s.setTheme)
  const active = activeId === id
  const c = theme.colors

  const aurora = c.auroraSpots
    .map(
      (s) =>
        `radial-gradient(circle at ${s.x} ${s.y}, ${s.color} 0%, transparent 60%)`,
    )
    .join(', ')

  return (
    <button
      type="button"
      onClick={() => setTheme(id)}
      aria-pressed={active}
      className={cn(
        'text-left rounded-[var(--radius)] border p-3',
        'transition-colors duration-[var(--motion-fast)]',
        active
          ? 'border-[var(--accent-1)] bg-white/[0.02]'
          : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent-1)_40%,var(--border))]',
      )}
    >
      <div
        className="relative h-24 w-full rounded-lg overflow-hidden"
        style={{ background: c.bg }}
      >
        <div className="absolute inset-0" style={{ background: aurora }} />
        <div
          className="absolute left-3 right-3 bottom-3 h-8 rounded-md"
          style={{ background: c.surface, border: `1px solid ${c.border}` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[13px]" style={{ color: c.text }}>
            {theme.name}
          </span>
          <span className="iz-label mt-0.5">{theme.mode}</span>
        </div>
        <span
          className="h-3 w-12 rounded-full shrink-0"
          style={{ background: `linear-gradient(135deg, ${c.accent.join(', ')})` }}
        />
      </div>
    </button>
  )
}

const PANEL_STYLES: { id: PanelStyle; label: string; desc: string }[] = [
  { id: 'opaque', label: 'Opaque', desc: 'Solid surface panels.' },
  { id: 'transparent', label: 'Transparent', desc: 'The aurora shows through the panels.' },
]

function SurfaceToggle() {
  const panelStyle = useThemeStore((s) => s.panelStyle)
  const setPanelStyle = useThemeStore((s) => s.setPanelStyle)

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {PANEL_STYLES.map((o) => {
        const active = panelStyle === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setPanelStyle(o.id)}
            aria-pressed={active}
            className={cn(
              'flex-1 text-left rounded-[var(--radius)] border p-4',
              'transition-colors duration-[var(--motion-fast)]',
              active
                ? 'border-[var(--accent-1)] bg-white/[0.03]'
                : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent-1)_40%,var(--border))]',
            )}
          >
            <span className="text-[14px] text-[var(--text)]">{o.label}</span>
            <span className="block text-[12px] text-[var(--text-dim)] mt-1">
              {o.desc}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function UpdatesSection() {
  const status = useUpdater((s) => s.status)
  const newVersion = useUpdater((s) => s.newVersion)
  const storeVersion = useUpdater((s) => s.currentVersion)
  const notes = useUpdater((s) => s.notes)
  const progress = useUpdater((s) => s.progress)
  const error = useUpdater((s) => s.error)
  const check = useUpdater((s) => s.check)
  const install = useUpdater((s) => s.install)

  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    // Show the running version. Guarded so the browser/dev build doesn't throw.
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => {})
  }, [])

  const current = version ?? storeVersion
  const busy = status === 'checking' || status === 'downloading' || status === 'ready'

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="iz-label">Updates</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white/[0.02] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <span className="text-[14px] text-[var(--text)]">Life-Dashboard</span>
            <span className="block iz-mono text-[11px] text-[var(--text-muted)] mt-0.5">
              {current ? `Current version v${current}` : 'Desktop app'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void check()}
            disabled={busy}
            className={cn(
              'ml-auto text-[13px] font-medium px-4 py-2 rounded-md transition-opacity duration-[var(--motion-fast)]',
              busy
                ? 'bg-white/[0.04] text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--text)] border border-[var(--border-active)] hover:bg-white/[0.04] cursor-pointer',
            )}
          >
            {status === 'checking' ? 'Checking…' : 'Check for updates'}
          </button>
        </div>

        {/* state-driven feedback */}
        {status === 'uptodate' && (
          <p className="text-[13px] text-[var(--text-dim)]">
            You’re on the latest version <span className="text-[var(--accent-1)]">✓</span>
          </p>
        )}

        {status === 'unsupported' && (
          <p className="text-[13px] text-[var(--text-dim)]">
            Automatic updates are available in the desktop app.
          </p>
        )}

        {status === 'error' && (
          <p className="text-[13px]" style={{ color: 'var(--accent-2)' }}>
            Couldn’t check for updates{error ? `: ${error}` : '.'}
          </p>
        )}

        {(status === 'available' || status === 'downloading' || status === 'ready') && (
          <div className="rounded-[10px] border border-[var(--border)] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--accent-1)] shrink-0"
                style={{ boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }}
              />
              <span className="text-[13px] text-[var(--text)]">
                Version <span className="iz-mono text-[var(--accent-1)]">{newVersion}</span> is available
              </span>
              {status === 'available' && (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="ml-auto text-[12px] font-medium px-3 py-1.5 rounded-md bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity duration-[var(--motion-fast)] cursor-pointer"
                >
                  Download & install
                </button>
              )}
            </div>

            {notes && status === 'available' && (
              <p className="text-[12px] text-[var(--text-dim)] leading-relaxed whitespace-pre-line max-h-[160px] overflow-auto iz-noscroll">
                {notes}
              </p>
            )}

            {status === 'downloading' && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full bg-[color-mix(in_srgb,var(--accent-1)_10%,transparent)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-1)] transition-[width] duration-[var(--motion-fast)]"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="iz-mono text-[11px] text-[var(--text-muted)] tabular-nums w-10 text-right">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            )}

            {status === 'ready' && (
              <p className="iz-mono text-[12px] text-[var(--text-dim)]">Installed — restarting…</p>
            )}
          </div>
        )}

        <p className="iz-mono text-[11px] text-[var(--text-muted)] leading-relaxed">
          Updates are verified by signature and only replace the app — your pages and logged data are
          never touched.
        </p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-8">
      <div>
        <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
          Settings
        </span>
        <h1 className="iz-display text-3xl text-[var(--text)] mt-2">
          Appearance
        </h1>
        <p className="text-[14px] text-[var(--text-dim)] mt-2 max-w-[520px]">
          Pick a theme. The whole dashboard repaints instantly — colors,
          gradients, and the aurora glow.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="iz-label">Theme</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEMES.map((t) => (
            <ThemeCard key={t.id} id={t.id} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="iz-label">Surface</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        <SurfaceToggle />
      </div>

      <UpdatesSection />
    </div>
  )
}
