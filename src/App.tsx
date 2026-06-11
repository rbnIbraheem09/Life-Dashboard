import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TitleStrip } from './components/TitleStrip'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'
import { useWindowDrag } from './hooks/useWindowDrag'
import { useUi } from './store/ui'
import { cn } from './lib/cn'

/**
 * Layout — window-level TitleStrip on top, then a row with the
 * floating-panel sidebar + full-width main area.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                                                              │ ← TitleStrip
 *   │                                                              │   (28px, drag, seamless)
 *   ├──────────┬───────────────────────────────────────────────────┤
 *   │ ┌────────┐│                                                   │
 *   │ │ ●●● [◀]││       <main> (Routes render here)                 │
 *   │ │ Panel  ││                                                   │
 *   │ │ 240px  ││                                                   │
 *   │ │        ││                                                   │
 *   │ └────────┘│                                                   │
 *   └──────────┴───────────────────────────────────────────────────┘
 *     ↑ 10px margin all around the floating panel
 *
 * The TitleStrip is the only window-level drag zone. It is always
 * rendered, so the window is always draggable — even when the sidebar
 * is collapsed. When the sidebar is hidden, the strip also shows a
 * single right-side chevron to reopen it, so the user is never stuck
 * without a way to bring the panel back.
 *
 * SidebarContainer animates its width (260 → 0) to slide the panel
 * in and out. The panel itself has rounded corners, a drop shadow,
 * and `overflow-hidden` to keep the slide clean. The traffic lights
 * and the panel-toggle live inside the panel (see Sidebar.tsx).
 *
 * Drag is wired via `useWindowDrag` — only `[data-window-drag-zone]`
 * elements initiate drag. The strip sets it once, and
 * `[data-no-drag]` / interactive elements opt out locally.
 *
 * Keyboard: ⌘\ toggles. Esc reopens if hidden.
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
      <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
        {/* Window-level drag strip. 28px, seamless, transparent.
            Always rendered so the window is always draggable, and a
            reopen chevron is always reachable from the right side
            when the sidebar is hidden. */}
        <TitleStrip />

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* SidebarContainer — animates its width. The panel inside
              has its own `overflow-hidden` so the right border is
              clipped as the width approaches 0 (no thin line at the
              seam). */}
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

          <main className="flex-1 overflow-y-auto min-w-0">
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
          </main>
        </div>
      </div>
      <HelpOverlay />
    </BrowserRouter>
  )
}
