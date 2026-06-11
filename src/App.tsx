import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { WindowChrome } from './components/WindowChrome'
import { ScrollArea } from './components/ScrollArea'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'
import { useWindowDrag } from './hooks/useWindowDrag'
import { useUi } from './store/ui'
import { cn } from './lib/cn'

/**
 * Layout — the floating-panel sidebar extends all the way to the
 * top of the window. The 10px wrapper padding gives the panel equal
 * margin on every side (top, right, bottom, left), exactly like a
 * modern macOS app with a sidebar.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ┌─ chrome (z-30) ─────────────────────────────────────────┐  │
 *   │ │ ●●●                                            [◀]      │  │ ← WindowChrome:
 *   │ │                                                          │  │   absolute, always
 *   │ │                                                          │  │   at top-left of
 *   │ │ ┌──────────┐                                             │  │   window, never
 *   │ │ │  Panel   │       <main> (Routes render here)           │  │   collapses with
 *   │ │ │  240px   │                                             │  │   the sidebar
 *   │ │ │          │                                             │  │
 *   │ │ └──────────┘                                             │  │
 *   │ └──────────────────────────────────────────────────────────┘  │
 *   └──────────────────────────────────────────────────────────────┘
 *     ↑ 10px margin all around (top, right, bottom, left)
 *
 * The WindowChrome is a window-level absolutely-positioned layer
 * that hosts the traffic lights and the sidebar toggle. It lives
 * at (top: 10px, left: 10px, width: 240px) regardless of the
 * sidebar's open/closed state. When the sidebar is open, the
 * chrome visually sits at the top edge of the panel (same
 * position it used to occupy when it was a child of the panel).
 * When the sidebar is collapsed, the panel slides out and the
 * chrome stays put — close, minimize, maximize, and the toggle
 * are always reachable.
 *
 * Drag: the chrome carries `data-window-drag-zone`, so the empty
 * space between the traffic lights and the toggle drags the
 * window. The buttons themselves opt out via `data-no-drag` (and
 * via being <button> elements), so clicks still fire. The
 * brand block and the page nav inside the panel are NOT in the
 * drag zone, so clicking links inside the panel never starts a
 * drag.
 *
 * Keyboard: ⌘\ toggles the sidebar. Esc reopens it if hidden.
 */
export default function App() {
  useWindowDrag()
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const toggleSidebar = useUi((s) => s.toggleSidebar)
  const setSidebarOpen = useUi((s) => s.setSidebarOpen)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault()
        toggleSidebar()
      } else if (e.key === 'Escape' && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar, setSidebarOpen, sidebarOpen])

  return (
    <BrowserRouter>
      {/* `relative` so WindowChrome's `absolute` positioning
          anchors to this container, not the document. */}
      <div className="relative h-full flex overflow-hidden bg-[var(--bg)]">
        {/* SidebarContainer — animates its width. The panel inside
            has its own `overflow-hidden` so the right border is
            clipped as the width approaches 0 (no thin line at the
            seam). The wrapper's `p-[10px]` gives the floating
            panel equal margin on all four sides — the panel
            extends to the top of the window with the same 10px
            gap it has on the left, right, and bottom. */}
        <div
          className={cn(
            'shrink-0 h-full overflow-hidden',
            'transition-[width] ease-[var(--ease-panel)] will-change-[width]',
            sidebarOpen
              ? 'w-[260px] duration-[var(--motion-slow)]'
              : 'w-0 duration-[var(--motion-slow)] pointer-events-none',
          )}
          aria-hidden={!sidebarOpen}
        >
          <div className="h-full p-[10px]">
            <Sidebar />
          </div>
        </div>

        <main className="flex-1 min-w-0">
          <ScrollArea className="h-full w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/pullups" replace />} />
            <Route path="/pullups" element={<PullupPage />} />
            <Route path="/water" element={<ComingSoon challenge="water" />} />
            <Route path="/sleep" element={<ComingSoon challenge="sleep" />} />
            <Route
              path="/reading"
              element={<ComingSoon challenge="reading" />}
            />
            <Route path="*" element={<Navigate to="/pullups" replace />} />
          </Routes>
          </ScrollArea>
        </main>

        {/* Window-level chrome — traffic lights + sidebar toggle.
            Always visible, always at the top-left of the window,
            never collapsed with the sidebar. */}
        <WindowChrome />
      </div>
      <HelpOverlay />
    </BrowserRouter>
  )
}
