import { useEffect, useState } from 'react'
import { Bell, Cpu, KeyRound, ShieldCheck, User } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Card, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'

interface SettingsPayload {
  settings: Record<string, Record<string, unknown>>
  workspace: { name: string; slug: string; plan: string }
  user: { id: string; name: string; email: string; role: string }
}

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Security', icon: ShieldCheck },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'ai_preferences', label: 'AI preferences', icon: Cpu },
]

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-2">{label}</p>
        {description ? <p className="mt-0.5 text-[11.5px] text-ink-4">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-150 ${
          checked ? 'border-accent/50 bg-accent/85' : 'border-line-strong bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-1/2 size-[15px] -translate-y-1/2 rounded-full transition-all duration-150 ${
            checked ? 'left-[18px] bg-white' : 'left-[3px] bg-ink-4'
          }`}
        />
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { notify } = useToast()
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi<SettingsPayload>('/api/settings')
  const [section, setSection] = useState('profile')
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data) setValues(data.settings)
  }, [data])

  const current = values[section] ?? {}

  const update = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [section]: { ...(prev[section] ?? {}), [key]: value } }))
  }

  const save = async () => {
    setBusy(true)
    try {
      await api.patch('/api/settings', { section, values: current })
      notify({ tone: 'success', title: 'Settings saved' })
    } catch {
      notify({ tone: 'error', title: 'Could not save settings' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell className="max-w-[980px]">
      <PageHeader
        eyebrow="Configuration"
        title="Workspace Settings"
        subtitle="Account, security and how the Operator behaves in this workspace."
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Settings could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <nav className="surface h-fit p-2">
            {SECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                  section === item.key
                    ? 'bg-surface-2 font-medium text-ink'
                    : 'text-ink-3 hover:bg-surface-2/60 hover:text-ink-2'
                }`}
              >
                <item.icon size={14} strokeWidth={1.8} className={section === item.key ? 'text-accent' : ''} />
                {item.label}
              </button>
            ))}
          </nav>

          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">
                  {SECTIONS.find((item) => item.key === section)?.label}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-4">
                  {data?.workspace.name} · {data?.workspace.plan} plan
                </p>
              </div>
              <Button variant="secondary" size="sm" loading={busy} onClick={save}>
                Save changes
              </Button>
            </div>

            {section === 'profile' ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={String(current.name ?? user?.name ?? '')}
                    onChange={(event) => update('name', event.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={String(current.email ?? user?.email ?? '')}
                    onChange={(event) => update('email', event.target.value)}
                  />
                </Field>
                <Field label="Role">
                  <Input
                    value={String(current.role ?? '')}
                    onChange={(event) => update('role', event.target.value)}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={String(current.company ?? '')}
                    onChange={(event) => update('company', event.target.value)}
                  />
                </Field>
                <Field label="Timezone" className="sm:col-span-2">
                  <Input
                    value={String(current.timezone ?? '')}
                    onChange={(event) => update('timezone', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {section === 'security' ? (
              <div className="mt-2 divide-y divide-line">
                <Toggle
                  checked={Boolean(current.two_factor)}
                  onChange={(value) => update('two_factor', value)}
                  label="Two-factor authentication"
                  description="Require a second factor on every sign in."
                />
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-[13px] text-ink-2">Session timeout</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-4">
                      How long a signed-in session stays valid.
                    </p>
                  </div>
                  <span className="text-[12.5px] text-ink-3">{String(current.session_timeout ?? '')}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-2">
                    <KeyRound size={13} className="text-ink-4" />
                    <p className="text-[13px] text-ink-2">Password</p>
                  </div>
                  <span className="text-[11.5px] text-ink-4">
                    Last changed {String(current.password_rotated ?? '')}
                  </span>
                </div>
              </div>
            ) : null}

            {section === 'notifications' ? (
              <div className="mt-2 divide-y divide-line">
                <Toggle
                  checked={Boolean(current.mission_complete)}
                  onChange={(value) => update('mission_complete', value)}
                  label="Mission completed"
                  description="Notify me when the Operator finishes a mission."
                />
                <Toggle
                  checked={Boolean(current.lead_high_intent)}
                  onChange={(value) => update('lead_high_intent', value)}
                  label="High-intent opportunity found"
                  description="Notify me when a lead scores 80 or above."
                />
                <Toggle
                  checked={Boolean(current.outreach_review)}
                  onChange={(value) => update('outreach_review', value)}
                  label="Outreach awaiting review"
                  description="Notify me when a message needs approval."
                />
                <Toggle
                  checked={Boolean(current.weekly_digest)}
                  onChange={(value) => update('weekly_digest', value)}
                  label="Weekly digest"
                  description="A summary of what the Operator produced each week."
                />
              </div>
            ) : null}

            {section === 'ai_preferences' ? (
              <div className="mt-5 space-y-4">
                <Toggle
                  checked={Boolean(current.auto_approve_high_confidence)}
                  onChange={(value) => update('auto_approve_high_confidence', value)}
                  label="Auto-approve high confidence messages"
                  description="Off by default. Messages always wait for an explicit human approval."
                />
                <Field label="Minimum confidence to draft" hint="Messages below this score are skipped.">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={String(current.minimum_confidence ?? 0.8)}
                    onChange={(event) => update('minimum_confidence', Number(event.target.value))}
                  />
                </Field>
                <Field label="Research depth">
                  <Input
                    value={String(current.research_depth ?? 'Deep')}
                    onChange={(event) => update('research_depth', event.target.value)}
                  />
                </Field>
                <Field label="Default tone">
                  <Input
                    value={String(current.tone ?? 'Consultative')}
                    onChange={(event) => update('tone', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </PageShell>
  )
}
