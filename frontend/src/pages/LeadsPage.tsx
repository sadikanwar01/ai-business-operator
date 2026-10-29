import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Filter, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Field'
import { ScoreBar } from '../components/ui/ProgressBar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn, relativeTime, tierTone } from '../lib/format'
import type { LeadRow, Mission } from '../lib/types'

const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'indigo' | 'positive' | 'critical'> = {
  review: 'indigo',
  contacted: 'positive',
  rejected: 'critical',
  qualified: 'accent',
}

export function LeadsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')

  const query = useMemo(() => {
    const next = new URLSearchParams()
    const search = params.get('q')
    const tier = params.get('tier')
    const status = params.get('status')
    const mission = params.get('mission')
    const minScore = params.get('min_score')
    const industry = params.get('industry')
    const location = params.get('location')
    if (search) next.set('search', search)
    if (tier) next.set('tier', tier)
    if (status) next.set('status', status)
    if (mission) next.set('mission', mission)
    if (minScore) next.set('min_score', minScore)
    if (industry) next.set('industry', industry)
    if (location) next.set('location', location)
    return next.toString()
  }, [params])

  const { data, loading, error, reload } = useApi<{ leads: LeadRow[]; total: number }>(
    `/api/leads${query ? `?${query}` : ''}`,
  )
  const { data: missionData } = useApi<{ missions: Mission[] }>('/api/missions')

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const applySearch = () => update('q', search.trim())

  const leads = data?.leads ?? []
  const activeFilters = ['q', 'tier', 'status', 'mission', 'min_score', 'industry', 'location'].filter(
    (key) => params.get(key),
  )

  return (
    <PageShell>
      <PageHeader
        eyebrow="Lead intelligence"
        title="Leads"
        subtitle={
          loading ? 'Loading qualified opportunities…' : `${data?.total ?? 0} qualified opportunities`
        }
      />

      {/* Filters */}
      <div className="surface mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch()
              }}
              onBlur={applySearch}
              placeholder="Search companies, locations, specialities…"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
            <Select
              value={params.get('min_score') ?? ''}
              onChange={(event) => update('min_score', event.target.value)}
              className="lg:w-[128px]"
              aria-label="Filter by score"
            >
              <option value="">Any score</option>
              <option value="90">Score 90+</option>
              <option value="80">Score 80+</option>
              <option value="70">Score 70+</option>
              <option value="63">Score 63+</option>
            </Select>

            <Select
              value={params.get('tier') ?? ''}
              onChange={(event) => update('tier', event.target.value)}
              className="lg:w-[136px]"
              aria-label="Filter by opportunity"
            >
              <option value="">Any opportunity</option>
              <option value="Very High">Very High</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>

            <Select
              value={params.get('status') ?? ''}
              onChange={(event) => update('status', event.target.value)}
              className="lg:w-[130px]"
              aria-label="Filter by status"
            >
              <option value="">Any status</option>
              <option value="review">Review</option>
              <option value="contacted">Contacted</option>
              <option value="rejected">Rejected</option>
            </Select>

            <Select
              value={params.get('mission') ?? ''}
              onChange={(event) => update('mission', event.target.value)}
              className="lg:w-[210px]"
              aria-label="Filter by mission"
            >
              <option value="">All missions</option>
              {(missionData?.missions ?? []).map((mission) => (
                <option key={mission.id} value={mission.title}>
                  {mission.title}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <Filter size={12} className="text-ink-4" />
            <span className="text-[11.5px] text-ink-4">{activeFilters.length} filters applied</span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setParams(new URLSearchParams(), { replace: true })
              }}
              className="ml-auto text-[11.5px] text-ink-3 underline-offset-2 transition-colors hover:text-accent hover:underline"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows rows={8} />
          </div>
        ) : error ? (
          <ErrorState
            title="Leads could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="No qualified opportunities match these filters. Widen the score range or clear the filters to see more."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setParams(new URLSearchParams(), { replace: true })
                }}
                className="text-[12.5px] text-accent hover:underline"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.11em] text-ink-4">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-3 py-3 font-medium">Opportunity score</th>
                    <th className="px-3 py-3 font-medium">Opportunity</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Last activity</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="group transition-colors hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="text-[13.5px] font-medium text-ink transition-colors hover:text-accent"
                        >
                          {lead.company}
                        </Link>
                        <p className="mt-0.5 text-[11.5px] text-ink-4">
                          {lead.specialty} · {lead.location}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="tabular w-7 text-[13px] font-medium text-ink">
                            {lead.score}
                          </span>
                          <ScoreBar score={lead.score} className="w-14" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={tierTone(lead.tier)}>{lead.tier}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={STATUS_TONES[lead.status] ?? 'neutral'}>
                          {lead.status === 'review'
                            ? 'Ready'
                            : lead.status === 'contacted'
                              ? 'Contacted'
                              : lead.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-ink-4">
                        {relativeTime(lead.last_activity ?? lead.updated_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 text-[12px] text-ink-4 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
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

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link to={`/leads/${lead.id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">{lead.company}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-4">
                          {lead.specialty} · {lead.location}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-[15px] font-semibold text-ink">
                        {lead.score}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge tone={tierTone(lead.tier)}>{lead.tier}</Badge>
                      <Badge tone={STATUS_TONES[lead.status] ?? 'neutral'}>
                        {lead.status === 'review' ? 'Ready' : lead.status}
                      </Badge>
                      <span className={cn('ml-auto text-[11px] text-ink-4')}>
                        {relativeTime(lead.last_activity ?? lead.updated_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PageShell>
  )
}
