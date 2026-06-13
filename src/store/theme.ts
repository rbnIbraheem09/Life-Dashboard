import { create } from 'zustand'

/**
 * Theme system — pure localStorage, no backend.
 *
 * The whole app is var(--*)-driven, so applying a theme is just writing
 * tokens onto :root — every card, gradient, border, and the aurora glow
 * repaint instantly. Ported from IznicOS's runtime theme model.
 */

export type ThemeColors = {
  bg: string
  /** Opaque base surface. Cards render it at SURFACE_ALPHA so the aurora
   *  glows through (see applyTheme). */
  surface: string
  text: string
  textDim: string
  textMuted: string
  border: string
  borderActive: string
  /** 1–3 gradient stops (accent-1/2/3). */
  accent: string[]
  /** Up to 3 soft radial glows for the aurora layer. */
  auroraSpots: { x: string; y: string; color: string }[]
}

export type Theme = {
  id: string
  name: string
  mode: 'dark' | 'light'
  colors: ThemeColors
}

/**
 * Card/surface opacity — the single knob for "glassy card" intensity.
 * Lower = more aurora bleeds through the cards. Tune live.
 */
const SURFACE_ALPHA = 0.78

export const THEMES: Theme[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    mode: 'dark',
    colors: {
      bg: '#06040C',
      surface: '#0E0B18',
      text: '#E8E4F0',
      textDim: '#A1A1AA',
      textMuted: '#71717A',
      border: 'rgba(255,255,255,0.06)',
      borderActive: 'rgba(167,139,250,0.25)',
      accent: ['#C4B5FD', '#F472B6', '#FBBF24'],
      auroraSpots: [
        { x: '15%', y: '10%', color: 'rgba(167,139,250,0.18)' },
        { x: '90%', y: '30%', color: 'rgba(247,114,182,0.10)' },
        { x: '70%', y: '95%', color: 'rgba(96,165,250,0.08)' },
      ],
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    colors: {
      bg: '#06100B',
      surface: '#0D1810',
      text: '#E0F2E9',
      textDim: '#94A89B',
      textMuted: '#5E7568',
      border: 'rgba(255,255,255,0.06)',
      borderActive: 'rgba(52,211,153,0.25)',
      accent: ['#6EE7B7', '#FCD34D'],
      auroraSpots: [
        { x: '80%', y: '10%', color: 'rgba(52,211,153,0.14)' },
        { x: '20%', y: '80%', color: 'rgba(252,211,77,0.06)' },
      ],
    },
  },
  {
    id: 'paperback',
    name: 'Paperback',
    mode: 'light',
    colors: {
      bg: '#FBF7F1',
      surface: '#F4EFE6',
      text: '#2D2419',
      textDim: '#6B6055',
      textMuted: '#948677',
      border: 'rgba(0,0,0,0.08)',
      borderActive: 'rgba(217,119,6,0.30)',
      accent: ['#C2410C', '#B45309'],
      auroraSpots: [{ x: '20%', y: '10%', color: 'rgba(217,119,6,0.08)' }],
    },
  },
  {
    // Designed for Life-Dashboard, in the IznicOS framework — a deep-space
    // night: indigo / cyan / fuchsia glows over a blue-black void.
    id: 'nocturne',
    name: 'Nocturne',
    mode: 'dark',
    colors: {
      bg: '#070A14',
      surface: '#0E1320',
      text: '#E6EAF5',
      textDim: '#9AA3B8',
      textMuted: '#646C82',
      border: 'rgba(255,255,255,0.06)',
      borderActive: 'rgba(129,140,248,0.28)',
      accent: ['#7DD3FC', '#818CF8', '#F0ABFC'],
      auroraSpots: [
        { x: '12%', y: '8%', color: 'rgba(129,140,248,0.16)' },
        { x: '88%', y: '25%', color: 'rgba(125,211,252,0.10)' },
        { x: '65%', y: '95%', color: 'rgba(240,171,252,0.08)' },
      ],
    },
  },
]

const KEY = 'life-dashboard:theme:v1'
const DEFAULT_ID = 'aurora'

/** Global panel surface look — both values are existing card configs:
 *  opaque = the Stats/Activity surface; transparent = the Hero/Sets gradient.
 *  Driven purely by the data-panel-style attribute + --panel-bg in index.css. */
export type PanelStyle = 'opaque' | 'transparent'
const PANEL_KEY = 'life-dashboard:panelstyle:v1'
const DEFAULT_PANEL_STYLE: PanelStyle = 'opaque'

function loadPanelStyle(): PanelStyle {
  try {
    return localStorage.getItem(PANEL_KEY) === 'transparent'
      ? 'transparent'
      : DEFAULT_PANEL_STYLE
  } catch {
    return DEFAULT_PANEL_STYLE
  }
}

function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

function loadThemeId(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_ID
  } catch {
    return DEFAULT_ID
  }
}

/** Write a theme's tokens onto :root. Repaints the whole app + the aurora. */
function applyTheme(theme: Theme, panelStyle: PanelStyle): void {
  const r = document.documentElement.style
  const c = theme.colors
  r.setProperty('--bg', c.bg)
  // Translucent so the aurora glows through every --surface card.
  r.setProperty(
    '--surface',
    `color-mix(in srgb, ${c.surface} ${SURFACE_ALPHA * 100}%, transparent)`,
  )
  r.setProperty('--text', c.text)
  r.setProperty('--text-dim', c.textDim)
  r.setProperty('--text-muted', c.textMuted)
  r.setProperty('--border', c.border)
  r.setProperty('--border-active', c.borderActive)
  r.setProperty('--accent-1', c.accent[0])
  r.setProperty('--accent-2', c.accent[1] ?? c.accent[0])
  r.setProperty('--accent-3', c.accent[2] ?? c.accent[1] ?? c.accent[0])
  for (let i = 0; i < 3; i++) {
    const s = c.auroraSpots[i]
    r.setProperty(`--aurora-${i + 1}-x`, s?.x ?? '50%')
    r.setProperty(`--aurora-${i + 1}-y`, s?.y ?? '50%')
    // Missing spots resolve to transparent → that gradient adds nothing.
    r.setProperty(`--aurora-${i + 1}-c`, s?.color ?? 'transparent')
  }
  document.documentElement.dataset.themeMode = theme.mode
  document.documentElement.dataset.panelStyle = panelStyle
}

// Apply the saved theme + panel style at module load — before React's first
// paint — so there's no flash of defaults. App.tsx imports this for the effect.
applyTheme(themeById(loadThemeId()), loadPanelStyle())

type ThemeState = {
  themeId: string
  panelStyle: PanelStyle
  setTheme: (id: string) => void
  setPanelStyle: (style: PanelStyle) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: loadThemeId(),
  panelStyle: loadPanelStyle(),
  setTheme: (id) => {
    applyTheme(themeById(id), get().panelStyle)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    set({ themeId: id })
  },
  setPanelStyle: (style) => {
    applyTheme(themeById(get().themeId), style)
    try {
      localStorage.setItem(PANEL_KEY, style)
    } catch {
      /* storage unavailable — still applies for this session */
    }
    set({ panelStyle: style })
  },
}))
