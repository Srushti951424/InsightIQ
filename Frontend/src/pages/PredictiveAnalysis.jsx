import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ArrowLeft, ArrowRight, Gauge, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { runForecast } from '../lib/api'
import { useAnalysis } from '../lib/AnalysisContext'

const METRICS = ['Revenue', 'Orders', 'Return Rate']

export default function PredictiveAnalysis() {
  const { dataset, dashboard, forecast, setForecast } = useAnalysis()
  const [metric, setMetric] = useState('Revenue')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!dashboard) { navigate('/'); return }
    if (!forecast) load('Revenue')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  const load = async (m) => {
    setLoading(true)
    const result = await runForecast(dataset?.datasetId, { metric: m })
    setForecast(result)
    setLoading(false)
  }

  if (!dashboard) return null

  const chartData = forecast
    ? [
        ...forecast.history.map((h) => ({ period: h.period, actual: h.actual })),
        ...forecast.forecast.map((f) => ({ period: f.period, forecast: f.forecast, band: [f.low, f.high] })),
      ]
    : []

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-1.5 font-mono text-xs text-slate hover:text-ink"
        >
          <ArrowLeft size={13} /> back to dashboard
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Predictive analysis</p>
            <h1 className="mt-1 font-display text-3xl tracking-tight">What happens next</h1>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate">
              Forecasts are generated from your historical data using an auto-tuned time-series model.
              Confidence bands widen with distance — treat far-out months as directional, not exact.
            </p>
          </div>
          {forecast && <Stamp tone="signal" size="lg" animate>Forecasted</Stamp>}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => { setMetric(m); load(m) }}
              disabled={loading}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                metric === m ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-slate hover:border-ink/50'
              }`}
            >
              {m}
            </button>
          ))}
          <button
            onClick={() => load(metric)}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 font-mono text-xs text-slate hover:text-ink disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> re-run
          </button>
        </div>

        <div className="ledger-rule mt-4 bg-white/60 p-5 pt-6">
          {loading || !forecast ? (
            <div className="flex h-72 items-center justify-center font-mono text-xs text-slate">
              Running forecast model…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="eyebrow">{forecast.metric} — history &amp; forecast</p>
                <div className="flex items-center gap-1.5 font-mono text-xs text-slate">
                  <Gauge size={13} /> {forecast.model} · MAPE {forecast.accuracy.mape}%
                </div>
              </div>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 12, borderRadius: 2 }} />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
                    <Area dataKey="band" stroke="none" fill="#E3A23C" fillOpacity={0.12} name="confidence band" />
                    <Line type="monotone" dataKey="actual" stroke="#101C29" strokeWidth={2.5} dot={{ r: 3 }} name="actual" connectNulls />
                    <Line type="monotone" dataKey="forecast" stroke="#E3A23C" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3 }} name="forecast" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {forecast && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="border border-ink/10 bg-white/60 p-5 md:col-span-1">
              <p className="eyebrow">Model accuracy</p>
              <p className="mt-3 font-mono text-2xl">{forecast.accuracy.mape}%</p>
              <p className="text-xs text-slate">mean absolute % error</p>
              <p className="mt-3 font-mono text-2xl">{forecast.accuracy.rmse}</p>
              <p className="text-xs text-slate">RMSE</p>
            </div>
            <div className="ledger-rule bg-white/60 p-5 pt-6 md:col-span-2">
              <p className="eyebrow">What's driving this forecast</p>
              <ul className="mt-3 space-y-2">
                {forecast.drivers.map((d, i) => (
                  <li key={i} className="border-l-2 border-current pl-3 text-sm leading-relaxed text-ink/90">{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="ledger-rule mt-8 flex flex-col items-stretch gap-3 pt-8 sm:flex-row sm:justify-end">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
          <Button variant="signal" icon={ArrowRight} onClick={() => navigate('/report')}>
            Generate report
          </Button>
        </div>
      </section>
    </div>
  )
}
