import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, FileDown, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { generateReport } from '../lib/api'
import { useAnalysis } from '../lib/AnalysisContext'

const HORIZONS = [3, 4, 6, 8]

export default function ReportGeneration() {
  const { dataset, dashboard, report, setReport } = useAnalysis()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState(dashboard?.primaryMetric || '')
  const [horizon, setHorizon] = useState(4)
  const navigate = useNavigate()

  const metrics = dashboard?.metrics?.length ? dashboard.metrics : (dashboard?.primaryMetric ? [dashboard.primaryMetric] : [])

  useEffect(() => {
    if (!dashboard) { navigate('/'); return }
    if (!metric && dashboard.primaryMetric) setMetric(dashboard.primaryMetric)
    if (!report) generate(dashboard.primaryMetric, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  const generate = async (m = metric, h = horizon) => {
    setLoading(true)
    setError('')
    try {
      const result = await generateReport(dataset?.datasetId, { metric: m, horizon: h })
      setReport(result)
    } catch (err) {
      setError(err.message || 'Could not generate the report. Check that the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!report?.pdfUrl) return
    const link = document.createElement('a')
    link.href = report.pdfUrl
    link.download = `insightiq-report-${dataset?.datasetId ?? 'export'}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  if (!dashboard) return null

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-1.5 font-mono text-xs text-slate hover:text-ink"
        >
          <ArrowLeft size={13} /> back to dashboard
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Report generation</p>
            <h1 className="mt-1 font-display text-3xl tracking-tight">Executive report</h1>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate">
              A ready-to-share PDF covering the executive summary, key metrics, data methodology,
              forecast, and recommendations — grounded entirely in your uploaded data.
            </p>
          </div>
          {report && !loading && <Stamp tone="current" size="lg" animate>Ready</Stamp>}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_280px]">
          {/* PDF preview */}
          <div>
            {loading || !report ? (
              <div className="grid h-[560px] place-items-center border border-ink/10 bg-white/60">
                <div className="text-center">
                  <FileDown size={22} className="mx-auto mb-3 animate-pulse text-signal" />
                  <p className="font-mono text-xs text-slate">Compiling report…</p>
                </div>
              </div>
            ) : (
              <div className="max-h-[720px] space-y-6 overflow-y-auto border border-ink/10 bg-white/60 p-4">
                {report.pages.map((page, i) => (
                  <div
                    key={i}
                    className="mx-auto aspect-[8.5/11] w-full max-w-[520px] bg-white p-8 shadow-sm ring-1 ring-ink/5"
                  >
                    <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                      <span className="eyebrow">InsightIQ · Executive Report</span>
                      <span className="font-mono text-[10px] text-slate">{String(i + 1).padStart(2, '0')} / {String(report.pages.length).padStart(2, '0')}</span>
                    </div>
                    <h2 className="mt-5 font-display text-xl">{page.title}</h2>
                    <p className="mt-3 text-[13px] leading-relaxed text-ink/80">{page.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="border border-ink/10 bg-white/60 p-5">
              <p className="eyebrow">Report details</p>
              <dl className="mt-3 space-y-2 font-mono text-xs text-slate">
                <div className="flex justify-between"><dt>Pages</dt><dd className="text-ink">{report?.pages?.length ?? '—'}</dd></div>
                <div className="flex justify-between"><dt>Format</dt><dd className="text-ink">PDF</dd></div>
                <div className="flex justify-between"><dt>Forecast metric</dt><dd className="text-ink">{report?.metric ?? '—'}</dd></div>
                <div className="flex justify-between"><dt>Horizon</dt><dd className="text-ink">{report?.horizon ? `${report.horizon} periods` : '—'}</dd></div>
                <div className="flex justify-between">
                  <dt>Generated</dt>
                  <dd className="text-ink">{report ? new Date(report.generatedAt).toLocaleTimeString() : '—'}</dd>
                </div>
              </dl>
            </div>

            {metrics.length > 0 && (
              <div className="border border-ink/10 bg-white/60 p-5">
                <p className="eyebrow">Focus metric</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {metrics.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      disabled={loading}
                      className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                        metric === m ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-slate hover:border-ink/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="eyebrow mt-4">Forecast horizon</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {HORIZONS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      disabled={loading}
                      className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                        horizon === h ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-slate hover:border-ink/50'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="signal"
              icon={Download}
              className="w-full"
              disabled={loading || !report?.pdfUrl}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              className="w-full"
              disabled={loading}
              onClick={() => generate(metric, horizon)}
            >
              {loading ? 'Regenerating…' : 'Regenerate report'}
            </Button>
            <p className="text-[11px] leading-relaxed text-slate">
              Regenerate re-runs the analysis using the focus metric and horizon selected above,
              producing an updated report grounded in the same underlying dataset.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
