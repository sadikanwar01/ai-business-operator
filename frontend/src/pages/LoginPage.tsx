import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CheckCircle2, FileText, Search, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { LogoMark } from '../components/Logo'

const capabilities = [
  { icon: Search, title: 'Research opportunities', body: 'Finds real businesses and measures their websites.' },
  { icon: BarChart3, title: 'Analyze & qualify', body: 'Scores every opportunity with evidence you can check.' },
  { icon: FileText, title: 'Prepare actions', body: 'Writes personalised outreach for each qualified lead.' },
  { icon: CheckCircle2, title: 'Review its own work', body: 'A reviewer agent fact-checks every message.' },
  { icon: ShieldCheck, title: 'You stay in control', body: 'Nothing leaves the workspace without your approval.' },
]

export function LoginPage() {
  const { signIn, continueWithDemo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('sadik@myagency.in')
  const [password, setPassword] = useState('operator')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy('form')
    setError(null)
    try {
      await signIn(email.trim(), password, remember)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not sign you in. Check your connection and try again.',
      )
    } finally {
      setBusy(null)
    }
  }

  const handleDemo = async () => {
    setBusy('demo')
    setError(null)
    try {
      await continueWithDemo()
      navigate('/dashboard', { replace: true })
    } catch {
      setError('The demo workspace is unavailable right now. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between">
        <div className="grid-fade pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_100%,rgba(22,163,74,0.2),transparent_70%)]" />
        <div className="relative px-12 pt-12">
          <div className="flex items-center gap-3">
            <LogoMark size={30} className="text-accent" />
            <span className="text-[13px] font-semibold uppercase leading-[1.15] tracking-[0.18em] text-ink">
              AI Business
              <br />
              Operator
            </span>
          </div>
        </div>

        <div className="relative max-w-[520px] px-12 pb-16">
          <h1 className="text-[34px] font-semibold leading-[1.14] tracking-[-0.025em] text-ink">
            Your <span className="text-accent">AI Operator</span> for
            <br />
            Business Growth
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            Give it a goal. Let it handle the work.
          </p>

          <ul className="mt-10 space-y-5">
            {capabilities.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-line-strong bg-surface-2 text-ink-2">
                  <item.icon size={13.5} strokeWidth={1.9} />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative border-t border-line px-12 py-5">
          <p className="mono text-[11px] tracking-wide text-ink-4">
            7-stage workflow · 6 autonomous agents · human approval on every action
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px] rounded-[16px] border border-line bg-surface p-8 shadow-[0_20px_50px_-24px_rgba(16,22,20,0.25)]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <LogoMark size={28} className="text-accent" />
            <span className="text-[12.5px] font-semibold uppercase leading-[1.15] tracking-[0.17em] text-ink">
              AI Business
              <br />
              Operator
            </span>
          </div>

          <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Sign in</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
            Access your operator workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="Email / Username">
              <Input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                <span
                  className={`flex size-[15px] items-center justify-center rounded-[4px] border transition-colors ${
                    remember
                      ? 'border-accent bg-accent text-white'
                      : 'border-line-strong bg-surface-2'
                  }`}
                >
                  {remember ? (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-[12.5px] text-ink-3 transition-colors hover:text-accent"
                onClick={() =>
                  setError('Password reset is not enabled in this demo environment.')
                }
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-[9px] border border-critical/25 bg-critical-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-critical"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy === 'form'}
              icon={<ArrowRight size={15} />}
            >
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-4">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            loading={busy === 'demo'}
            onClick={handleDemo}
          >
            Continue with Demo Workspace
          </Button>

          <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-4">
            Demo workspace preloads a completed healthcare mission, 24 qualified leads and 17
            reviewed messages. No external calls are made.
          </p>
        </div>
      </div>
    </div>
  )
}
