import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart } from 'lucide-react'

export default function Navbar({ dark = false }) {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-40 border-b ${
        dark ? 'bg-ink/95 border-white/10 backdrop-blur' : 'bg-paper/95 border-ink/10 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2">
          <span
            className={`grid h-8 w-8 place-items-center rounded-sm border transition-transform duration-300 group-hover:rotate-[8deg] ${
              dark ? 'border-signal/60 text-signal' : 'border-ink/70 text-ink'
            }`}
          >
            <LineChart size={16} strokeWidth={2.25} />
          </span>
          <span className={`font-display text-lg tracking-tight ${dark ? 'text-paper' : 'text-ink'}`}>
            InsightIQ
          </span>
        </Link>
        {!isLanding && (
          <span className={`eyebrow ${dark ? 'text-slatelight' : 'text-slate'}`}>
            AI Business Intelligence
          </span>
        )}
      </div>
    </motion.header>
  )
}
