import { cn } from '../lib/format'

export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Outer hexagon - the workspace boundary */}
      <path
        d="M12 1.9 21.1 7v10L12 22.1 2.9 17V7L12 1.9Z"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.42"
      />
      {/* Operator core */}
      <path d="M12 6.6 17 9.7v4.6L12 17.4 7 14.3V9.7L12 6.6Z" fill="currentColor" />
      {/* Execution node */}
      <circle cx="12" cy="12" r="1.7" className="fill-white" />
    </svg>
  )
}

export function Wordmark({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const scale = {
    sm: 'text-[12px] leading-[1.15]',
    md: 'text-[13.5px] leading-[1.12]',
    lg: 'text-[17px] leading-[1.1]',
  }[size]

  return (
    <span className={cn('font-semibold tracking-[0.16em] text-ink uppercase', scale, className)}>
      AI Business
      <br />
      Operator
    </span>
  )
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={compact ? 20 : 24} className="text-accent" />
      {!compact ? <Wordmark size="sm" /> : null}
    </span>
  )
}
