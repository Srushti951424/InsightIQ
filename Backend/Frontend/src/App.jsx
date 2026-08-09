import { Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './lib/AnalysisContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PredictiveAnalysis from './pages/PredictiveAnalysis'
import ReportGeneration from './pages/ReportGeneration'

export default function App() {
  return (
    <AnalysisProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictive" element={<PredictiveAnalysis />} />
        <Route path="/report" element={<ReportGeneration />} />
      </Routes>
    </AnalysisProvider>
  )
}
