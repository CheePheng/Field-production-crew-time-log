import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 gradient-hero text-white shadow-md"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-white/80 font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="ml-4 shrink-0">{action}</div>
        )}
      </div>
    </header>
  )
}
