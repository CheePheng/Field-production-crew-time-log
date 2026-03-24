import { NavLink } from 'react-router-dom'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={active ? 2.5 : 1.8}
      stroke="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path strokeLinecap="round" d="M3 9h18" />
      <path strokeLinecap="round" d="M8 2v4M16 2v4" />
      <rect x="8" y="13" width="3" height="3" rx="0.5" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function ReportsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={active ? 2.5 : 1.8}
      stroke="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
      />
      <path strokeLinecap="round" d="M9 8h6" />
    </svg>
  )
}

function ExportIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={active ? 2.5 : 1.8}
      stroke="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1"
      />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={active ? 2.5 : 1.8}
      stroke="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// ─── Tab Definition ───────────────────────────────────────────────────────────

interface Tab {
  to: string
  label: string
  Icon: React.FC<{ active: boolean }>
  end?: boolean
}

const TABS: Tab[] = [
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/reports', label: 'Reports', Icon: ReportsIcon },
  { to: '/export', label: 'Export', Icon: ExportIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

// ─── TabBar ───────────────────────────────────────────────────────────────────

export function TabBar() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch justify-around max-w-lg mx-auto">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className="flex flex-col items-center justify-center gap-0.5 w-full min-h-[56px] px-2 py-2"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'transition-colors duration-150',
                      isActive ? 'text-forest-light' : 'text-gray-400',
                    ].join(' ')}
                  >
                    <Icon active={isActive} />
                  </span>
                  <span
                    className={[
                      'text-[10px] font-semibold tracking-wide transition-colors duration-150',
                      isActive ? 'text-forest-light' : 'text-gray-400',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                  {/* Active indicator dot */}
                  <span
                    aria-hidden="true"
                    className={[
                      'w-1 h-1 rounded-full bg-forest-light transition-all duration-150',
                      isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
                    ].join(' ')}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
