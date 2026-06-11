import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TopNav } from './components/TopNav'
import { Ribbon } from './components/Ribbon'
import { Sidebar } from './components/Sidebar'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'

// Tauri 2.0 exposes __TAURI_INTERNALS__ on the WebView's window. In the browser
// (npm run dev) it's absent, so we fall back to the Phase 1 TopNav layout.
const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pullups" replace />} />
      <Route path="/pullups" element={<PullupPage />} />
      <Route path="/water" element={<ComingSoon challenge="water" />} />
      <Route path="/sleep" element={<ComingSoon challenge="sleep" />} />
      <Route path="/reading" element={<ComingSoon challenge="reading" />} />
      <Route path="*" element={<Navigate to="/pullups" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {isTauri ? (
        // Desktop shell: thin ribbon on top, ARC sidebar on the left.
        <div className="h-full flex flex-col">
          <Ribbon />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <AppRoutes />
            </main>
          </div>
        </div>
      ) : (
        // Browser fallback (dev preview) — Phase 1 top-nav layout.
        <div className="min-h-full flex flex-col">
          <TopNav />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      )}
      <HelpOverlay />
    </BrowserRouter>
  )
}
