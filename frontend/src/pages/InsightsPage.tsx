import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Lightbulb, Target, TrendingUp } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Card, SkeletonRows } from '../components/ui/StateBlocks'
import { ProgressBar } from '../components/ui/ProgressBar'
import { tierTone } from '../lib/format'
import type { AnalyticsPayload, LeadRow, Mission } from '../lib/types'

export function InsightsPage() {
  const { data: leadsData, loading } = useApi<{ leads: LeadRow[]; total: number }>(
    '/api/leads?limit=200',
  )
  const { data: analytics } = useApi<AnalyticsPayload>('/api/analytics')
  const { data: missionData } = useApi<{ missions: Mission[] }>('/api/missions')

  const allLeads = leadsData?.leads ?? []
  const leads = allLeads.slice(0, 8)
  const highIntent = allLeads.filter((lead) => lead.score >= 80).length
  const avgScore = analytics?.metrics.average_opportunity_score ?? 0
  const highIntentShare = analytics?.metrics.qualified
    ? (analytics.metrics.high_intent / analytics.metrics.qualified) * 100
    : 0
  const topCities = Object.entries(
    allLeads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.city] = (acc[lead.city] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const recommendations = [
    {
      icon: Target,
      title: 'Focus the next mission on the weakest signal',
      body: 'Booking capability is the most common gap across qualified opportunities. A focused booking-funnel mission would reach the same segment with a sharper offer.',
      to: '/missions/new',
      action: 'Create mission',
    },
    {
      icon: TrendingUp,
      title: 'High-intent segment is expanding',
      body: `${highIntent} of the ${allLeads.length} qualified opportunities scored 80 or above. Their response rate should be materially higher than the rest of the pipeline.`,
      to: '/leads?tier=High',
      action: 'Open segment',
    },
    {
      icon: Compass,
      title: 'Review the messages that were not approved',
      body: 'Every rejected message points at a positioning problem in the outreach, not a targeting problem. Adjust the knowledge base before the next run.',
      to: '/outreach',
      action: 'Review outreach',
    },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow="Intelligence"
        title="Insights"
        subtitle="What the Operator has learned about this market, and what it recommends next."
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Lightbulb size={13} className="text-accent" />
                <p className="label-eyebrow">Operator recommendations</p>
              </div>
              <ul className="mt-4 divide-y divide-line">
                {recommendations.map((item) => (
                  <li key={item.title} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-line-strong bg-surface-2 text-ink-2">
                        <item.icon size={13} strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-ink">{item.title}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{item.body}</p>
                        <Link
                          to={item.to}
                          className="mt-2 inline-flex items-center gap-1 text-[12px] text-accent transition-opacity hover:opacity-80"
                        >
                          {item.action}
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <p className="label-eyebrow">Market profile</p>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-[12.5px] text-ink-3">Average opportunity score</dt>
                    <dd className="tabular text-[18px] font-semibold text-ink">{avgScore}</dd>
                  </div>
                  <ProgressBar value={avgScore} />
                  <div className="flex items-baseline justify-between pt-1">
                    <dt className="text-[12.5px] text-ink-3">High-intent share</dt>
                    <dd className="tabular text-[18px] font-semibold text-ink">
                      {Math.round(highIntentShare)}%
                    </dd>
                  </div>
                  <ProgressBar value={highIntentShare} tone="indigo" />
                  <p className="text-[11.5px] text-ink-4">
                    {analytics?.metrics.high_intent ?? 0} of {analytics?.metrics.qualified ?? 0}{' '}
                    qualified opportunities
                  </p>
                </dl>
              </Card>

              <Card className="p-5">
                <p className="label-eyebrow">Concentration by city</p>
                <ul className="mt-3.5 space-y-2.5">
                  {topCities.map(([city, count]) => (
                    <li key={city} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-[12.5px] text-ink-3">{city}</span>
                      <ProgressBar
                        value={(count / Math.max(...topCities.map(([, value]) => value), 1)) * 100}
                        className="flex-1"
                        tone="indigo"
                      />
                      <span className="tabular w-4 text-right text-[12px] text-ink-4">{count}</span>
                    </li>
                  ))}
                  {topCities.length === 0 ? (
                    <li className="text-[12px] text-ink-4">No concentration data yet.</li>
                  ) : null}
                </ul>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <p className="label-eyebrow">Highest ranked opportunities</p>
              <Link to="/leads" className="text-[12px] text-ink-3 transition-colors hover:text-ink">
                All leads
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.11em] text-ink-4">
                    <th className="px-5 py-2.5 font-medium">Company</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Opportunity</th>
                    <th className="px-5 py-2.5 font-medium">Mission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="text-[13px] font-medium text-ink transition-colors hover:text-accent"
                        >
                          {lead.company}
                        </Link>
                      </td>
                      <td className="tabular px-3 py-2.5 text-[13px] text-ink-2">{lead.score}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={tierTone(lead.tier)}>{lead.tier}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-[12px] text-ink-4">{lead.mission_title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <p className="label-eyebrow">Mission outcomes</p>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
              {(missionData?.missions ?? []).map((mission) => (
                <li key={mission.id}>
                  <Link
                    to={`/missions/${mission.id}`}
                    className="flex items-center justify-between gap-3 rounded-[9px] border border-line bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-line-strong"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-ink-2">
                        {mission.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-4">
                        {mission.counts.qualified} qualified · {mission.counts.outreach_ready} outreach
                      </span>
                    </span>
                    <Badge
                      tone={
                        mission.status === 'running'
                          ? 'accent'
                          : mission.status === 'completed'
                            ? 'positive'
                            : 'neutral'
                      }
                    >
                      {mission.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
