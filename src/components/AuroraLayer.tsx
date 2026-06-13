import { useState } from 'react'
import { AuroraCanvas } from './AuroraCanvas'

/**
 * AuroraLayer — the ambient background.
 *
 * Prefers the GPU aurora (AuroraCanvas): a flowing, cursor-reactive,
 * per-pixel-dithered shader — liquid motion with a perfectly smooth
 * gradient. If WebGL is unavailable, falls back to the static CSS aurora
 * plus a grain overlay to dither its banding.
 */
function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(
      c.getContext('webgl') ||
      (c.getContext('experimental-webgl') as RenderingContext | null)
    )
  } catch {
    return false
  }
}

export function AuroraLayer() {
  const [webgl] = useState(webglAvailable)

  if (webgl) return <AuroraCanvas />

  return (
    <>
      <div className="iznic-aurora" />
      <div className="iznic-grain" />
    </>
  )
}
