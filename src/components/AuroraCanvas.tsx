import { useEffect, useRef } from 'react'
import { THEMES, useThemeStore } from '../store/theme'

/**
 * AuroraCanvas — the living aurora, rendered on the GPU.
 *
 * Why WebGL (not CSS): CSS radial-gradients band in dark colors (8-bit
 * quantization) and can only slide rigidly. A fragment shader can (a) flow
 * organically via domain-warped fractal noise — "liquid" motion that the
 * cursor pushes around — and (b) dither per-pixel so the gradient is
 * mathematically smooth with no banding and no visible grain.
 *
 * Cheap: one fullscreen triangle, a handful of noise octaves. Pauses while
 * hidden; honors prefers-reduced-motion (renders a single static frame).
 * Theme colors come straight from the active theme.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform vec3  uColorBg;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform float uIntensity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv;
  p.x *= uResolution.x / uResolution.y; // aspect-correct
  p *= 2.4;                             // zoom
  float t = uTime * 0.06;               // slow flow
  vec2 m = (uMouse - 0.5) * 0.8;        // cursor push

  // Domain warping (Inigo Quilez) → organic, liquid flow.
  vec2 q = vec2(
    fbm(p + t),
    fbm(p + vec2(5.2, 1.3) - t)
  );
  vec2 r = vec2(
    fbm(p + 1.7 * q + vec2(1.7, 9.2) + m + 0.15 * t),
    fbm(p + 1.7 * q + vec2(8.3, 2.8) - m + 0.12 * t)
  );
  float f = fbm(p + 1.8 * r);

  // Soft accent glows over the theme bg.
  vec3 col = uColorBg;
  col = mix(col, uColor1, clamp(smoothstep(0.15, 0.95, f) * uIntensity, 0.0, 1.0));
  col = mix(col, uColor2, clamp(smoothstep(0.20, 1.00, length(r)) * uIntensity * 0.7, 0.0, 1.0));
  col = mix(col, uColor3, clamp(smoothstep(0.55, 1.10, q.x + f) * uIntensity * 0.5, 0.0, 1.0));

  // Gentle vignette so edges settle into the bg.
  float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
  col *= mix(0.82, 1.0, vig);

  // Per-pixel dither (Jimenez gradient noise) — kills banding, no motion.
  float dn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  col += (dn - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`

/* Aurora glow strength — how far the flow tints the bg toward the accent
   colors. Kept low so the background stays dark and the content stays
   readable; the flow reads as a soft glow, not a bright wash. These are the
   two knobs to tune for contrast. */
const INTENSITY_DARK = 0.22
const INTENSITY_LIGHT = 0.15

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn('[AuroraCanvas] shader compile failed:', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
  if (!vs || !fs) return null
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn('[AuroraCanvas] program link failed:', gl.getProgramInfoLog(p))
    return null
  }
  return p
}

export function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // A ref so theme changes update colors without rebuilding the GL program.
  const applyColorsRef = useRef<((id: string) => void) | null>(null)
  const themeId = useThemeStore((s) => s.themeId)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context =
      canvasEl.getContext('webgl', { antialias: false, depth: false }) ||
      (canvasEl.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!context) return
    // Lock in the non-null narrowing so the closures below keep it.
    const canvas = canvasEl
    const gl = context

    const prog = createProgram(gl, VERT, FRAG)
    if (!prog) return
    gl.useProgram(prog)

    // Fullscreen triangle.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uRes = gl.getUniformLocation(prog, 'uResolution')
    const uMouse = gl.getUniformLocation(prog, 'uMouse')
    const uBg = gl.getUniformLocation(prog, 'uColorBg')
    const uC1 = gl.getUniformLocation(prog, 'uColor1')
    const uC2 = gl.getUniformLocation(prog, 'uColor2')
    const uC3 = gl.getUniformLocation(prog, 'uColor3')
    const uIntensity = gl.getUniformLocation(prog, 'uIntensity')

    function applyColors(id: string) {
      const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]
      const c = theme.colors
      gl.uniform3fv(uBg, hexToRgb(c.bg))
      gl.uniform3fv(uC1, hexToRgb(c.accent[0]))
      gl.uniform3fv(uC2, hexToRgb(c.accent[1] ?? c.accent[0]))
      gl.uniform3fv(uC3, hexToRgb(c.accent[2] ?? c.accent[1] ?? c.accent[0]))
      gl.uniform1f(uIntensity, theme.mode === 'light' ? INTENSITY_LIGHT : INTENSITY_DARK)
    }
    applyColorsRef.current = applyColors
    applyColors(useThemeStore.getState().themeId)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    function resize() {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tgtX = 0.5
    let tgtY = 0.5
    let mx = 0.5
    let my = 0.5
    function onMove(e: MouseEvent) {
      tgtX = e.clientX / window.innerWidth
      tgtY = 1 - e.clientY / window.innerHeight // GL y points up
    }

    let raf = 0
    const start = performance.now()
    function frame(now: number) {
      mx += (tgtX - mx) * 0.05
      my += (tgtY - my) * 0.05
      resize()
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.uniform2f(uMouse, mx, my)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    function drawStatic() {
      resize()
      gl.uniform1f(uTime, 8.0)
      gl.uniform2f(uMouse, 0.5, 0.5)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
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

    window.addEventListener('resize', resize)
    if (reduce) {
      drawStatic()
    } else {
      window.addEventListener('mousemove', onMove, { passive: true })
      document.addEventListener('visibilitychange', onVisibility)
      go()
    }

    return () => {
      stop()
      applyColorsRef.current = null
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
    }
  }, [])

  // Update colors on theme change without rebuilding the program.
  useEffect(() => {
    applyColorsRef.current?.(themeId)
  }, [themeId])

  return <canvas ref={canvasRef} className="iznic-aurora-canvas" aria-hidden="true" />
}
