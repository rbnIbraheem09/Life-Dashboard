import { cn } from '../lib/cn'

type Props = {
  value: number
  scale: number
  /** Provide to make the dots clickable; omit for read-only display. */
  onChange?: (value: number) => void
  className?: string
}

/**
 * A row of `scale` dots, filled up to `value`. Echoes the 6px accent dot used in
 * block headers. Interactive when `onChange` is supplied, read-only otherwise.
 */
export function RatingDots({ value, scale, onChange, className }: Props) {
  const dots = Array.from({ length: scale }, (_, i) => i + 1)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {dots.map((n) => {
        const filled = n <= value
        const dot = (
          <span
            className={cn(
              'inline-block w-[11px] h-[11px] rounded-full transition-colors duration-[var(--motion-fast)]',
              filled ? 'bg-[var(--accent-1)]' : 'bg-white/[0.08]'
            )}
            style={
              filled
                ? { boxShadow: '0 0 6px 1px color-mix(in srgb, var(--accent-1) 50%, transparent)' }
                : undefined
            }
          />
        )
        if (!onChange) return <span key={n}>{dot}</span>
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={`${n} / ${scale}`}
            className="p-1 -m-1 rounded-full hover:scale-110 transition-transform duration-[var(--motion-fast)] cursor-pointer"
          >
            {dot}
          </button>
        )
      })}
    </div>
  )
}
