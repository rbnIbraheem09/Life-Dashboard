import { useEffect, useRef } from 'react'

/**
 * AuroraLayer — the living ambient background: the aurora glow + a grain
 * overlay, plus the motion that makes them feel alive.
 *
 * Motion (one rAF loop, transform-only → GPU-cheap):
 *   - a slow autonomous drift (lissajous) + gentle "breathing" scale, so
 *     the background moves even when idle;
 *   - cursor parallax — the glow eases AWAY from the cursor for depth,
 *     chased with lerp so it's always smooth, never janky.
 *
 * Guardrails:
 *   - honors prefers-reduced-motion (stays perfectly still);
 *   - pauses while the window is hidden (no background CPU/battery burn).
 *
 * The grain is a static <3% SVG-noise overlay (see .iznic-grain in
 * index.css) that dithers away the gradient banding.
 */
export function AuroraLayer() {
  const auroraRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = auroraRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    let raf = 0
    const start = performance.now()

    function onMove(e: MouseEvent) {
      // Normalized cursor position, -0.5 … 0.5.
      targetX = e.clientX / window.innerWidth - 0.5
      targetY = e.clientY / window.innerHeight - 0.5
    }

    function frame(now: number) {
      const t = (now - start) / 1000 // seconds
      // Ease the cursor offset toward the target (~8% of the gap per frame).
      curX += (targetX - curX) * 0.08
      curY += (targetY - curY) * 0.08
      // Slow autonomous drift — non-repeating periods so it never loops obviously.
      const driftX = Math.sin(t / 19) * 1.6
      const driftY = Math.cos(t / 23) * 1.3
      // Cursor parallax — opposite the cursor for a sense of depth (subtle).
      const px = -curX * 3.2
      const py = -curY * 3.2
      // Gentle breathing.
      const scale = 1.04 + Math.sin(t / 11) * 0.02
      el!.style.transform = `translate3d(${driftX + px}%, ${driftY + py}%, 0) scale(${scale})`
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    function go() {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    function onVisibility() {
      if (document.hidden) stop()
      else go()
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    go()
    return () => {
      stop()
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <>
      <div ref={auroraRef} className="iznic-aurora" />
      <div className="iznic-grain" />
    </>
  )
}
