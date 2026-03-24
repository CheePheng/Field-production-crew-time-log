import { useId } from 'react'

type ToggleSize = 'sm' | 'md'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  size?: ToggleSize
}

export function Toggle({
  checked,
  onChange,
  label,
  size = 'md',
}: ToggleProps) {
  const id = useId()

  const trackSize = size === 'md'
    ? 'w-12 h-6'
    : 'w-9 h-5'

  const thumbSize = size === 'md'
    ? 'w-5 h-5'
    : 'w-4 h-4'

  const thumbTranslate = size === 'md'
    ? checked ? 'translate-x-6' : 'translate-x-0.5'
    : checked ? 'translate-x-4' : 'translate-x-0.5'

  return (
    <div className="flex items-center gap-3">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-gray-700 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex items-center shrink-0',
          'rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
          trackSize,
          checked ? 'bg-forest-light' : 'bg-gray-300',
        ].join(' ')}
      >
        <span className="sr-only">{label ?? 'Toggle'}</span>
        <span
          className={[
            'inline-block rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-in-out',
            thumbSize,
            thumbTranslate,
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
