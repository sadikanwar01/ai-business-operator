import { useState } from 'react'
import { Check, Database, Plug, Search, Cpu, Mail } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import { cn } from '../lib/format'
import type { Integration } from '../lib/types'

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  ai: Cpu,
  research: Search,
  database: Database,
  email: Mail,
  calendar: Plug,
  crm: Plug,
}

export function IntegrationsPage() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useApi<{
    integrations: Integration[]
    provider: { provider: string; mode: string; model: string; live_configured: boolean; base_url: string | null }
  }>('/api/integrations')
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = async (integration: Integration, action: 'connect' | 'disconnect') => {
    setBusy(integration.id)
    try {
      await api.post(`/api/integrations/${integration.id}/${action}`)
      notify({
        tone: 'success',
        title: action === 'connect' ? `${integration.name} connected` : `${integration.name} disconnected`,
      })
      void reload(true)
    } catch {
      notify({ tone: 'error', title: 'Could not update the integration' })
    } finally {
      setBusy(null)
    }
  }

  const integrations = data?.integrations ?? []

  return (
    <PageShell>
      <PageHeader
        eyebrow="Infrastructure"
        title="Integrations"
        subtitle="The infrastructure the Operator runs on. Credentials live on the server and are never exposed to the browser."
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Integrations could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-accent-line bg-accent-soft text-accent">
                  <Cpu size={15} strokeWidth={1.9} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">AI provider</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                    {data?.provider.provider === 'nebius'
                      ? 'Nebius Token Factory is serving inference for every agent in the workflow.'
                      : 'The deterministic demo provider is active. Add NEBIUS_API_KEY on the server to route inference through Nebius Token Factory and NVIDIA Nemotron.'}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <Badge tone={data?.provider.live_configured ? 'positive' : 'caution'} dot>
                  {data?.provider.live_configured ? 'Live' : 'Demo'}
                </Badge>
                <p className="mono mt-1.5 text-[10.5px] text-ink-4">{data?.provider.model}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = CATEGORY_ICONS[integration.category] ?? Plug
              const connected = integration.status === 'connected'
              const isAiIntegration = integration.category === 'ai'
              const simulating = isAiIntegration && data?.provider.provider !== 'nebius'
              return (
                <Card key={integration.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-line-strong bg-surface-2 text-ink-2">
                        <Icon size={14} strokeWidth={1.9} />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-medium text-ink">{integration.name}</p>
                        <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-ink-4">
                          {integration.category}
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={
                        simulating
                          ? 'caution'
                          : connected
                            ? 'positive'
                            : integration.status === 'available'
                              ? 'indigo'
                              : 'neutral'
                      }
                      dot={connected && !simulating}
                    >
                      {simulating
                        ? 'Demo mode'
                        : connected
                          ? 'Connected'
                          : integration.status === 'available'
                            ? 'Available'
                            : 'Not connected'}
                    </Badge>
                  </div>

                  <p className="mt-3.5 flex-1 text-[12.5px] leading-relaxed text-ink-3">
                    {integration.description}
                  </p>

                  {integration.model ? (
                    <p className="mono mt-3 text-[10.5px] text-ink-4">model · {integration.model}</p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
                    {connected ? (
                      <>
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-[11.5px]',
                            simulating ? 'text-caution' : 'text-positive',
                          )}
                        >
                          <Check size={11} strokeWidth={2.6} />
                          {simulating ? 'Simulation active' : 'Active'}
                        </span>
                        <Button
                          variant="quiet"
                          size="sm"
                          className="ml-auto"
                          loading={busy === integration.id}
                          onClick={() => toggle(integration, 'disconnect')}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="ml-auto"
                        loading={busy === integration.id}
                        onClick={() => toggle(integration, 'connect')}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className={cn('p-5')}>
            <p className="label-eyebrow">How the AI layer is wired</p>
            <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {['Frontend', 'Backend API', 'Agent Orchestrator', 'Provider', 'Model'].map((label, index) => (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      'flex-1 rounded-[8px] border px-3 py-2 text-center text-[11.5px]',
                      index === 4
                        ? 'border-accent-line bg-accent-soft text-accent-ink'
                        : 'border-line-strong bg-surface-2 text-ink-2',
                    )}
                  >
                    {label}
                  </span>
                  {index < 4 ? (
                    <span className="hidden text-ink-4 sm:block">→</span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="mt-3.5 text-[11.5px] leading-relaxed text-ink-4">
              The provider is selected at runtime from server environment variables. Swapping the
              demo provider for Nebius Token Factory changes no application code.
            </p>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
