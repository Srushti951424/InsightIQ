// The signature element of InsightIQ: a rubber-stamp badge that marks the
// status of a dataset, forecast, or report — a nod to the "analyst's ledger"
// concept that runs through the whole app.
export default function Stamp({ children, tone = 'current', size = 'md', animate = false }) {
  const tones = {
    current: 'border-current text-current',
    signal: 'border-signaldeep text-signaldeep',
    alert: 'border-alert text-alert',
    slate: 'border-slate text-slate',
  }
  const sizes = {
    sm: 'h-8 w-8 text-[8px] px-1',
    md: 'h-11 w-11 text-[9px] px-1.5',
    lg: 'h-16 w-16 text-[10px] px-2',
  }
  return (
    <span
      className={`stamp ${tones[tone]} ${sizes[size]} ${animate ? 'animate-stampin' : ''} text-center leading-[1.1]`}
    >
      {children}
    </span>
  )
}
