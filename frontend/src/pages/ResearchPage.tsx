import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Database, ExternalLink, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge, StatusDot } from '../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn } from '../lib/format'
import type { Mission, ResearchRecord } from '../lib/types'

interface ResearchJob {
  mission: Mission
  companies_researched: number
  fields_collected: number
  qualified: number
  stages: { key: string; label: string; status: string }[]
}

const STAGE_LABELS: Record<string, string> = {
  discovery: 'Company Discovery',
  information: 'Business Information',
  website: 'Website Analysis',
  opportunity: 'Opportunity Detection',
  qualification: 'Lead Qualification',
}

export function ResearchPage() {
  const { data, loading, error, reload } = useApi<{ jobs: ResearchJob[] }>('/api/research')
  const [selected, setSelected] = useState<string | null>(null)

  const jobs = data?.jobs ?? []
  const activeJob = jobs.find((job) => job.mission.id === selected) ?? jobs[0]

  const { data: detail } = useApi<{ evidence: ResearchRecord[] }>(
    activeJob ? `/api/research/${activeJob.mission.id}` : null,
  )

  const grouped = (detail?.evidence ?? []).reduce<Record<string, ResearchRecord[]>>((acc, record) => {
    const key = record.company ?? 'Unknown'
    ;(acc[key] ??= []).push(record)
    return acc
  }, {})

  return (
    <PageShell>
      <PageHeader
        eyebrow="Evidence"
        title="Research"
        subtitle="Every fact below was collected from a named source. The Operator does not guess."
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Research could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : jobs.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Search size={16} />}
            title="No research jobs yet"
            description="Launch a mission and the Researcher will collect and cite business information."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.45fr]">
          <div className="space-y-3">
            {jobs.map((job) => {
              const isActive = activeJob?.mission.id === job.mission.id
              return (
                <button
                  key={job.mission.id}
                  type="button"
                  onClick={() => setSelected(job.mission.id)}
                  className={cn(
                    'surface block w-full p-4 text-left transition-colors',
                    isActive ? 'border-accent-line bg-surface-2' : 'hover:border-line-strong',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {job.mission.title}
                      </p>
                      <p className="mt-1 text-[11.5px] text-ink-4">
                        {job.companies_researched} companies researched
                      </p>
                    </div>
                    <Badge
                      tone={
                        job.mission.status === 'running'
                          ? 'accent'
                          : job.mission.status === 'completed'
                            ? 'positive'
                            : 'neutral'
                      }
                      dot
                    >
                      {job.mission.status}
                    </Badge>
                  </div>

                  <ul className="mt-3.5 space-y-1.5">
                    {job.stages.map((stage) => (
                      <li key={stage.key} className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-[14px] shrink-0 items-center justify-center rounded-full border',
                            stage.status === 'complete'
                              ? 'border-positive/30 bg-positive-soft text-positive'
                              : 'border-line-strong text-ink-4',
                          )}
                        >
                          {stage.status === 'complete' ? (
                            <Check size={8} strokeWidth={3.4} />
                          ) : (
                            <StatusDot className="size-1" />
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-[12px]',
                            stage.status === 'complete' ? 'text-ink-2' : 'text-ink-4',
                          )}
                        >
                          {STAGE_LABELS[stage.key] ?? stage.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-ink-4">
                    {job.fields_collected} evidence fields · {job.qualified} qualified
                  </p>
                </button>
              )
            })}
          </div>

          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div>
                <p className="label-eyebrow">Evidence</p>
                <p className="mt-1 text-[12px] text-ink-4">
                  {activeJob ? activeJob.mission.title : 'No mission selected'}
                </p>
              </div>
              <Badge tone="outline">
                <Database size={10} className="mr-1" />
                {detail?.evidence.length ?? 0} records
              </Badge>
            </div>

            {!detail || detail.evidence.length === 0 ? (
              <EmptyState
                title="No evidence collected yet"
                description="Records appear here as the Researcher gathers them."
              />
            ) : (
              <div className="max-h-[620px] overflow-y-auto">
                {Object.entries(grouped).map(([company, records]) => (
                  <div key={company} className="border-b border-line last:border-b-0">
                    <div className="flex items-center justify-between bg-surface-2/60 px-5 py-2">
                      <p className="text-[12.5px] font-medium text-ink-2">{company}</p>
                      <Link
                        to="/leads"
                        className="text-[11px] text-ink-4 underline-offset-2 transition-colors hover:text-accent hover:underline"
                      >
                        View lead
                      </Link>
                    </div>
                    <dl className="divide-y divide-line">
                      {records.map((record) => (
                        <div
                          key={record.id}
                          className="flex flex-col gap-1 px-5 py-2.5 sm:flex-row sm:items-start sm:gap-4"
                        >
                          <dt className="w-[130px] shrink-0 text-[11.5px] text-ink-4">{record.field}</dt>
                          <dd className="min-w-0 flex-1 text-[12.5px] text-ink-2">
                            {record.value}
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-4">
                              <span>{record.source}</span>
                              {record.source_url ? (
                                <a
                                  href={record.source_url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center gap-0.5 text-ink-3 hover:text-accent"
                                >
                                  open <ExternalLink size={9} />
                                </a>
                              ) : null}
                              <span>· {Math.round(record.confidence * 100)}% confidence</span>
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
