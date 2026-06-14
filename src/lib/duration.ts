/**
 * Render a duration stored in its declared base unit as human text.
 *   formatDuration(7.5, 'h')  -> "7h 30m"
 *   formatDuration(35, 'min') -> "35m"
 * unit 'h' treats the value as decimal hours; anything else as minutes.
 */
export function formatDuration(value: number, unit: string): string {
  const totalMin = Math.round(unit === 'h' ? value * 60 : value)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0 && m === 0) return unit === 'h' ? '0h' : '0m'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
