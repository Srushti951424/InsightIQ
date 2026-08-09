import React, { createContext, useContext, useState } from 'react'

const AnalysisContext = createContext(null)

export function AnalysisProvider({ children }) {
  const [dataset, setDataset] = useState(null) // result of uploadDatasets()
  const [dashboard, setDashboard] = useState(null) // result of fetchDashboard()
  const [forecast, setForecast] = useState(null) // result of runForecast()
  const [report, setReport] = useState(null) // result of generateReport()

  const value = { dataset, setDataset, dashboard, setDashboard, forecast, setForecast, report, setReport }
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider')
  return ctx
}
