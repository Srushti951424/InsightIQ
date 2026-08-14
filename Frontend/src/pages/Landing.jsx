import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ScanLine, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import FileDropzone from '../components/FileDropzone'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import LedgerScan from '../components/LedgerScan'
import RoboMascot from '../components/RoboMascot'
import { uploadDatasets, fetchDashboard } from '../lib/api'
import { useAnalysis } from '../lib/AnalysisContext'

// One orchestrated page-load sequence: eyebrow, then headline (word by word),
// then body copy, then the step ledger — each beat waiting for the last.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
}
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}
const headlineWrap = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
}
const word = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const STEPS = [
  { n: '01', title: 'Upload', body: 'Bring in CSV, Excel, or Word datasets — one file or a whole folder\'s worth at once.' },
  { n: '02', title: 'Analyze', body: 'InsightIQ profiles, cleans, and reads your data, surfacing what actually matters.' },
  { n: '03', title: 'Decide', body: 'Get a dashboard, a forecast, and a report built to support the next decision.' },
]

export default function Landing() {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | working | done
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setDataset, setDashboard } = useAnalysis()

  const handleAnalyze = async () => {
    if (!files.length) return
    setStatus('working')
    setError('')
    setProgress(5)

    // Large files (100k+ rows) can take a while to ingest and clean server-side.
    // Since the real upload only reports 0% -> 100% (no granular progress from
    // the server), animate a slow crawl up to 90% so the bar never looks frozen,
    // then jump to 100% once the response actually arrives.
    const crawl = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 1 : p))
    }, 400)

    try {
      const summary = await uploadDatasets(files, () => {})
      if (!summary?.datasetId) {
        throw new Error('The server did not return a dataset ID. Check the backend terminal for errors.')
      }
      setDataset(summary)
      setProgress(95)
      const dash = await fetchDashboard(summary.datasetId)
      setDashboard(dash)
      setProgress(100)
      setStatus('done')
      navigate('/dashboard')
    } catch (err) {
      clearInterval(crawl)
      setStatus('idle')
      setProgress(0)
      setError(
        err.message?.includes('Failed to fetch')
          ? 'Could not reach the backend. Make sure "python manage.py runserver" is running on port 8000.'
          : (err.message || 'Something went wrong while analyzing your file.')
      )
    } finally {
      clearInterval(crawl)
    }
  }

  const headline1 = 'Your data has a story.'.split(' ')

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      <LedgerScan className="opacity-70" />
      {/* ambient amber glow, anchored top-right, purely atmospheric */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-signal/10 blur-[120px]"
      />

      <div className="relative">
        <Navbar dark />

        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-14 md:grid-cols-2 md:gap-10"
          >
            <div>
              <motion.div variants={rise} className="eyebrow text-signal">
                AI Business Intelligence &amp; Decision Support
              </motion.div>

              <motion.h1
                variants={headlineWrap}
                className="mt-4 font-display text-[42px] leading-[1.08] tracking-tight md:text-[54px]"
              >
                {headline1.map((w, i) => (
                  <motion.span key={i} variants={word} className="inline-block">
                    {w}{i < headline1.length - 1 ? '\u00A0' : ''}
                  </motion.span>
                ))}
                <br />
                <motion.span variants={rise} className="italic text-slatelight">
                  InsightIQ reads it for you.
                </motion.span>
              </motion.h1>

              <motion.p
                variants={rise}
                className="mt-6 max-w-md font-body text-[17px] leading-relaxed text-slatelight"
              >
                Upload a business dataset and get more than a chart — get what changed, why it changed,
                what happens next, and a report you can hand to your team. No SQL, no formulas, no
                data-analyst on standby.
              </motion.p>

              <motion.div
                variants={rise}
                className="mt-10 grid grid-cols-3 gap-6 border-t border-paper/10 pt-6"
              >
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.n}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -3 }}
                    className="group"
                  >
                    <p className="font-mono text-xs text-signal transition-colors group-hover:text-paper">{s.n}</p>
                    <p className="mt-1 font-display text-base">{s.title}</p>
                    <p className="mt-1 text-xs leading-snug text-slatelight">{s.body}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Intake tray</p>
                {status === 'working' && (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-signal">
                    <ScanLine size={13} className="animate-pulse" /> analyzing
                  </span>
                )}
              </div>

              <FileDropzone files={files} onFilesChange={setFiles} />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {status === 'working' && (
                <div className="mt-5">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-paper/10">
                    <motion.div
                      className="h-full bg-signal"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slatelight">
                    {progress < 40 ? 'Reading & cleaning files…' : progress < 90 ? 'Profiling columns & building dashboard…' : 'Almost done…'}
                    {' '}Large files can take up to a minute.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {files.length > 0 && status === 'idle' && (
                    <Stamp tone="signal" size="sm" animate>Ready</Stamp>
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
            </motion.div>
          </motion.div>
        </section>
      </div>

      <RoboMascot className="fixed bottom-8 left-6 z-30 hidden w-40 sm:block md:w-48 lg:w-56" />
    </div>
  )
}

