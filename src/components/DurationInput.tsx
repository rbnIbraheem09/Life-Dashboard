import { cn } from '../lib/cn'

type Props = {
  /** Value in the field's base unit: 'h' = decimal hours, anything else = minutes. */
  value: number
  unit: string
  step?: number
  onChange: (value: number) => void
  className?: string
}

const BOX =
  'iz-mono text-[14px] w-16 px-3 py-2 rounded-md bg-white/[0.03] border border-[var(--border)] text-[var(--text)] focus:border-[var(--border-active)] focus:outline-none tabular-nums'

/** Duration entry. unit 'h' renders two boxes [h][m]; otherwise a single [unit] box. */
export function DurationInput({ value, unit, step = 1, onChange, className }: Props) {
  if (unit === 'h') {
    const totalMin = Math.round(value * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <input
          type="number"
          min={0}
          value={h}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value))) + m / 60)}
          className={BOX}
        />
        <span className="iz-label">h</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={m}
          onChange={(e) => onChange(h + Math.min(59, Math.max(0, Math.floor(Number(e.target.value)))) / 60)}
          className={BOX}
        />
        <span className="iz-label">m</span>
      </div>
    )
  }
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className={BOX}
      />
      <span className="iz-label">{unit}</span>
    </div>
  )
}
