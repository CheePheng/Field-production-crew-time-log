import { useCallback } from 'react'
import type { CrewMember } from '@/db/schema'

interface CrewChipProps {
  member: CrewMember
  selected: boolean
  onToggle: (id: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function CrewChip({ member, selected, onToggle }: CrewChipProps) {
  const handleClick = useCallback(() => {
    onToggle(member.id)
  }, [member.id, onToggle])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'flex items-center gap-3 w-full',
        'min-h-[56px] px-3 py-2',
        'rounded-xl border-2',
        'transition-all duration-150 ease-out',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
        selected
          ? 'bg-forest/10 border-forest'
          : 'bg-white border-gray-200 hover:border-gray-300',
      ].join(' ')}
      aria-pressed={selected}
      aria-label={`${member.name}, ${member.role_label}${selected ? ', selected' : ''}`}
    >
      {/* Initials circle */}
      <span
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-forest-light text-white text-sm font-bold"
        aria-hidden="true"
      >
        {getInitials(member.name)}
      </span>

      {/* Name + role */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
        <p className="text-xs text-gray-500 truncate">{member.role_label}</p>
      </div>

      {/* Checkmark when selected */}
      {selected && (
        <span
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
