import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/format'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  back,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  className?: string
}) {
  return (
    <header className={cn('mb-6', className)}>
      {back ? (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-ink-3 transition-colors hover:text-ink"
        >
          <ChevronLeft size={13} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="label-eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>
      {children}
    </div>
  )
}
