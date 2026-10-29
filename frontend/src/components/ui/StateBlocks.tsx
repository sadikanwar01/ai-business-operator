import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { Button } from './Button'

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return <Tag className={cn('surface', className)}>{children}</Tag>
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[6px] bg-surface-3', className)}>
      <div className="animate-sweep absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  )
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex size-10 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-ink-3">
          {icon}
        </div>
      ) : null}
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  hint,
  onRetry,
  action,
}: {
  title?: string
  description?: string
  hint?: string
  onRetry?: () => void
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-[10px] border border-critical/25 bg-critical-soft text-critical">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">{description}</p>
      ) : null}
      {hint ? (
        <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-ink-4">{hint}</p>
      ) : null}
      <div className="mt-5 flex items-center gap-2">
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  )
}
