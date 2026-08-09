import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function KpiCard({ label, value, delta, trend, index = 0 }) {
  const up = trend === 'up'
  return (
    <div
      className="animate-countup border border-ink/10 bg-white/60 p-5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-[28px] leading-none text-ink">{value}</p>
      <div className={`mt-2 inline-flex items-center gap-1 font-mono text-xs ${up ? 'text-current' : 'text-alert'}`}>
        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {delta}
      </div>
    </div>
  )
}
