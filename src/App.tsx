import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* Tauri shell: native macOS title bar at the top (handles window dragging
          natively), ARC sidebar on the left, page content fills the rest. */}
      <div className="h-full flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
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
