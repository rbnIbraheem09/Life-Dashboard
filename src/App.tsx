import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
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
 *   │ ┌──────────┐                                                 │
 *   │ │ ●●●  [◀] │                                                 │
 *   │ │          │                                                 │
 *   │ │  Panel   │       <main> (Routes render here)               │
 *   │ │  240px   │                                                 │
 *   │ │          │                                                 │
 *   │ └──────────┘                                                 │
 *   └──────────────────────────────────────────────────────────────┘
 *     ↑ 10px margin all around (top, right, bottom, left)
 *
 * The chrome row at the top of the panel is the window's drag
 * region. It is `data-window-drag-zone`, so `useWindowDrag` starts
 * a drag from any pointerdown on the empty space between the
 * traffic lights and the panel-toggle. The lights and the toggle
 * themselves are `<button>` elements, so the drag hook skips them
 * and the click still fires.
 *
 * There is no separate TitleStrip above the sidebar. The previous
 * design had a 28px transparent strip above the floating panel
 * that doubled as a drag handle, but that produced a visible gap
 * at the top of the window and conflicted with the
 * "sidebar extends to the top" design. Dropped in favor of the
 * sidebar's own chrome row as the drag handle.
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
      <div className="h-full flex overflow-hidden bg-[var(--bg)]">
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
      <HelpOverlay />
    </BrowserRouter>
  )
}
