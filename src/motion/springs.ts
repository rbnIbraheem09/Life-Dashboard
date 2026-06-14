import type { Transition } from 'framer-motion'

/**
 * Starting spring presets. framer-motion's `bounce` + `duration` is the modern
 * equivalent of SwiftUI's response/dampingFraction model. These are STARTING
 * values — final numbers get tuned in the prototype harness (Task 21) and pasted
 * back here. Do not invent new values elsewhere; import from this file.
 */
export const SPRING = {
  smooth: { type: 'spring', bounce: 0, duration: 0.45 } satisfies Transition,    // no overshoot — bars, fades
  snappy: { type: 'spring', bounce: 0.18, duration: 0.4 } satisfies Transition,  // slight pop — number bumps
  bouncy: { type: 'spring', bounce: 0.32, duration: 0.55 } satisfies Transition, // playful — celebratory only
} as const
