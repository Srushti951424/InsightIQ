import { useEffect, useRef } from 'react'

// The signature ambient element: a field of thin ledger rules being
// continuously "read" by traveling scan pulses, with amber ticks lighting up
// where a pulse crosses a line — a literal picture of "InsightIQ reads your
// data for you." Pure canvas, no external deps, respects reduced motion.
export default function LedgerScan({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ROW_GAP = 34
    let rows = []
    let pulses = []
    let raf
    let w = 0
    let h = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      rows = []
      for (let y = 20; y < h; y += ROW_GAP) rows.push(y)
      pulses = rows.map((y, i) => ({
        y,
        x: -200 - i * 90,
        speed: 1.1 + (i % 3) * 0.35,
        len: 140 + (i % 4) * 40,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // base hairlines
      rows.forEach((y) => {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.strokeStyle = 'rgba(246, 242, 233, 0.055)'
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // traveling pulses + amber tick where the pulse head sits
      pulses.forEach((p) => {
        const grad = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y)
        grad.addColorStop(0, 'rgba(227, 162, 60, 0)')
        grad.addColorStop(1, 'rgba(227, 162, 60, 0.55)')
        ctx.beginPath()
        ctx.moveTo(p.x - p.len, p.y)
        ctx.lineTo(p.x, p.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.4
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(227, 162, 60, 0.9)'
        ctx.fill()

        if (!reduceMotion) p.x += p.speed
        if (p.x - p.len > w + 40) p.x = -200
      })

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    if (reduceMotion) {
      // draw a single static frame and stop
      cancelAnimationFrame(raf)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  )
}
