import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { SPRING } from './springs'

type Props = {
  value: number
  className?: string
  style?: React.CSSProperties
  /** Maps the live animated number to display text. Defaults to a rounded integer. */
  format?: (n: number) => string
  /**
   * Flash the number to the accent color on change, in addition to the scale pop.
   * Turn OFF for gradient text (the hero counter), where a color flash can't render
   * over `color: transparent` + background-clip:text — there it pops scale-only.
   */
  flash?: boolean
}

// The pop everyone loved: scale up to 1.28 at the apex, settle back.
const POP_SCALE = 1.28
const POP_MS = 300

/**
 * Two animations on every value change:
 *   1. a **pop** — scale (+ optional accent flash) via the Web Animations API, so
 *      it's immune to React re-renders and never fights framer-motion's transform.
 *   2. a **count-up** — the displayed digits roll toward `value` on a no-overshoot
 *      spring (so a +10 jump visibly climbs; a +1 mostly just pops).
 * Honors prefers-reduced-motion: no pop, no roll, the value updates instantly.
 */
export function AnimatedNumber({
  value,
  className,
  style,
  format = (n) => String(Math.round(n)),
  flash = true,
}: Props) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(value)
  const spring = useSpring(mv, SPRING.smooth) // bounce:0 → monotonic count, never overshoots the target number
  const text = useTransform(spring, (n) => format(n))
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)

  // Roll the displayed number toward the new value.
  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  // Pop on change (skip the first mount and reduced-motion).
  useEffect(() => {
    const changed = prev.current !== value
    prev.current = value
    if (reduce || !changed) return

    const el = ref.current
    if (!el || typeof el.animate !== 'function') return

    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: `scale(${POP_SCALE})`, offset: 0.35 },
        { transform: 'scale(1)' },
      ],
      { duration: POP_MS, easing: 'ease-out' }
    )

    if (flash) {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-1')
        .trim()
      const base = getComputedStyle(el).color
      if (accent) {
        el.animate(
          [{ color: base }, { color: accent, offset: 0.35 }, { color: base }],
          { duration: POP_MS, easing: 'ease-out' }
        )
      }
    }
  }, [value, reduce, flash])

  if (reduce) {
    return (
      <span ref={ref} className={className} style={style}>
        {format(value)}
      </span>
    )
  }
  return (
    <motion.span ref={ref} className={className} style={style}>
      {text}
    </motion.span>
  )
}
