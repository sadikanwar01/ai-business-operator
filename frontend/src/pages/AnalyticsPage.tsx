import { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Field'
import { ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn } from '../lib/format'
import type { AnalyticsPayload } from '../lib/types'

export function AnalyticsPage() {
  const [mission, setMission] = useState('')
  const { data, loading, error, reload } = useApi<AnalyticsPayload>(
    `/api/analytics${mission ? `?mission=${encodeURIComponent(mission)}` : ''}`,
  )

  const metrics = data?.metrics
  const funnel = data?.funnel ?? []
  const maxValue = Math.max(...funnel.map((item) => item.value), 1)

  const statCards = [
    { label: 'Leads researched', value: metrics?.leads_researched ?? 0 },
    { label: 'Qualified', value: metrics?.qualified ?? 0 },
    { label: 'High intent', value: metrics?.high_intent ?? 0 },
    { label: 'Outreach generated', value: metrics?.outreach_generated ?? 0 },
    { label: 'Approved', value: metrics?.approved ?? 0 },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        subtitle="Mission performance, measured on what the Operator actually produced."
        actions={
          <Select
            value={mission}
            onChange={(event) => setMission(event.target.value)}
            className="w-[240px]"
            aria-label="Select mission"
          >
            <option value="">Top performing mission</option>
            {(data?.missions ?? []).map((item) => (
              <option key={item.id} value={item.title}>
                {item.title}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Analytics could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="surface grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-5 sm:divide-y-0">
            {statCards.map((stat) => (
              <div key={stat.label} className="px-5 py-4">
                <p className="text-[11.5px] text-ink-3">{stat.label}</p>
                <p className="tabular mt-1.5 text-[22px] font-semibold tracking-[-0.025em] text-ink">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            {/* Funnel */}
            <section className="surface p-5">
              <p className="label-eyebrow">Conversion funnel</p>
              <div className="mt-5 space-y-1">
                {funnel.map((stage, index) => (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-ink-2">{stage.label}</span>
                      <span className="tabular text-[13px] font-medium text-ink">{stage.value}</span>
                    </div>
                    <div className="mt-1.5 h-6 w-full overflow-hidden rounded-[6px] bg-surface-2">
                      <div
                        className={cn(
                          'h-full rounded-[6px] transition-[width] duration-700',
                          index === 0 ? 'bg-indigo/70' : index === 1 ? 'bg-indigo' : 'bg-accent',
                        )}
                        style={{ width: `${Math.max(3, (stage.value / maxValue) * 100)}%` }}
                      />
                    </div>
                    {index < funnel.length - 1 ? (
                      <div className="flex justify-center py-1 text-ink-4">
                        <ArrowDown size={12} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {/* Highlights */}
            <section className="surface p-5">
              <p className="label-eyebrow">Highlights</p>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-[12px] text-ink-4">Top performing mission</dt>
                  <dd className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="text-[13.5px] font-medium text-ink">
                      {data?.top_mission?.title ?? '—'}
                    </span>
                    {data?.top_mission ? (
                      <Badge tone="accent">{data.top_mission.qualified} qualified</Badge>
                    ) : null}
                  </dd>
                </div>
                <div className="border-t border-line pt-4">
                  <dt className="text-[12px] text-ink-4">Conversion rate</dt>
                  <dd className="tabular mt-1.5 text-[22px] font-semibold tracking-[-0.025em] text-ink">
                    {metrics?.conversion_rate ?? 0}%
                    <span className="ml-2 text-[12px] font-normal text-ink-4">
                      researched to qualified
                    </span>
                  </dd>
                </div>
                <div className="border-t border-line pt-4">
                  <dt className="text-[12px] text-ink-4">Average opportunity score</dt>
                  <dd className="tabular mt-1.5 text-[22px] font-semibold tracking-[-0.025em] text-ink">
                    {metrics?.average_opportunity_score ?? 0}
                    <span className="ml-2 text-[12px] font-normal text-ink-4">out of 100</span>
                  </dd>
                </div>
                <div className="border-t border-line pt-4">
                  <dt className="text-[12px] text-ink-4">Approval rate</dt>
                  <dd className="tabular mt-1.5 text-[22px] font-semibold tracking-[-0.025em] text-ink">
                    {metrics?.approval_rate ?? 0}%
                    <span className="ml-2 text-[12px] font-normal text-ink-4">
                      of drafted messages
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </PageShell>
  )
}
