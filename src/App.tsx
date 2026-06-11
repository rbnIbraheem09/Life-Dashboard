import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* Tauri shell: native macOS window chrome (rounded corners, drop shadow,
          traffic lights, title bar drag region) + titleBarStyle: "Overlay"
          so our dark content flows under the floating traffic lights.
          The native title bar IS the drag region — no custom data-tauri-drag-region
          needed. Just a flex row of sidebar | main. */}
      <div className="h-full flex overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto"
          data-tauri-drag-region={false}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
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
