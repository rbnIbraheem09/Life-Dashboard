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
   * Flash the number to the accent color on change, in addition to the pop.
   * Turn OFF for gradient text (the hero counter), where a color flash can't render
   * over `color: transparent` + background-clip:text — there it pops scale+blur only.
   */
  flash?: boolean
}

// The pop everyone loved, now with an Apple-style blur+fade-in:
// the new value materializes (faint + blurred) and sharpens as it stretches.
const POP_SCALE = 1.28 // stretch apex
const POP_MS = 340
const POP_BLUR = 2 // px — the "blur-in"
const POP_OPACITY = 0.65 // opacity the value fades IN from

/**
 * Two animations on every value change:
 *   1. a **pop** — the new value blurs + fades in while it stretches (scale), then
 *      squeezes back sharp. Driven by the Web Animations API, so it's immune to
 *      React re-renders and never fights framer-motion's transform.
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

  // Pop (stretch + blur/opacity fade-in + optional accent flash) on change —
  // skip the first mount and reduced-motion.
  useEffect(() => {
    const changed = prev.current !== value
    prev.current = value
    if (reduce || !changed) return

    const el = ref.current
    if (!el || typeof el.animate !== 'function') return

    let frames: Keyframe[]
    if (flash) {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-1')
        .trim()
      const base = getComputedStyle(el).color
      frames = [
        { transform: 'scale(1)', opacity: POP_OPACITY, filter: `blur(${POP_BLUR}px)`, color: base },
        { transform: `scale(${POP_SCALE})`, opacity: 1, filter: 'blur(0px)', color: accent || base, offset: 0.4 },
        { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)', color: base },
      ]
    } else {
      frames = [
        { transform: 'scale(1)', opacity: POP_OPACITY, filter: `blur(${POP_BLUR}px)` },
        { transform: `scale(${POP_SCALE})`, opacity: 1, filter: 'blur(0px)', offset: 0.4 },
        { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)' },
      ]
    }
    el.animate(frames, { duration: POP_MS, easing: 'ease-out' })
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
