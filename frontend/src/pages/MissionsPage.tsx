import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { formatDate, relativeTime } from '../lib/format'
import type { Mission } from '../lib/types'

function statusTone(status: Mission['status']) {
  if (status === 'running') return 'accent' as const
  if (status === 'completed') return 'positive' as const
  if (status === 'failed') return 'critical' as const
  return 'neutral' as const
}

export function MissionsPage() {
  const { data, loading, error, reload } = useApi<{ missions: Mission[] }>('/api/missions')
  const missions = data?.missions ?? []

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operations"
        title="Missions"
        subtitle="Every goal the Operator has been given, and what it produced."
        actions={
          <Link to="/missions/new">
            <Button variant="primary" icon={<Plus size={14} />}>
              New Mission
            </Button>
          </Link>
        }
      />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Missions could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : missions.length === 0 ? (
        <div className="surface">
          <EmptyState
            title="No missions yet"
            description="Give the Operator an outcome and it will plan, research and act on its own."
            action={
              <Link to="/missions/new">
                <Button variant="primary" icon={<Plus size={14} />}>
                  Create a mission
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.11em] text-ink-4">
                  <th className="px-5 py-3 font-medium">Mission</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Progress</th>
                  <th className="px-3 py-3 font-medium">Results</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {missions.map((mission) => (
                  <tr key={mission.id} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/missions/${mission.id}`}
                        className="text-[13.5px] font-medium text-ink transition-colors hover:text-accent"
                      >
                        {mission.title}
                      </Link>
                      <p className="mt-1 max-w-[420px] truncate text-[11.5px] text-ink-4">
                        {mission.goal}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge tone={statusTone(mission.status)} dot>
                        {mission.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={mission.progress} className="w-16" size="xs" />
                        <span className="mono text-[11px] text-ink-3">{mission.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="tabular text-[12.5px] text-ink-2">
                        {mission.counts.qualified} qualified
                        <span className="text-ink-4">
                          {' '}
                          · {mission.counts.outreach_ready} outreach
                        </span>
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-[11.5px] text-ink-4">
                      <span title={formatDate(mission.created_at)}>{relativeTime(mission.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/missions/${mission.id}`}
                        className="inline-flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
                      >
                        Open
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  )
}
