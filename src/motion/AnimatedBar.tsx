import { motion, useReducedMotion } from 'framer-motion'
import { SPRING } from './springs'

type Props = {
  /** 0..1 fill fraction. */
  pct: number
  className?: string
}

/** A progress fill that springs to its target width. */
export function AnimatedBar({ pct, className }: Props) {
  const reduce = useReducedMotion()
  const width = `${Math.round(Math.min(Math.max(pct, 0), 1) * 100)}%`
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ width }}
      transition={reduce ? { duration: 0 } : SPRING.smooth}
    />
  )
}
