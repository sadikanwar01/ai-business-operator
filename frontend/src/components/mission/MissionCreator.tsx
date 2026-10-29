import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Field'
import { cn } from '../../lib/format'

const SUGGESTIONS = [
  'Find 10 high-value healthcare businesses in India that need a new website.',
  'Find 8 SaaS companies in Europe with a slow homepage and no live chat.',
  'Find 12 dental clinics in the US that do not offer online booking.',
]

export function MissionCreator({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [location, setLocation] = useState('')
  const [result, setResult] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = async () => {
    const trimmed = goal.trim()
    if (trimmed.length < 12) {
      setError('Describe the outcome you want in one clear sentence.')
      return
    }
    setLaunching(true)
    setError(null)
    try {
      const payload = await api.post<{ mission: { id: string } }>('/api/missions', {
        goal: trimmed,
        target_audience: audience.trim() || null,
        location: location.trim() || null,
        desired_result: result.trim() || null,
        target_count: 10,
      })
      notify({
        tone: 'success',
        title: 'Mission launched',
        detail: 'The Operator is planning the work now.',
      })
      navigate(`/missions/${payload.mission.id}`)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'The mission could not be launched. Try again.'
      setError(message)
      notify({ tone: 'error', title: 'Mission not launched', detail: message })
    } finally {
      setLaunching(false)
    }
  }

  return (
    <section
      className={cn(
        'surface relative overflow-hidden',
        compact ? 'p-5' : 'p-6 sm:p-7',
      )}
    >
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-accent" strokeWidth={2} />
          <p className="label-eyebrow">What would you like to achieve?</p>
        </div>

        <textarea
          value={goal}
          onChange={(event) => {
            setGoal(event.target.value)
            if (error) setError(null)
          }}
          rows={3}
          placeholder={SUGGESTIONS[0]}
          className={cn(
            'mt-4 w-full resize-none rounded-[10px] border border-line-strong bg-surface-2 px-4 py-3.5',
            'text-[15px] leading-relaxed text-ink placeholder:text-ink-4',
            'transition-colors duration-150 hover:border-ink-4 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15',
          )}
          aria-label="Business goal"
        />

        {goal.trim().length === 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.slice(1).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setGoal(suggestion)}
                className="rounded-md border border-line bg-surface-2/60 px-2.5 py-1 text-[11.5px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-ink-3">Target audience</span>
            <Input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Hospitals and clinics"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-ink-3">Location</span>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="India"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-ink-3">Desired result</span>
            <Input
              value={result}
              onChange={(event) => setResult(event.target.value)}
              placeholder="Qualified opportunities with outreach"
            />
          </label>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-[9px] border border-critical/25 bg-critical-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-critical"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[11.5px] leading-relaxed text-ink-4">
            The Operator determines the plan, research, analysis, qualification and review steps
            on its own. You approve every action before it leaves the workspace.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={launch}
            loading={launching}
            icon={<ArrowRight size={15} />}
            className="shrink-0"
          >
            Launch Mission
          </Button>
        </div>
      </div>
    </section>
  )
}
