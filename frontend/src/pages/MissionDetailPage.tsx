import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CircleDot, Loader2, MapPin, RotateCcw, Target, XCircle } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge, StatusDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Card, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { WorkflowTimeline } from '../components/mission/WorkflowTimeline'
import { AgentPanel } from '../components/mission/AgentPanel'
import { ActivityFeed } from '../components/mission/ActivityFeed'
import { MissionResult, type MissionResultRow } from '../components/mission/MissionResult'
import { cn, formatDateTime } from '../lib/format'
import type { ActivityEntry, AgentState, Mission, MissionStep } from '../lib/types'

interface MissionPayload {
  mission: Mission
  steps: MissionStep[]
  agents: AgentState[]
  top_opportunities: MissionResultRow[]
}

export function MissionDetailPage() {
  const { id = '' } = useParams()
  const { notify } = useToast()
  const { data, loading, error, reload } = useApi<MissionPayload>(id ? `/api/missions/${id}` : null)
  const { data: activity, reload: reloadActivity } = useApi<{ activity: ActivityEntry[] }>(
    id ? `/api/missions/${id}/activity` : null,
  )

  const mission = data?.mission
  const running = mission?.status === 'running'

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      void reload(true)
      void reloadActivity(true)
    }, 1200)
    return () => window.clearInterval(timer)
  }, [running, reload, reloadActivity])

  const topRows = useMemo(() => data?.top_opportunities ?? [], [data])

  if (loading) {
    return (
      <PageShell>
        <SkeletonRows rows={6} />
      </PageShell>
    )
  }

  if (error || !mission) {
    return (
      <PageShell>
        <ErrorState
          title={error?.code === 'not_found' ? 'Mission not found' : 'The mission could not be loaded'}
          description={error?.message}
          hint={error?.hint ?? 'The mission may have been removed from this workspace.'}
          onRetry={() => reload()}
        />
      </PageShell>
    )
  }

  const failed = mission.status === 'failed'

  return (
    <PageShell>
      <PageHeader
        back={{ to: '/missions', label: 'All missions' }}
        eyebrow={mission.industry ?? 'Mission'}
        title={mission.title}
        subtitle={mission.goal}
        actions={
          <>
            {running ? (
              <Badge tone="accent" dot>
                Running
              </Badge>
            ) : failed ? (
              <Badge tone="critical" dot>
                Failed
              </Badge>
            ) : mission.status === 'completed' ? (
              <Badge tone="positive" dot>
                Completed
              </Badge>
            ) : (
              <Badge tone="neutral" dot>
                {mission.status}
              </Badge>
            )}
            {mission.mode === 'demo' ? (
              <span
                className="mono rounded-md border border-line-strong bg-surface-2 px-2 py-[3px] text-[10.5px] uppercase tracking-wider text-ink-4"
                title="This mission ran on the deterministic demo provider. No external model calls were made."
              >
                demo provider
              </span>
            ) : (
              <span className="mono rounded-md border border-positive/25 bg-positive-soft px-2 py-[3px] text-[10.5px] uppercase tracking-wider text-positive">
                live · {mission.model}
              </span>
            )}
            <Link to="/leads">
              <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />}>
                View Leads
              </Button>
            </Link>
          </>
        }
      />

      {/* Progress */}
      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-[9px] border',
                running
                  ? 'border-accent-line bg-accent-soft text-accent'
                  : failed
                    ? 'border-critical/25 bg-critical-soft text-critical'
                    : 'border-line-strong bg-surface-2 text-ink-3',
              )}
            >
              {running ? (
                <Loader2 size={15} className="animate-spin" />
              ) : failed ? (
                <XCircle size={15} />
              ) : (
                <Target size={15} />
              )}
            </span>
            <div>
              <p className="text-[12px] text-ink-3">
                {running ? 'In progress' : failed ? 'Stopped' : 'Final progress'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                {running ? (
                  <>
                    <StatusDot tone="accent" pulse />
                    {mission.current_step}…
                  </>
                ) : (
                  mission.current_step ?? 'Mission complete'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {failed ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={13} />}
                onClick={async () => {
                  try {
                    await api.post(`/api/missions/${mission.id}/resume`)
                    notify({ tone: 'info', title: 'Mission resumed' })
                    void reload(true)
                  } catch (err) {
                    notify({
                      tone: 'error',
                      title: 'Could not resume',
                      detail: err instanceof ApiError ? err.message : undefined,
                    })
                  }
                }}
              >
                Retry step
              </Button>
            ) : null}
            <div className="text-right">
              <p className="tabular text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {mission.progress}
                <span className="text-[15px] text-ink-3">%</span>
              </p>
              <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-ink-4">Progress</p>
            </div>
          </div>
        </div>

        <ProgressBar
          value={mission.progress}
          size="sm"
          tone={failed ? 'indigo' : running ? 'accent' : 'positive'}
        />

        <div className="mt-6">
          <WorkflowTimeline steps={data?.steps ?? []} />
        </div>
      </Card>

      {failed ? (
        <Card className="mt-4 border-critical/25">
          <ErrorState
            title="The Operator could not complete this step."
            description={mission.error ?? 'An unexpected error interrupted the workflow.'}
            hint="Retry the step to continue from where the workflow stopped. Nothing has been sent."
            onRetry={async () => {
              try {
                await api.post(`/api/missions/${mission.id}/resume`)
                notify({ tone: 'info', title: 'Mission resumed' })
                void reload(true)
              } catch (err) {
                notify({
                  tone: 'error',
                  title: 'Could not resume',
                  detail: err instanceof ApiError ? err.message : undefined,
                })
              }
            }}
          />
        </Card>
      ) : null}

      {/* Body */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {mission.status === 'completed' ? (
            <MissionResult
              researched={mission.counts.researched}
              qualified={mission.counts.qualified}
              highIntent={mission.counts.high_intent}
              outreachReady={mission.counts.outreach_ready}
              targetCount={mission.target_count}
              rows={topRows}
            />
          ) : null}

          <ActivityFeed entries={activity?.activity ?? []} live={running} />
        </div>

        <div className="space-y-4">
          <AgentPanel agents={data?.agents ?? []} />

          <div className="surface">
            <div className="border-b border-line px-4 py-3">
              <p className="label-eyebrow">Mission brief</p>
            </div>
            <dl className="divide-y divide-line text-[12.5px]">
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-4">Goal</dt>
                <dd className="max-w-[62%] text-right text-ink-2">{mission.goal}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-4">Industry</dt>
                <dd className="text-ink-2">{mission.industry ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="flex items-center gap-1.5 text-ink-4">
                  <MapPin size={11} /> Location
                </dt>
                <dd className="text-ink-2">{mission.location ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-4">Target opportunities</dt>
                <dd className="tabular text-ink-2">{mission.target_count}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-4">Desired action</dt>
                <dd className="text-ink-2">{mission.desired_action ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-4">Started</dt>
                <dd className="text-ink-2">{formatDateTime(mission.started_at ?? mission.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="surface p-4">
            <div className="flex items-center gap-2">
              <CircleDot size={12} className="text-ink-4" />
              <p className="text-[12px] font-medium text-ink-2">Execution model</p>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
              {mission.mode === 'demo'
                ? 'Deterministic demo provider. The workflow, evidence trail and review steps behave exactly as they do in live mode, but no external model is called.'
                : `Live inference through the ${mission.provider} provider using ${mission.model}.`}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
