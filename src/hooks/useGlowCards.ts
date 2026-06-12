import { useEffect } from 'react'

/**
 * useGlowCards — makes the cursor-tracking sheen on `.glow-card` elements
 * follow the pointer. One global listener writes the cursor's position
 * within the hovered card to `--mx` / `--my` (read by the `.glow-card::after`
 * radial in index.css). Writes style props directly — no React re-renders.
 *
 * Honors prefers-reduced-motion: if reduced, the sheen just stays centered.
 */
export function useGlowCards() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function onMove(e: MouseEvent) {
      const target = e.target as Element | null
      const card = target?.closest?.('.glow-card') as HTMLElement | null
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`)
      card.style.setProperty('--my', `${e.clientY - rect.top}px`)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
}
