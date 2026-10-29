import { Link } from 'react-router-dom'
import { ArrowRight, CircleDot, Clock, Radio, Target } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { MissionCreator } from '../components/mission/MissionCreator'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge, StatusDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SkeletonRows } from '../components/ui/StateBlocks'
import { formatTime, relativeTime } from '../lib/format'
import type { DashboardPayload, Mission } from '../lib/types'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function MissionRow({ mission }: { mission: Mission }) {
  const running = mission.status === 'running'
  const failed = mission.status === 'failed'

  return (
    <article className="surface p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
              {mission.title}
            </h3>
            <Badge tone={running ? 'accent' : failed ? 'critical' : 'neutral'} dot>
              {running ? 'Running' : failed ? 'Failed' : mission.status === 'completed' ? 'Completed' : mission.status}
            </Badge>
            {mission.mode === 'demo' ? (
              <span className="mono text-[10.5px] uppercase tracking-wider text-ink-4">demo</span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">{mission.goal}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2.5">
              <ProgressBar value={mission.progress} className="w-28" />
              <span className="mono text-[11.5px] text-ink-2">{mission.progress}%</span>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <CircleDot size={11} className={running ? 'text-accent' : 'text-ink-4'} />
              {mission.current_step ?? 'Queued'}
            </span>
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[11.5px] text-ink-4">
            <span className="flex items-center gap-1.5">
              <Target size={11} /> {mission.counts.researched} researched
            </span>
            <span className="flex items-center gap-1.5">
              <Radio size={11} /> {mission.counts.qualified} qualified
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> {relativeTime(mission.created_at)}
            </span>
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/missions/${mission.id}`}>
            <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />}>
              View Mission
            </Button>
          </Link>
        </div>
      </div>
    </article>
  )
}

function SnapshotStat({
  label,
  value,
  hint,
  to,
}: {
  label: string
  value: number
  hint?: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5"
    >
      <p className="text-[11.5px] leading-tight text-ink-3">{label}</p>
      <span className="tabular text-[19px] font-semibold leading-none tracking-[-0.02em] text-ink transition-colors group-hover:text-accent">
        {value}
      </span>
      {hint ? <p className="text-[10.5px] leading-tight text-ink-4">{hint}</p> : null}
    </Link>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi<DashboardPayload>('/api/dashboard')

  const activeMissions = data?.active_missions ?? []
  const recentMissions = data?.recent_missions ?? []

  return (
    <PageShell>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="What would you like to accomplish?"
      />

      <MissionCreator />

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Active Missions
          </h2>
          <Link
            to="/missions"
            className="flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
          >
            All missions
            <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <SkeletonRows rows={2} />
        ) : error ? (
          <div className="surface px-5 py-8 text-center">
            <p className="text-[13px] text-ink-2">The mission list could not be loaded.</p>
            <p className="mt-1 text-[12px] text-ink-4">{error.message}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => reload()}>
              Retry
            </Button>
          </div>
        ) : activeMissions.length === 0 ? (
          <div className="surface px-5 py-10 text-center">
            <p className="text-[13px] text-ink-2">No missions running right now.</p>
            <p className="mt-1 text-[12px] text-ink-4">
              Describe an outcome above to start the first one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMissions.map((mission) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </section>

      {recentMissions.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Recently Completed
            </h2>
            <Link
              to="/missions"
              className="flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
            >
              All missions
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMissions.map((mission) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Business Snapshot
          </h2>
          <div className="surface grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
            {loading ? (
              <div className="col-span-full px-5 py-6">
                <SkeletonRows rows={1} />
              </div>
            ) : (
              <>
                <SnapshotStat
                  label="Qualified Leads"
                  value={data?.snapshot.qualified_leads ?? 0}
                  to="/leads"
                />
                <SnapshotStat
                  label="High Intent"
                  value={data?.snapshot.high_intent ?? 0}
                  to="/leads?tier=High"
                />
                <SnapshotStat
                  label="Outreach Ready"
                  value={data?.snapshot.outreach_ready ?? 0}
                  hint={`${data?.snapshot.awaiting_review ?? 0} awaiting review`}
                  to="/outreach"
                />
                <SnapshotStat
                  label="Follow-ups Due"
                  value={data?.snapshot.follow_ups_due ?? 0}
                  to="/follow-ups"
                />
              </>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Operator Activity
          </h2>
          <div className="surface divide-y divide-line">
            {(data?.activity ?? []).slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
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
                    {entry.agent} · {formatTime(entry.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {loading ? (
              <div className="px-4 py-4">
                <SkeletonRows rows={3} />
              </div>
            ) : null}
            {!loading && (data?.activity ?? []).length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-ink-4">No activity recorded yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
