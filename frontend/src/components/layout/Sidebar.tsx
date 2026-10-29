import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarClock,
  Compass,
  LayoutGrid,
  Mail,
  Plug,
  Search,
  Settings,
  Target,
  Users,
  X,
} from 'lucide-react'
import { cn, initials } from '../../lib/format'
import { LogoMark } from '../Logo'

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutGrid
  end?: boolean
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', to: '/dashboard', icon: LayoutGrid, end: true },
      { label: 'Missions', to: '/missions', icon: Target },
      { label: 'Leads', to: '/leads', icon: Users },
      { label: 'Research', to: '/research', icon: Search },
      { label: 'Outreach', to: '/outreach', icon: Mail },
      { label: 'Follow-ups', to: '/follow-ups', icon: CalendarClock },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Insights', to: '/insights', icon: Compass },
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
      { label: 'Activity', to: '/activity', icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Knowledge', to: '/knowledge', icon: BookOpen },
      { label: 'Integrations', to: '/integrations', icon: Plug },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar({
  user,
  workspace,
  onNavigate,
}: {
  user: { name: string; email: string }
  workspace: { name: string; plan: string }
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={22} className="text-accent" />
          <span className="text-[12.5px] font-semibold uppercase leading-[1.15] tracking-[0.15em] text-ink">
            AI Business
            <br />
            Operator
          </span>
        </div>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded p-1 text-ink-3 transition-colors hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="label-eyebrow px-2.5 pb-2">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px] transition-colors duration-150',
                        isActive
                          ? 'bg-surface-2 font-medium text-ink'
                          : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                        ) : null}
                        <item.icon
                          size={15}
                          strokeWidth={1.8}
                          className={isActive ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-[9px] px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-accent-soft text-[11.5px] font-semibold text-accent-ink">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{user.name}</p>
            <p className="truncate text-[11px] leading-tight text-ink-4">{workspace.name}</p>
          </div>
          <span className="rounded border border-line-strong px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-ink-4">
            {workspace.plan}
          </span>
        </div>
      </div>
    </div>
  )
}
