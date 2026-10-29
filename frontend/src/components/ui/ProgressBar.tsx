import { cn } from '../../lib/format'

export function ProgressBar({
  value,
  className,
  tone = 'accent',
  size = 'md',
  indeterminate,
}: {
  value: number
  className?: string
  tone?: 'accent' | 'indigo' | 'positive'
  size?: 'xs' | 'sm' | 'md'
  indeterminate?: boolean
}) {
  const heights = { xs: 'h-[3px]', sm: 'h-1', md: 'h-1.5' }[size]
  const fills = {
    accent: 'bg-accent',
    indigo: 'bg-indigo',
    positive: 'bg-positive/80',
  }[tone]

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', heights, className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div className="animate-sweep h-full w-1/3 rounded-full bg-accent/70" />
      ) : (
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      )}
    </div>
  )
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const tone = score >= 85 ? 'bg-accent' : score >= 75 ? 'bg-indigo' : 'bg-caution'
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tone)}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}
