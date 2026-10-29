import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Save } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/StateBlocks'
import { Field, Input, Select, Textarea } from '../components/ui/Field'

const INDUSTRIES = [
  'Healthcare',
  'SaaS',
  'Real Estate',
  'Restaurant',
  'Legal',
  'Manufacturing',
  'Education',
  'Finance',
  'Fitness',
  'Retail',
  'Automotive',
  'Logistics',
]

const ACTIONS = [
  'Personalized Outreach',
  'Qualified Lead List',
  'Discovery Call Booking',
  'Audit Summary',
  'Competitive Review',
]

export function NewMissionPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [goal, setGoal] = useState('')
  const [industry, setIndustry] = useState('Healthcare')
  const [location, setLocation] = useState('India')
  const [count, setCount] = useState('10')
  const [action, setAction] = useState('Personalized Outreach')
  const [audience, setAudience] = useState('')
  const [result, setResult] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = async () => {
    if (goal.trim().length < 12) {
      setError('Describe the outcome you want in one clear sentence.')
      return
    }
    setLaunching(true)
    setError(null)
    try {
      const payload = await api.post<{ mission: { id: string } }>('/api/missions', {
        goal: goal.trim(),
        industry,
        location: location.trim() || 'India',
        target_count: Math.max(1, Math.min(200, Number(count) || 10)),
        desired_action: action,
        target_audience: audience.trim() || null,
        desired_result: result.trim() || null,
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
    } finally {
      setLaunching(false)
    }
  }

  return (
    <PageShell className="max-w-[880px]">
      <PageHeader
        back={{ to: '/dashboard', label: 'Back to overview' }}
        eyebrow="Delegate a goal"
        title="Create a Mission"
        subtitle="Tell the Operator the outcome you want. It will determine the work required."
      />

      <Card className="p-6">
        <p className="label-eyebrow">What do you want to achieve?</p>
        <Textarea
          value={goal}
          onChange={(event) => {
            setGoal(event.target.value)
            if (error) setError(null)
          }}
          rows={3}
          placeholder="Find 10 healthcare businesses in India that are likely to need a new website."
          className="mt-3 text-[15px]"
        />
        {error ? (
          <p className="mt-2 text-[12.5px] text-critical">{error}</p>
        ) : (
          <p className="mt-2 text-[11.5px] text-ink-4">
            One sentence is enough. The Operator decides the plan, the research method and the
            review criteria.
          </p>
        )}
      </Card>

      <Card className="mt-4 p-6">
        <p className="label-eyebrow">Optional configuration</p>
        <p className="mt-2 text-[12.5px] text-ink-3">
          These refine the mission. Leaving them blank lets the Operator infer them from the goal.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Target Industry">
            <Select value={industry} onChange={(event) => setIndustry(event.target.value)}>
              {INDUSTRIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Location">
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="India"
            />
          </Field>

          <Field label="Number of Opportunities">
            <Input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </Field>

          <Field label="Desired Action">
            <Select value={action} onChange={(event) => setAction(event.target.value)}>
              {ACTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Target audience" className="sm:col-span-2">
            <Input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Hospitals and multi-speciality clinics"
            />
          </Field>

          <Field label="Desired result" className="sm:col-span-2">
            <Input
              value={result}
              onChange={(event) => setResult(event.target.value)}
              placeholder="Qualified opportunities with prepared outreach"
            />
          </Field>
        </div>
      </Card>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="secondary"
          size="lg"
          icon={<Save size={14} />}
          onClick={() =>
            notify({
              tone: 'info',
              title: 'Draft saved locally',
              detail: 'Drafts are stored in this browser session for the demo.',
            })
          }
        >
          Save Draft
        </Button>
        <Button
          variant="primary"
          size="lg"
          loading={launching}
          icon={<ArrowRight size={15} />}
          onClick={launch}
        >
          Launch Mission
        </Button>
      </div>
    </PageShell>
  )
}
