import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/format'

export interface MissionResultRow {
  id: string
  score: number
  tier: string
  opportunity: string
  company: string
  city: string
  website: string
}

export function MissionResult({
  researched,
  qualified,
  highIntent,
  outreachReady,
  targetCount,
  rows,
}: {
  researched: number
  qualified: number
  highIntent: number
  outreachReady: number
  targetCount: number
  rows: MissionResultRow[]
}) {
  const stats = [
    { label: 'Companies researched', value: researched },
    { label: 'Qualified', value: qualified },
    { label: 'High intent', value: highIntent },
    { label: 'Outreach ready', value: outreachReady },
  ]

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-positive/25 bg-positive-soft text-positive">
            <CheckCircle2 size={16} strokeWidth={2} />
          </span>
          <div>
            <p className="label-eyebrow text-positive">Mission complete</p>
            <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-ink">
              {qualified} qualified {qualified === 1 ? 'opportunity' : 'opportunities'} from{' '}
              {researched} researched {researched === 1 ? 'company' : 'companies'}.
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {qualified >= targetCount
                ? `Target of ${targetCount} ${targetCount === 1 ? 'opportunity' : 'opportunities'} met. `
                : `Target was ${targetCount} ${targetCount === 1 ? 'opportunity' : 'opportunities'}. `}
              Every result below is traceable to a collected source. Review and approve the outreach
              before anything is sent.
            </p>
          </div>
        </div>
        <Link to="/leads" className="shrink-0">
          <Button variant="primary" icon={<ArrowRight size={14} />}>
            View Qualified Leads
          </Button>
        </Link>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.label} className="px-5 py-4">
            <dt className="text-[11.5px] text-ink-3">{stat.label}</dt>
            <dd className="tabular mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line">
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-[12px] font-medium text-ink-2">Top opportunities</p>
          <p className="mono text-[10.5px] text-ink-4">ranked by opportunity score</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-y border-line text-[10.5px] uppercase tracking-[0.11em] text-ink-4">
                <th className="px-5 py-2.5 font-medium">Company</th>
                <th className="px-3 py-2.5 font-medium">Score</th>
                <th className="px-3 py-2.5 font-medium">Opportunity</th>
                <th className="px-5 py-2.5 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-2/50">
                  <td className="px-5 py-2.5">
                    <Link
                      to={`/leads/${row.id}`}
                      className="text-[13px] font-medium text-ink transition-colors hover:text-accent"
                    >
                      {row.company}
                    </Link>
                  </td>
                  <td className="tabular px-3 py-2.5 text-[13px] text-ink-2">{row.score}/100</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'text-[12.5px]',
                        row.tier === 'Very High'
                          ? 'text-accent'
                          : row.tier === 'High'
                            ? 'text-indigo-ink'
                            : 'text-ink-2',
                      )}
                    >
                      {row.tier}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-[12.5px] text-ink-3">{row.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
