import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { TrendingUp, AlertTriangle, GitBranch, Sparkles, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import KpiCard from '../components/KpiCard'
import Button from '../components/Button'
import Stamp from '../components/Stamp'
import { useAnalysis } from '../lib/AnalysisContext'

const PIE_COLORS = ['#101C29', '#E3A23C', '#3E8E82', '#C1543C', '#8A93A0']

const INSIGHT_ICON = { trend: TrendingUp, anomaly: AlertTriangle, correlation: GitBranch }

export default function Dashboard() {
  const { dataset, dashboard } = useAnalysis()
  const navigate = useNavigate()

  useEffect(() => {
    if (!dashboard) navigate('/')
  }, [dashboard, navigate])

  if (!dashboard) return null

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Analysis dashboard</p>
            <h1 className="mt-1 font-display text-3xl tracking-tight">
              {dataset?.files?.length ? dataset.files.map((f) => f.name).join(' + ') : 'Your dataset'}
            </h1>
            <p className="mt-1 font-mono text-xs text-slate">
              {dataset?.rows?.toLocaleString()} rows · {dataset?.columns} columns · quality score {dataset?.qualityScore}/100
            </p>
          </div>
          <Stamp tone="current" size="lg" animate>Analyzed</Stamp>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {dashboard.kpis.map((k, i) => (
            <KpiCard key={k.label} {...k} index={i} />
          ))}
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="ledger-rule bg-white/60 p-5 pt-6 md:col-span-2">
            <p className="eyebrow">Revenue trend</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#101C29" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 12, border: '1px solid #101C2922', borderRadius: 2 }}
                    formatter={(v) => [`₹${v}L`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#E3A23C" strokeWidth={2.5} dot={{ r: 3, fill: '#101C29' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ledger-rule bg-white/60 p-5 pt-6">
            <p className="eyebrow">Revenue by category</p>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {dashboard.byCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 12, borderRadius: 2 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-1 space-y-1">
              {dashboard.byCategory.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between font-mono text-xs text-slate">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {c.name}
                  </span>
                  <span>{c.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="ledger-rule bg-white/60 p-5 pt-6">
            <p className="eyebrow">Revenue by region</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.byRegion}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="region" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#5B6472' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 12, borderRadius: 2 }} formatter={(v) => [`₹${v}L`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#101C29" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insight feed — ledger entries */}
          <div className="ledger-rule bg-white/60 p-5 pt-6 md:col-span-2">
            <p className="eyebrow flex items-center gap-1.5"><Sparkles size={12} /> Insight feed</p>
            <ul className="mt-4 space-y-3">
              {dashboard.insights.map((ins, i) => {
                const Icon = INSIGHT_ICON[ins.type] || Sparkles
                const toneClass = ins.tone === 'alert' ? 'border-alert text-alert' : 'border-current text-current'
                return (
                  <li key={i} className={`border-l-2 pl-3 ${toneClass.split(' ')[0]}`}>
                    <div className="flex items-start gap-2">
                      <Icon size={14} className={`mt-0.5 shrink-0 ${toneClass.split(' ')[1]}`} />
                      <p className="text-sm leading-relaxed text-ink/90">{ins.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Action row */}
        <div className="ledger-rule mt-8 flex flex-col items-stretch gap-3 pt-8 sm:flex-row sm:justify-end">
          <Button variant="ghost" icon={ArrowRight} onClick={() => navigate('/predictive')}>
            Predictive analysis
          </Button>
          <Button variant="signal" icon={ArrowRight} onClick={() => navigate('/report')}>
            Generate report
          </Button>
        </div>
      </section>
    </div>
  )
}
