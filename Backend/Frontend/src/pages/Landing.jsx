import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanLine } from 'lucide-react'
import Navbar from '../components/Navbar'
import FileDropzone from '../components/FileDropzone'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { uploadDatasets, fetchDashboard } from '../lib/api'
import { useAnalysis } from '../lib/AnalysisContext'

const STEPS = [
  { n: '01', title: 'Upload', body: 'Bring in CSV, Excel, or Word datasets — one file or a whole folder\'s worth at once.' },
  { n: '02', title: 'Analyze', body: 'InsightIQ profiles, cleans, and reads your data, surfacing what actually matters.' },
  { n: '03', title: 'Decide', body: 'Get a dashboard, a forecast, and a report built to support the next decision.' },
]

export default function Landing() {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | working | done
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const { setDataset, setDashboard } = useAnalysis()

  const handleAnalyze = async () => {
    if (!files.length) return
    setStatus('working')
    setProgress(0)
    const summary = await uploadDatasets(files, setProgress)
    setDataset(summary)
    const dash = await fetchDashboard(summary.datasetId)
    setDashboard(dash)
    setStatus('done')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Navbar dark />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid gap-14 md:grid-cols-2 md:gap-10">
          <div>
            <div className="eyebrow text-signal">AI Business Intelligence &amp; Decision Support</div>
            <h1 className="mt-4 font-display text-[42px] leading-[1.08] tracking-tight md:text-[54px]">
              Your data has a story.
              <br />
              <span className="italic text-slatelight">InsightIQ reads it for you.</span>
            </h1>
            <p className="mt-6 max-w-md font-body text-[17px] leading-relaxed text-slatelight">
              Upload a business dataset and get more than a chart — get what changed, why it changed,
              what happens next, and a report you can hand to your team. No SQL, no formulas, no
              data-analyst on standby.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-paper/10 pt-6">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <p className="font-mono text-xs text-signal">{s.n}</p>
                  <p className="mt-1 font-display text-base">{s.title}</p>
                  <p className="mt-1 text-xs leading-snug text-slatelight">{s.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Intake tray</p>
              {status === 'working' && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-signal">
                  <ScanLine size={13} className="animate-pulse" /> analyzing
                </span>
              )}
            </div>

            <FileDropzone files={files} onFilesChange={setFiles} />

            {status === 'working' && (
              <div className="mt-5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-paper/10">
                  <div
                    className="h-full bg-signal transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-slatelight">
                  {progress < 40 ? 'Reading files…' : progress < 80 ? 'Profiling columns & cleaning data…' : 'Building your dashboard…'}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {files.length > 0 && status === 'idle' && (
                  <Stamp tone="signal" size="sm">Ready</Stamp>
                )}
                <span className="font-mono text-xs text-slatelight">
                  {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} queued` : 'No files yet'}
                </span>
              </div>
              <Button
                variant="signal"
                icon={ArrowRight}
                disabled={!files.length || status === 'working'}
                onClick={handleAnalyze}
              >
                {status === 'working' ? 'Analyzing…' : 'Analyze my data'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
