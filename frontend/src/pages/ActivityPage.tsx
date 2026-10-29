import { useMemo, useState } from 'react'
import { Activity as ActivityIcon } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge, StatusDot } from '../components/ui/Badge'
import { Select } from '../components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn, formatTime } from '../lib/format'
import type { ActivityEntry, Mission } from '../lib/types'

export function ActivityPage() {
  const [mission, setMission] = useState('')
  const { data, loading, error, reload } = useApi<{
    groups: { date: string; entries: ActivityEntry[] }[]
    entries: ActivityEntry[]
  }>(`/api/activity${mission ? `?mission=${encodeURIComponent(mission)}` : ''}`)
  const { data: missionData } = useApi<{ missions: Mission[] }>('/api/missions')

  const groups = data?.groups ?? []
  const total = data?.entries.length ?? 0

  const agentSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of data?.entries ?? []) {
      counts.set(entry.agent, (counts.get(entry.agent) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [data])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operations log"
        title="Activity"
        subtitle="The operations log. Every agent action, with the mission it belonged to."
        actions={
          <Select
            value={mission}
            onChange={(event) => setMission(event.target.value)}
            className="w-[240px]"
            aria-label="Filter by mission"
          >
            <option value="">All missions</option>
            {(missionData?.missions ?? []).map((item) => (
              <option key={item.id} value={item.title}>
                {item.title}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? (
        <SkeletonRows rows={8} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Activity could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : total === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<ActivityIcon size={16} />}
            title="No activity recorded"
            description="Agent actions appear here as soon as a mission starts working."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.date} className="surface overflow-hidden">
                <div className="border-b border-line px-5 py-3">
                  <p className="label-eyebrow">{group.date}</p>
                </div>
                <ol className="divide-y divide-line">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3.5 px-5 py-3">
                      <span className="mono mt-0.5 w-10 shrink-0 text-[11px] text-ink-4">
                        {formatTime(entry.created_at)}
                      </span>
                      <StatusDot
                        className="mt-1.5"
                        tone={
                          entry.status === 'error'
                            ? 'critical'
                            : entry.status === 'warn'
                              ? 'caution'
                              : entry.status === 'complete'
                                ? 'positive'
                                : 'neutral'
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] leading-snug text-ink-2">{entry.message}</p>
                        <p className="mt-0.5 text-[11px] text-ink-4">
                          {entry.agent}
                          {entry.mission_title ? ` · ${entry.mission_title}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <div className="surface h-fit p-5">
            <p className="label-eyebrow">Agent workload</p>
            <ul className="mt-4 space-y-3">
              {agentSummary.map(([agent, count]) => {
                const max = agentSummary[0]?.[1] ?? 1
                return (
                  <li key={agent}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] text-ink-2">{agent}</span>
                      <span className="tabular text-[12px] text-ink-4">{count}</span>
                    </div>
                    <div
                      className={cn('mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3')}
                    >
                      <div
                        className="h-full rounded-full bg-indigo/70"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <Badge tone="outline">{total} recorded actions</Badge>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
