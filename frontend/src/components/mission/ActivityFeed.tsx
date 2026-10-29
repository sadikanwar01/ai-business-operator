import { useEffect, useRef } from 'react'
import { cn } from '../../lib/format'
import { formatTime } from '../../lib/format'
import type { ActivityEntry } from '../../lib/types'

function dotTone(status: ActivityEntry['status']) {
  switch (status) {
    case 'complete':
      return 'bg-positive'
    case 'warn':
      return 'bg-caution'
    case 'error':
      return 'bg-critical'
    default:
      return 'bg-ink-4'
  }
}

export function ActivityFeed({
  entries,
  live,
  className,
}: {
  entries: ActivityEntry[]
  live?: boolean
  className?: string
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries.length, live])

  return (
    <div className={cn('surface flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="label-eyebrow">Operator Activity</p>
        {live ? (
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-accent">
            <span className="size-1.5 animate-pulse-ring rounded-full bg-accent" />
            Live
          </span>
        ) : null}
      </div>

      <div className="max-h-[460px] min-h-[420px] overflow-y-auto px-4 py-2">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center">
            <div className="text-center">
              <p className="text-[12.5px] text-ink-3">Waiting for the first agent to report…</p>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11.5px] text-ink-4">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                Planner is thinking…
              </div>
            </div>
          </div>
        ) : (
          <ol className="space-y-0">
            {entries.map((entry, index) => (
              <li key={entry.id} className="animate-fade flex gap-3 py-2">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dotTone(entry.status))} />
                  {index < entries.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[12.5px] leading-snug text-ink-2">{entry.message}</p>
                  <p className="mono mt-0.5 text-[10.5px] text-ink-4">
                    {formatTime(entry.created_at)} · {entry.agent}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
