import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, FileDown } from 'lucide-react'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { generateReport } from '../lib/api'
import { useAnalysis } from '../lib/AnalysisContext'

export default function ReportGeneration() {
  const { dataset, dashboard, report, setReport } = useAnalysis()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!dashboard) { navigate('/'); return }
    if (!report) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  const generate = async () => {
    setLoading(true)
    const result = await generateReport(dataset?.datasetId)
    setReport(result)
    setLoading(false)
  }

  const handleDownload = () => {
    // TODO once backend is live: window.location.href = report.pdfUrl
    // For now this is a stand-in — the real endpoint should return a signed
    // file URL or stream the PDF (see lib/api.js -> generateReport()).
    window.print()
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
              A ready-to-share PDF covering the executive summary, key metrics, forecast, and
              recommendations grounded in your data.
            </p>
          </div>
          {report && !loading && <Stamp tone="current" size="lg" animate>Ready</Stamp>}
        </div>

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
                <div className="flex justify-between">
                  <dt>Generated</dt>
                  <dd className="text-ink">{report ? new Date(report.generatedAt).toLocaleTimeString() : '—'}</dd>
                </div>
              </dl>
            </div>

            <Button
              variant="signal"
              icon={Download}
              className="w-full"
              disabled={loading || !report}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              className="w-full"
              disabled={loading}
              onClick={generate}
            >
              {loading ? 'Regenerating…' : 'Regenerate report'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
