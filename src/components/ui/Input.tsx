import { type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

export function Input({
  label,
  error,
  helper,
  id: providedId,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = providedId ?? generatedId

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-forest"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full min-h-[48px] px-4 py-3',
          'rounded-xl border',
          'text-base text-gray-900 placeholder:text-gray-400',
          'bg-white',
          'transition-all duration-150',
          error
            ? 'border-danger focus:ring-danger/40'
            : 'border-gray-200 focus:border-forest-light focus:ring-forest-light/30',
          'focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
        }
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger mt-0.5">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${inputId}-helper`} className="text-xs text-gray-500 mt-0.5">
          {helper}
        </p>
      )}
    </div>
  )
}
