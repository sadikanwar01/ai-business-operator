import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Check,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ScoreBar } from '../components/ui/ProgressBar'
import { Card, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn, tierTone } from '../lib/format'
import type { LeadRow, OutreachMessage, ResearchRecord, ScoreDimension, Signal } from '../lib/types'

interface LeadPayload {
  lead: LeadRow & { id: string; score: number; tier: string; opportunity: string; status: string; notes: string | null }
  company: {
    name: string
    industry: string
    location: string
    city: string
    website: string
    specialty: string
    founded: string
    employees: number
    source: string
  }
  mission: { id: string; title: string; goal: string } | null
  why: string[]
  signals: Signal[]
  scores: ScoreDimension[]
  research: ResearchRecord[]
  outreach: OutreachMessage[]
}

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error, reload } = useApi<LeadPayload>(id ? `/api/leads/${id}` : null)

  if (loading) {
    return (
      <PageShell>
        <SkeletonRows rows={7} />
      </PageShell>
    )
  }

  if (error || !data) {
    return (
      <PageShell>
        <ErrorState
          title={error?.code === 'not_found' ? 'Lead not found' : 'This lead could not be loaded'}
          description={error?.message}
          hint="It may have been removed, or the link may be out of date."
          onRetry={() => reload()}
        />
      </PageShell>
    )
  }

  const { lead, company, why, signals, scores, research, outreach, mission } = data
  const confidence = Math.round((outreach[0]?.confidence ?? 0.82) * 100)
  const recommendation =
    lead.score >= 85
      ? 'High-priority outreach'
      : lead.score >= 70
        ? 'Standard outreach'
        : 'Low priority - monitor'

  return (
    <PageShell>
      <PageHeader
        back={{ to: '/leads', label: 'All leads' }}
        eyebrow={company.industry ?? 'Lead'}
        title={company.name}
        subtitle={
          mission
            ? `Selected by the Operator for “${mission.title}”.`
            : 'Selected by the Operator.'
        }
        actions={
          <Link to="/outreach">
            <Button variant="primary" icon={<MessageSquare size={14} />}>
              Generate Outreach
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* Score + reasons */}
          <Card className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="sm:w-[180px] sm:border-r sm:border-line sm:pr-5">
                <p className="label-eyebrow">Opportunity score</p>
                <p className="tabular mt-2 text-[40px] font-semibold leading-none tracking-[-0.035em] text-ink">
                  {lead.score}
                  <span className="text-[16px] text-ink-4">/100</span>
                </p>
                <ScoreBar score={lead.score} className="mt-3" />
                <div className="mt-3">
                  <Badge tone={tierTone(lead.tier)}>Opportunity: {lead.tier}</Badge>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="label-eyebrow">Why this lead?</p>
                <ul className="mt-3 space-y-2">
                  {why.map((reason) => (
                    <li key={reason} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-full border border-positive/30 bg-positive-soft text-positive">
                        <Check size={9} strokeWidth={3.2} />
                      </span>
                      <span className="text-[13px] leading-snug text-ink-2">{reason}</span>
                    </li>
                  ))}
                  {why.length === 0 ? (
                    <li className="text-[12.5px] text-ink-4">
                      No supporting reasons were recorded for this lead.
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </Card>

          {/* Detected signals */}
          <Card>
            <div className="border-b border-line px-5 py-3.5">
              <p className="label-eyebrow">Detected signals</p>
            </div>
            <dl className="divide-y divide-line">
              {signals.map((signal) => {
                const bad = ['low', 'no', 'not detected'].includes(signal.value.toLowerCase())
                const good = ['high', 'yes', 'available', 'active'].includes(signal.value.toLowerCase())
                return (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between gap-4 px-5 py-2.5"
                  >
                    <dt className="text-[12px] text-ink-4">{signal.label}</dt>
                    <dd
                      className={cn(
                        'text-[13px] font-medium',
                        bad ? 'text-caution' : good ? 'text-positive' : 'text-ink',
                      )}
                    >
                      {signal.value}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </Card>

          {/* Score breakdown */}
          <Card>
            <div className="border-b border-line px-5 py-3.5">
              <p className="label-eyebrow">Score breakdown</p>
            </div>
            <div className="divide-y divide-line">
              {scores.map((dimension) => (
                <div key={dimension.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[13px] text-ink-2">{dimension.dimension}</span>
                    <span className="tabular text-[12.5px] text-ink-3">
                      {dimension.score}
                      <span className="ml-2 text-ink-4">
                        × {Math.round(dimension.weight * 100)}%
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-4">{dimension.rationale}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Research evidence */}
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <p className="label-eyebrow">Research record</p>
              <span className="mono text-[10.5px] text-ink-4">{research.length} fields</span>
            </div>
            <div className="divide-y divide-line">
              {research.map((record) => (
                <div key={record.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-5">
                  <span className="w-[140px] shrink-0 text-[12px] text-ink-4">{record.field}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-ink-2">{record.value}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-4">
                      <span>{record.source}</span>
                      {record.source_url ? (
                        <a
                          href={record.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-0.5 text-ink-3 underline-offset-2 hover:text-accent hover:underline"
                        >
                          source <ExternalLink size={9} />
                        </a>
                      ) : null}
                      <span>· confidence {Math.round(record.confidence * 100)}%</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="label-eyebrow">AI recommendation</p>
            <p className="mt-2.5 flex items-center gap-2 text-[14px] font-medium text-ink">
              <Sparkles size={14} className="text-accent" />
              {recommendation}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              {lead.notes ??
                'The detected gap between this business’s digital presence and its demand profile makes it a strong fit.'}
            </p>

            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-end justify-between">
                <span className="label-eyebrow">AI confidence</span>
                <span className="tabular text-[20px] font-semibold tracking-[-0.02em] text-ink">
                  {confidence}%
                </span>
              </div>
              <ScoreBar score={confidence} className="mt-2" />
            </div>
          </Card>

          <Card>
            <div className="border-b border-line px-5 py-3.5">
              <p className="label-eyebrow">Business overview</p>
            </div>
            <dl className="divide-y divide-line text-[12.5px]">
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="flex items-center gap-1.5 text-ink-4">
                  <Building2 size={11} /> Industry
                </dt>
                <dd className="text-ink-2">{company.industry}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="flex items-center gap-1.5 text-ink-4">
                  <MapPin size={11} /> Location
                </dt>
                <dd className="text-ink-2">{company.location}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="flex items-center gap-1.5 text-ink-4">
                  <Globe size={11} /> Website
                </dt>
                <dd className="text-ink-2">{company.website}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="text-ink-4">Speciality</dt>
                <dd className="text-ink-2">{company.specialty}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="text-ink-4">Founded</dt>
                <dd className="text-ink-2">{company.founded}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="text-ink-4">Team size</dt>
                <dd className="text-ink-2">{company.employees}</dd>
              </div>
            </dl>
          </Card>

          {outreach.length > 0 ? (
            <Card>
              <div className="border-b border-line px-5 py-3.5">
                <p className="label-eyebrow">Outreach</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[12.5px] font-medium text-ink-2">{outreach[0].subject}</p>
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-relaxed text-ink-4">
                  {outreach[0].body}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={outreach[0].status === 'approved' ? 'positive' : 'indigo'}>
                    {outreach[0].status}
                  </Badge>
                  <span className="mono text-[10.5px] text-ink-4">
                    confidence {Math.round(outreach[0].confidence * 100)}%
                  </span>
                </div>
                <Link to="/outreach">
                  <Button variant="secondary" size="sm" className="mt-4 w-full" icon={<ArrowRight size={13} />}>
                    Open in outreach
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="label-eyebrow">Outreach</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-4">
                No message has been drafted for this lead yet. Generate one from the outreach
                workspace.
              </p>
              <Link to="/outreach">
                <Button variant="secondary" size="sm" className="mt-4" icon={<ArrowRight size={13} />}>
                  Generate Outreach
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  )
}
