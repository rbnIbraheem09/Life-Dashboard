import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { WindowChrome } from './components/WindowChrome'
import { ScrollArea } from './components/ScrollArea'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'
import SettingsPage from './pages/SettingsPage'
import { useWindowDrag } from './hooks/useWindowDrag'
import { useUi } from './store/ui'
import { cn } from './lib/cn'
import './store/theme' // applies the saved theme on boot, before first paint

/**
 * Layout — Arc-style auto-hiding sidebar.
 *
 *   PINNED (default):   the sidebar is docked. A transparent spacer
 *                       reserves its 260px so the content sits beside it.
 *   UNPINNED:           the spacer collapses to 0 (content goes
 *                       full-width) and the sidebar slides off-screen
 *                       left, taking the toggle with it.
 *   PEEK (unpinned +    hovering the left edge slides the sidebar back in
 *   hover):             as an OVERLAY over the content (nothing reflows);
 *                       moving away slides it out again.
 *
 * The traffic lights are real OS lights (see tauri.conf.json) and stay at
 * the window's top-left — in windowed mode you need them to close the
 * window; in fullscreen macOS auto-hides them, so the collapsed state is
 * completely clean. The toggle rides with the sidebar's visibility.
 *
 * Keyboard: ⌘\ pins / unpins. Esc re-pins when unpinned.
 */
export default function App() {
  useWindowDrag()
  const pinned = useUi((s) => s.sidebarOpen)
  const togglePinned = useUi((s) => s.toggleSidebar)
  const setPinned = useUi((s) => s.setSidebarOpen)

  // Transient hover-peek — only meaningful while unpinned.
  const [peeking, setPeeking] = useState(false)
  const peekTimer = useRef<number | null>(null)
  const visible = pinned || peeking

  // While pinned, peek is irrelevant — keep it false so unpinning always
  // starts from the collapsed state.
  useEffect(() => {
    if (pinned) setPeeking(false)
  }, [pinned])

  function startPeek() {
    if (peekTimer.current !== null) {
      window.clearTimeout(peekTimer.current)
      peekTimer.current = null
    }
    setPeeking(true)
  }

  // Small grace delay so the peek doesn't twitch shut while the panel is
  // still sliding in under the cursor.
  function endPeek() {
    if (pinned) return
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    peekTimer.current = window.setTimeout(() => setPeeking(false), 200)
  }

  useEffect(() => {
    return () => {
      if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault()
        togglePinned()
      } else if (e.key === 'Escape' && !pinned) {
        setPinned(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePinned, setPinned, pinned])

  return (
    <BrowserRouter>
      <div className="relative h-full overflow-hidden">
        {/* Aurora glow layer — fixed behind everything, recolored per theme.
            The content layer below is transparent so it shows through. */}
        <div className="iznic-aurora" />
        <div className="relative z-10 h-full flex overflow-hidden">
        {/* Spacer — reserves the sidebar's width ONLY when pinned, so the
            content sits beside it. Collapses to 0 when unpinned. */}
        <div
          className={cn(
            'shrink-0 h-full transition-[width] ease-[var(--ease-panel)] will-change-[width]',
            'duration-[var(--motion-slow)]',
            pinned ? 'w-[260px]' : 'w-0',
          )}
          aria-hidden
        />

        <main className="flex-1 min-w-0">
          {/* contentClassName makes the scroll content at least as tall as
              the viewport and a flex column; the `my-auto` wrapper then
              centers the page vertically when it fits and collapses to the
              top (fully scrollable) when it overflows. */}
          <ScrollArea
            className="h-full w-full"
            contentClassName="min-h-full flex flex-col"
          >
            <div className="my-auto w-full">
              <Routes>
                <Route path="/" element={<Navigate to="/pullups" replace />} />
                <Route path="/pullups" element={<PullupPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/water"
                  element={<ComingSoon challenge="water" />}
                />
                <Route
                  path="/sleep"
                  element={<ComingSoon challenge="sleep" />}
                />
                <Route
                  path="/reading"
                  element={<ComingSoon challenge="reading" />}
                />
                <Route path="*" element={<Navigate to="/pullups" replace />} />
              </Routes>
            </div>
          </ScrollArea>
        </main>

        {/* Left-edge hot-zone — hovering it peeks the sidebar when unpinned.
            Starts below the window-controls row so reaching for the traffic
            lights never triggers a peek. */}
        {!pinned && (
          <div
            className="absolute left-0 top-[40px] bottom-0 w-[14px] z-10"
            onMouseEnter={startPeek}
          />
        )}

        {/* Sidebar panel — always absolutely positioned. Slides in when
            visible (pinned OR peeking), off-left when hidden. When pinned it
            sits over the reserved spacer (docked); when peeking it overlays
            the content. */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-[260px] p-[10px] z-20',
            'transition-transform ease-[var(--ease-panel)] duration-[var(--motion-slow)] will-change-transform',
            visible ? 'translate-x-0' : '-translate-x-full pointer-events-none',
          )}
          onMouseEnter={startPeek}
          onMouseLeave={endPeek}
          aria-hidden={!visible}
        >
          {/* Toggle lives INSIDE the panel so hovering it never fires the
              panel's mouseleave (which would snap the peek shut). The
              native traffic lights are OS-drawn at the window's top-left
              and sit just to its left. */}
          <WindowChrome />
          <Sidebar />
        </div>
        </div>
      </div>
      <HelpOverlay />
    </BrowserRouter>
  )
}
