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
        <span
          className="text-sm font-semibold text-gray-700 select-none cursor-pointer"
          onClick={() => onChange(!checked)}
        >
          {label}
        </span>
      )}
      {/* Button wrapper with minimum 48×48px touch target */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex items-center justify-center shrink-0',
          'min-h-[48px] min-w-[48px]',
          'rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <span className="sr-only">{label ?? 'Toggle'}</span>
        <span
          className={[
            'relative inline-flex items-center shrink-0 rounded-full',
            'transition-colors duration-200 ease-in-out',
            trackSize,
            checked ? 'bg-forest-light' : 'bg-gray-300',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block rounded-full bg-white shadow-sm',
              'transition-transform duration-200 ease-in-out',
              thumbSize,
              thumbTranslate,
            ].join(' ')}
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  )
}
