interface StepperProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 24,
  step = 0.5,
  label,
}: StepperProps) {
  const decrement = () => {
    const next = Math.round((value - step) * 100) / 100
    if (next >= min) onChange(next)
  }

  const increment = () => {
    const next = Math.round((value + step) * 100) / 100
    if (next <= max) onChange(next)
  }

  const displayValue = Number.isInteger(value) ? `${value}` : value.toFixed(1)

  return (
    <div className="flex flex-col items-start gap-1.5 w-full">
      {label && (
        <span className="text-sm font-semibold text-forest">{label}</span>
      )}
      <div className="flex items-center gap-3 w-full">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
          className={[
            'flex items-center justify-center',
            'w-12 h-12 rounded-full',
            'bg-forest text-white text-2xl font-bold',
            'shadow-md',
            'transition-all duration-150 active:scale-[0.94]',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
          ].join(' ')}
        >
          <span aria-hidden="true">−</span>
        </button>

        <div className="flex-1 text-center">
          <span className="text-3xl font-bold text-forest tabular-nums">
            {displayValue}
          </span>
          <span className="text-sm text-gray-500 ml-1">hrs</span>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
          className={[
            'flex items-center justify-center',
            'w-12 h-12 rounded-full',
            'bg-forest text-white text-2xl font-bold',
            'shadow-md',
            'transition-all duration-150 active:scale-[0.94]',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
          ].join(' ')}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}
