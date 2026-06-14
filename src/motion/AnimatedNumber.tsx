import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { SPRING } from './springs'

type Props = {
  value: number
  className?: string
  style?: React.CSSProperties
  /** Maps the live animated number to display text. Defaults to a rounded integer. */
  format?: (n: number) => string
}

/**
 * Springs to `value` on change and renders the in-between numbers without
 * triggering React re-renders (the MotionValue drives the text node directly).
 * Honors prefers-reduced-motion by rendering the value instantly.
 */
export function AnimatedNumber({ value, className, style, format = (n) => String(Math.round(n)) }: Props) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(value)
  const spring = useSpring(mv, SPRING.snappy)
  const text = useTransform(spring, (n) => format(n))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  if (reduce) {
    return <span className={className} style={style}>{format(value)}</span>
  }
  return <motion.span className={className} style={style}>{text}</motion.span>
}
