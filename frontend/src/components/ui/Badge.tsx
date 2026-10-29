import type { ReactNode } from 'react'
import { cn } from '../../lib/format'

type Tone = 'neutral' | 'accent' | 'indigo' | 'positive' | 'caution' | 'critical' | 'outline'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-ink-2 border-line-strong',
  accent: 'bg-accent-soft text-accent-ink border-accent-line',
  indigo: 'bg-indigo-soft text-indigo-ink border-indigo-line',
  positive: 'bg-positive-soft text-positive border-positive/25',
  caution: 'bg-caution-soft text-caution border-caution/25',
  critical: 'bg-critical-soft text-critical border-critical/25',
  outline: 'bg-transparent text-ink-3 border-line-strong',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11.5px] font-medium leading-none',
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function StatusDot({
  tone = 'neutral',
  pulse,
  className,
}: {
  tone?: 'neutral' | 'accent' | 'indigo' | 'positive' | 'critical' | 'caution'
  pulse?: boolean
  className?: string
}) {
  const colors: Record<string, string> = {
    neutral: 'bg-ink-4',
    accent: 'bg-accent',
    indigo: 'bg-indigo',
    positive: 'bg-positive',
    critical: 'bg-critical',
    caution: 'bg-caution',
  }
  return (
    <span
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        colors[tone],
        pulse && 'animate-pulse-ring',
        className,
      )}
    />
  )
}
