import { Check } from 'lucide-react'
import { cn } from '../../lib/format'
import type { MissionStep } from '../../lib/types'

const STEP_ORDER = ['plan', 'research', 'analyze', 'qualify', 'personalize', 'review', 'result']

function nodeState(step: MissionStep) {
  if (step.status === 'complete') return 'complete'
  if (step.status === 'running') return 'working'
  if (step.status === 'failed') return 'failed'
  return 'waiting'
}

export function WorkflowTimeline({ steps }: { steps: MissionStep[] }) {
  const ordered = STEP_ORDER.map((key) => steps.find((step) => step.key === key)).filter(
    (step): step is MissionStep => Boolean(step),
  )
  const workingIndex = ordered.findIndex((step) => nodeState(step) === 'working')
  const failedIndex = ordered.findIndex((step) => nodeState(step) === 'failed')
  const rawIndex =
    workingIndex >= 0 ? workingIndex : failedIndex >= 0 ? failedIndex : ordered.length
  const activeIndex = Math.min(rawIndex, ordered.length - 1)
  const fill = ordered.length > 1 ? (activeIndex / (ordered.length - 1)) * 100 : 0

  return (
    <div>
      {/* Desktop / tablet */}
      <div className="relative hidden md:block">
        <div className="absolute left-[7.14%] right-[7.14%] top-[13px] h-px bg-line" />
        <div
          className="absolute left-[7.14%] top-[13px] h-px bg-accent transition-[width] duration-700"
          style={{ width: `${(fill / 100) * 85.72}%` }}
        />
        <ol className="relative grid grid-cols-7">
          {ordered.map((step) => {
            const state = nodeState(step)
            return (
              <li key={step.key} className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    'flex size-[26px] items-center justify-center rounded-full border text-[10px] font-semibold transition-colors duration-300',
                    state === 'complete' && 'border-accent bg-accent text-white',
                    state === 'working' && 'border-accent bg-surface text-accent animate-pulse-ring',
                    state === 'failed' && 'border-critical bg-critical-soft text-critical',
                    state === 'waiting' && 'border-line-strong bg-surface text-ink-4',
                  )}
                >
                  {state === 'complete' ? (
                    <Check size={13} strokeWidth={3} />
                  ) : state === 'failed' ? (
                    '!'
                  ) : state === 'working' ? (
                    <span className="size-1.5 rounded-full bg-accent" />
                  ) : (
                    <span className="size-1 rounded-full bg-ink-4" />
                  )}
                </span>
                <span
                  className={cn(
                    'mt-2.5 text-[10px] font-semibold uppercase tracking-[0.13em]',
                    state === 'complete' && 'text-ink-2',
                    state === 'working' && 'text-accent',
                    state === 'failed' && 'text-critical',
                    state === 'waiting' && 'text-ink-4',
                  )}
                >
                  {step.name}
                </span>
                {step.detail && state !== 'waiting' ? (
                  <span className="mt-1 max-w-[130px] text-[10.5px] leading-snug text-ink-4">
                    {step.detail}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Mobile */}
      <ol className="space-y-0 md:hidden">
        {ordered.map((step, index) => {
          const state = nodeState(step)
          const isLast = index === ordered.length - 1
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-[22px] items-center justify-center rounded-full border text-[9px] font-semibold',
                    state === 'complete' && 'border-accent bg-accent text-white',
                    state === 'working' && 'border-accent bg-surface text-accent',
                    state === 'failed' && 'border-critical bg-critical-soft text-critical',
                    state === 'waiting' && 'border-line-strong bg-surface text-ink-4',
                  )}
                >
                  {state === 'complete' ? <Check size={11} strokeWidth={3} /> : index + 1}
                </span>
                {!isLast ? (
                  <span
                    className={cn(
                      'my-1 w-px flex-1',
                      state === 'complete' ? 'bg-accent/50' : 'bg-line',
                    )}
                  />
                ) : null}
              </div>
              <div className="pb-4">
                <p
                  className={cn(
                    'text-[11.5px] font-semibold uppercase tracking-[0.12em]',
                    state === 'complete' && 'text-ink-2',
                    state === 'working' && 'text-accent',
                    state === 'failed' && 'text-critical',
                    state === 'waiting' && 'text-ink-4',
                  )}
                >
                  {step.name}
                </p>
                {step.detail ? (
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-4">{step.detail}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
