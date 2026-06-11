import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* Tauri shell: full custom chrome, no native title bar.
          The root <div> is the window drag region. The sidebar <aside>
          (rendered inside) explicitly opts out so nav links stay clickable. */}
      <div
        className="h-full flex overflow-hidden"
        data-tauri-drag-region
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
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
