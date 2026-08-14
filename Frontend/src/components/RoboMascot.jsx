import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

// Iggy — InsightIQ's little analyst mascot. Eyes track the cursor anywhere
// on the page, head tilts slightly toward it, blinks on a random loop,
// waves when you hover, and drops a one-line quip when you click.
const QUIPS = [
  'Crunching numbers, one row at a time.',
  'I love a clean CSV.',
  'Ready when your data is.',
  'No spreadsheet too messy.',
  'Give me your dirtiest dataset.',
]

export default function RoboMascot({ className = '' }) {
  const wrapRef = useRef(null)
  const [pupil, setPupil] = useState({ x: 0, y: 0 })
  const [tilt, setTilt] = useState(0)
  const [blink, setBlink] = useState(false)
  const [quip, setQuip] = useState(null)
  const armControls = useAnimationControls()
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion.current) return

    const EYE_RADIUS = 5

    const handleMove = (e) => {
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height * 0.34
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy) || 1
      const pull = Math.min(1, dist / 380)
      setPupil({ x: (dx / dist) * EYE_RADIUS * pull, y: (dy / dist) * EYE_RADIUS * pull })
      setTilt(Math.max(-7, Math.min(7, dx / 70)))
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    if (reduceMotion.current) return
    let timeout
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 130)
        scheduleBlink()
      }, 2200 + Math.random() * 2800)
    }
    scheduleBlink()
    return () => clearTimeout(timeout)
  }, [])

  const wave = () => {
    armControls.start({
      rotate: [0, -22, 8, -16, 0],
      transition: { duration: 0.7, ease: 'easeInOut' },
    })
  }

  const handleClick = () => {
    wave()
    setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)])
    window.clearTimeout(handleClick._t)
    handleClick._t = window.setTimeout(() => setQuip(null), 2200)
  }

  return (
    <motion.div
      ref={wrapRef}
      onMouseEnter={wave}
      onClick={handleClick}
      animate={reduceMotion.current ? {} : { y: [0, -9, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className={`pointer-events-auto select-none ${className}`}
      style={{ cursor: 'pointer' }}
      aria-label="Iggy, the InsightIQ mascot"
      role="img"
    >
      <div className="relative">
        {quip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-16 left-0 w-max max-w-[220px] translate-x-4 rounded-md border border-signal/50 bg-ink px-4 py-2.5 text-center font-mono text-sm text-paper shadow-xl"
          >
            {quip}
          </motion.div>
        )}

        <motion.svg
          viewBox="0 0 120 130"
          width="100%"
          height="100%"
          animate={{ rotate: tilt }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          {/* antenna */}
          <line x1="60" y1="10" x2="60" y2="22" stroke="#E3A23C" strokeWidth="2.5" strokeLinecap="round" />
          <motion.circle
            cx="60" cy="7" r="4.5" fill="#E3A23C"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* head */}
          <rect x="20" y="22" width="80" height="58" rx="18" fill="#F6F2E9" stroke="#101C29" strokeWidth="2.5" />

          {/* eye sockets */}
          <circle cx="45" cy="50" r="12" fill="#101C29" />
          <circle cx="75" cy="50" r="12" fill="#101C29" />
          {/* pupils (collapse to a line on blink) */}
          <motion.circle cx={45 + pupil.x} cy={50 + pupil.y} r={blink ? 0.4 : 5.5} fill="#F6F2E9" />
          <motion.circle cx={75 + pupil.x} cy={50 + pupil.y} r={blink ? 0.4 : 5.5} fill="#F6F2E9" />

          {/* body */}
          <rect x="30" y="80" width="60" height="40" rx="10" fill="#F6F2E9" stroke="#101C29" strokeWidth="2.5" />
          {/* mini bar-chart chest plate */}
          <rect x="42" y="100" width="6" height="10" fill="#3E8E82" />
          <rect x="52" y="94" width="6" height="16" fill="#E3A23C" />
          <rect x="62" y="98" width="6" height="12" fill="#3E8E82" />
          <rect x="72" y="90" width="6" height="20" fill="#E3A23C" />

          {/* arms */}
          <motion.g animate={armControls} style={{ originX: '30px', originY: '92px' }}>
            <line x1="30" y1="92" x2="14" y2="80" stroke="#101C29" strokeWidth="4" strokeLinecap="round" />
          </motion.g>
          <line x1="90" y1="92" x2="106" y2="100" stroke="#101C29" strokeWidth="4" strokeLinecap="round" />
        </motion.svg>
      </div>
    </motion.div>
  )
}
