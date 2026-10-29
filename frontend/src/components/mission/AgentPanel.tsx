import { cn } from '../../lib/format'
import type { AgentState } from '../../lib/types'

function tone(status: AgentState['status']) {
  switch (status) {
    case 'complete':
      return 'text-positive'
    case 'working':
      return 'text-accent'
    case 'failed':
      return 'text-critical'
    default:
      return 'text-ink-4'
  }
}

function dot(status: AgentState['status']) {
  switch (status) {
    case 'complete':
      return 'bg-positive'
    case 'working':
      return 'bg-accent animate-pulse-ring'
    case 'failed':
      return 'bg-critical'
    default:
      return 'bg-ink-4/60'
  }
}

function label(status: AgentState['status']) {
  switch (status) {
    case 'complete':
      return 'Complete'
    case 'working':
      return 'Working'
    case 'failed':
      return 'Failed'
    default:
      return 'Waiting'
  }
}

export function AgentPanel({ agents }: { agents: AgentState[] }) {
  return (
    <div className="surface">
      <div className="border-b border-line px-4 py-3">
        <p className="label-eyebrow">Operator Team</p>
      </div>
      <ul className="divide-y divide-line">
        {agents.map((agent) => (
          <li key={agent.id} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={cn('size-1.5 shrink-0 rounded-full', dot(agent.status))} />
              <span className="text-[13px] font-medium text-ink">{agent.name}</span>
              <span className={cn('ml-auto text-[10.5px] font-medium', tone(agent.status))}>
                {label(agent.status)}
              </span>
            </div>
            <p className="mt-1 pl-3.5 text-[11.5px] leading-snug text-ink-4">{agent.role}</p>
            <p
              className={cn(
                'mt-1 pl-3.5 text-[11.5px] leading-snug',
                agent.status === 'working' ? 'text-ink-2' : 'text-ink-4',
              )}
            >
              {agent.task ?? 'Awaiting instructions'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
