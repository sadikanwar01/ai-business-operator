import { Menu, Radio } from 'lucide-react'
import { cn, initials } from '../../lib/format'

export function Topbar({
  user,
  provider,
  onMenu,
}: {
  user: { name: string; email: string }
  provider?: { mode: 'live' | 'demo'; model: string } | null
  onMenu: () => void
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-[7px] p-1.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={17} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden truncate text-[12.5px] text-ink-3 sm:inline">
          Autonomous business operations
        </span>
      </div>

      {provider ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11px] font-medium',
            provider.mode === 'live'
              ? 'border-positive/25 bg-positive-soft text-positive'
              : 'border-line-strong bg-surface-2 text-ink-3',
          )}
          title={
            provider.mode === 'live'
              ? `Live inference via ${provider.model}`
              : 'Demo provider - no external model calls are made'
          }
        >
          <Radio size={11} strokeWidth={2.2} />
          {provider.mode === 'live' ? 'Live' : 'Demo'}
        </span>
      ) : null}

      <span className="flex size-8 items-center justify-center rounded-[8px] bg-surface-2 text-[11.5px] font-semibold text-ink-2">
        {initials(user.name)}
      </span>
    </header>
  )
}
