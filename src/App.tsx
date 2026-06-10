import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TopNav } from './components/TopNav'
import { ComingSoon } from './components/ComingSoon'
import { HelpOverlay } from './components/HelpOverlay'
import PullupPage from './pages/PullupPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/pullups" replace />} />
            <Route path="/pullups" element={<PullupPage />} />
            <Route path="/water" element={<ComingSoon challenge="water" />} />
            <Route path="*" element={<Navigate to="/pullups" replace />} />
          </Routes>
        </main>
        <HelpOverlay />
      </div>
    </BrowserRouter>
  )
}
