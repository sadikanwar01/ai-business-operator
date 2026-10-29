import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Check } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn, tierTone } from '../lib/format'
import type { FollowUp } from '../lib/types'

function Section({
  title,
  count,
  items,
  tone,
  busy,
  onComplete,
}: {
  title: string
  count: number
  items: FollowUp[]
  tone?: 'critical'
  busy: string | null
  onComplete: (item: FollowUp) => void
}) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">{title}</p>
          <span className="tabular text-[11px] text-ink-4">{count}</span>
        </div>
        {tone === 'critical' && count > 0 ? (
          <Badge tone="critical">Overdue</Badge>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-ink-4">Nothing scheduled here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/leads/${item.lead_id}`}
                    className="text-[13.5px] font-medium text-ink transition-colors hover:text-accent"
                  >
                    {item.company}
                  </Link>
                  <Badge tone={tierTone(item.tier)}>{item.tier}</Badge>
                  <span className="mono text-[10.5px] text-ink-4">
                    follow-up #{item.sequence}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-4">
                  {item.city} · {item.label}
                  {item.subject ? ` · ${item.subject}` : ''}
                </p>
                {item.note ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">{item.note}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'text-[11.5px]',
                    tone === 'critical' ? 'text-critical' : 'text-ink-4',
                  )}
                >
                  {item.label}
                </span>
                {item.status !== 'completed' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check size={12} />}
                    loading={busy === item.id}
                    onClick={() => onComplete(item)}
                  >
                    Mark done
                  </Button>
                ) : (
                  <Badge tone="positive">Done</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function FollowUpsPage() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useApi<{
    overdue: FollowUp[]
    today: FollowUp[]
    upcoming: FollowUp[]
    completed: FollowUp[]
    total: number
  }>('/api/follow-ups')
  const [busy, setBusy] = useState<string | null>(null)

  const complete = async (item: FollowUp) => {
    setBusy(item.id)
    try {
      await api.patch(`/api/follow-ups/${item.id}`, { status: 'completed' })
      notify({ tone: 'success', title: 'Follow-up completed' })
      void reload(true)
    } catch {
      notify({ tone: 'error', title: 'Could not update the follow-up' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Pipeline"
        title="Follow-ups"
        subtitle={
          loading
            ? 'Loading the follow-up queue…'
            : `${data?.today.length ?? 0} due today · ${data?.upcoming.length ?? 0} upcoming`
        }
      />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Follow-ups could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.overdue.length ?? 0) > 0 ? (
            <Section
              title="Overdue"
              count={data!.overdue.length}
              items={data!.overdue}
              tone="critical"
              busy={busy}
              onComplete={complete}
            />
          ) : null}

          <Section
            title="Today"
            count={data?.today.length ?? 0}
            items={data?.today ?? []}
            busy={busy}
            onComplete={complete}
          />

          <Section
            title="Upcoming"
            count={data?.upcoming.length ?? 0}
            items={data?.upcoming ?? []}
            busy={busy}
            onComplete={complete}
          />

          {(data?.completed.length ?? 0) > 0 ? (
            <Section
              title="Completed"
              count={data!.completed.length}
              items={data!.completed}
              busy={busy}
              onComplete={complete}
            />
          ) : null}

          {(data?.total ?? 0) === 0 ? (
            <div className="surface">
              <EmptyState
                icon={<CalendarClock size={16} />}
                title="No follow-ups scheduled"
                description="Approve an outreach message and the Operator will schedule the next touch automatically."
              />
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
