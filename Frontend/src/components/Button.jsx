export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-ink text-paper hover:bg-inkdeep',
    signal: 'bg-signal text-ink hover:bg-signaldeep',
    ghost: 'bg-transparent text-ink border border-ink/20 hover:border-ink/50',
    ghostLight: 'bg-transparent text-paper border border-paper/30 hover:border-paper/60',
  }
  const sizes = {
    sm: 'text-sm px-3.5 py-2 rounded-sm',
    md: 'text-[15px] px-5 py-3 rounded-sm',
    lg: 'text-base px-7 py-4 rounded-sm',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon size={17} strokeWidth={2.25} />}
      {children}
    </button>
  )
}