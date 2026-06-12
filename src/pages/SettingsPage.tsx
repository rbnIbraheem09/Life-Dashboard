import { THEMES, useThemeStore } from '../store/theme'
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
    </div>
  )
}
