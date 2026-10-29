import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Mail, Pencil, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Field'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn } from '../lib/format'
import type { OutreachMessage } from '../lib/types'

type FlagPayload = {
  items?: string[]
  verdict?: string
  grounding_score?: number
  tone_score?: number
  spam_score?: number
  suggestion?: string
}

function flagsOf(message: OutreachMessage): FlagPayload {
  if (Array.isArray(message.flags)) return { items: message.flags }
  return (message.flags ?? {}) as FlagPayload
}

const TABS = [
  { key: '', label: 'All' },
  { key: 'ready', label: 'Ready for review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export function OutreachPage() {
  const { notify } = useToast()
  const [tab, setTab] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(6)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const { data, loading, error, reload } = useApi<{
    messages: OutreachMessage[]
    ready_count: number
  }>('/api/outreach')

  const messages = useMemo(() => {
    const all = data?.messages ?? []
    if (!tab) return all
    return all.filter((message) => message.status === tab)
  }, [data, tab])

  const visible = messages.slice(0, limit)
  const remaining = messages.length - visible.length

  const act = async (message: OutreachMessage, action: 'approve' | 'reject' | 'regenerate') => {
    setBusy(message.id)
    try {
      await api.post(`/api/outreach/${message.id}/${action}`, action === 'regenerate' ? { reason: 'Manual refresh' } : undefined)
      notify({
        tone: action === 'reject' ? 'info' : 'success',
        title:
          action === 'approve'
            ? 'Message approved'
            : action === 'reject'
              ? 'Message rejected'
              : 'Message regenerated',
        detail:
          action === 'approve'
            ? 'It is queued for sending and a follow-up has been scheduled.'
            : undefined,
      })
      void reload(true)
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Action failed',
        detail: err instanceof ApiError ? err.message : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  const saveEdit = async (message: OutreachMessage) => {
    setBusy(message.id)
    try {
      await api.patch(`/api/outreach/${message.id}`, { body: draft })
      notify({ tone: 'success', title: 'Message updated' })
      setEditing(null)
      void reload(true)
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not save',
        detail: err instanceof ApiError ? err.message : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Review queue"
        title="Outreach"
        subtitle={
          loading
            ? 'Loading drafted messages…'
            : `${data?.messages.length ?? 0} messages · ${data?.ready_count ?? 0} awaiting your review`
        }
        actions={
          <Badge tone="indigo" dot>
            Approval required
          </Badge>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TABS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={cn(
              'rounded-[7px] px-2.5 py-1.5 text-[12.5px] transition-colors',
              tab === option.key
                ? 'bg-surface-3 font-medium text-ink'
                : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
            )}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-ink-4">
          Nothing is sent until you approve it.
        </span>
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Outreach could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : messages.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Mail size={16} />}
            title="No messages here"
            description="Run a mission to generate personalised outreach, or switch to another filter."
            action={
              <Link to="/missions">
                <Button variant="secondary" size="sm">
                  Go to missions
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((message) => {
            const flags = flagsOf(message)
            const isEditing = editing === message.id
            return (
              <article key={message.id} className="surface overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-[13.5px] font-semibold text-ink">{message.company}</span>
                    <span className="text-[12px] text-ink-4">{message.city}</span>
                    <Badge
                      tone={
                        message.status === 'approved'
                          ? 'positive'
                          : message.status === 'rejected'
                            ? 'critical'
                            : 'indigo'
                      }
                    >
                      {message.status === 'ready'
                        ? 'Ready for review'
                        : message.status === 'approved'
                          ? 'Approved'
                          : 'Rejected'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="mono text-[11px] text-ink-4">
                      score {message.score} · {message.tier}
                    </span>
                    <div className="w-[104px] shrink-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[9.5px] uppercase tracking-[0.12em] text-ink-4">
                          Confidence
                        </span>
                        <span className="tabular text-[11.5px] text-ink-2">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                      <ProgressBar value={message.confidence * 100} size="xs" className="mt-1.5" />
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <p className="text-[13px] font-medium text-ink-2">{message.subject}</p>
                  {isEditing ? (
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={12}
                      className="mt-3 text-[12.5px] leading-relaxed"
                    />
                  ) : (
                    <>
                      <p
                        className={cn(
                          'mt-2.5 whitespace-pre-line text-[12.5px] leading-[1.75] text-ink-2',
                          expanded !== message.id && 'line-clamp-[4]',
                        )}
                      >
                        {message.body}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === message.id ? null : message.id)}
                        className="mt-1.5 text-[11.5px] text-ink-3 underline-offset-2 transition-colors hover:text-accent hover:underline"
                      >
                        {expanded === message.id ? 'Show less' : 'Show full message'}
                      </button>
                    </>
                  )}

                  {flags.items && flags.items.length > 0 ? (
                    <div className="mt-3 rounded-[9px] border border-caution/25 bg-caution-soft px-3.5 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-caution">
                        Flags raised by the reviewer
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {flags.items.map((flag) => (
                          <li key={flag} className="text-[11.5px] leading-relaxed text-caution/90">
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {message.review_notes.length > 0 ? (
                    <div className="mt-3 rounded-[9px] border border-line bg-surface-2">
                      <button
                        type="button"
                        onClick={() => setNotesOpen(notesOpen === message.id ? null : message.id)}
                        className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left"
                      >
                        <ShieldCheck size={11} className="text-ink-4" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-4">
                          Reviewer notes
                        </span>
                        <span className="text-[11.5px] text-ink-4">({message.review_notes.length})</span>
                        <ChevronDown
                          size={12}
                          className={cn(
                            'ml-auto text-ink-4 transition-transform',
                            notesOpen === message.id && 'rotate-180',
                          )}
                        />
                      </button>
                      {notesOpen === message.id ? (
                        <ul className="space-y-1 border-t border-line px-3.5 py-2.5">
                          {message.review_notes.map((note) => (
                            <li key={note} className="text-[12px] leading-relaxed text-ink-3">
                              {note}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                  {isEditing ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={busy === message.id}
                        icon={<Check size={13} />}
                        onClick={() => saveEdit(message)}
                      >
                        Save changes
                      </Button>
                      <Button variant="quiet" size="sm" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => {
                          setEditing(message.id)
                          setDraft(message.body)
                        }}
                      >
                        Edit
                      </Button>
                      {message.status !== 'approved' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Check size={13} />}
                          loading={busy === message.id}
                          onClick={() => act(message, 'approve')}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {message.status !== 'rejected' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<X size={12} />}
                          loading={busy === message.id}
                          onClick={() => act(message, 'reject')}
                        >
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        variant="quiet"
                        size="sm"
                        icon={<RefreshCw size={12} />}
                        loading={busy === message.id}
                        onClick={() => act(message, 'regenerate')}
                      >
                        Regenerate
                      </Button>
                      <Link
                        to={`/leads/${message.lead_id}`}
                        className="ml-auto text-[11.5px] text-ink-4 underline-offset-2 transition-colors hover:text-ink-2 hover:underline"
                      >
                        Why this lead?
                      </Link>
                    </>
                  )}
                </div>
              </article>
            )
          })}

          {remaining > 0 ? (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setLimit((value) => value + 8)}>
                Show {Math.min(remaining, 8)} more
              </Button>
              <span className="text-[11.5px] text-ink-4">
                Showing {visible.length} of {messages.length}
              </span>
              <Button variant="quiet" size="sm" onClick={() => setLimit(messages.length)}>
                Show all
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
