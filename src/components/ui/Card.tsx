import { type ReactNode } from 'react'

export type CardVariant = 'glass' | 'solid' | 'gradient'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  children: ReactNode
  className?: string
}

const variantClasses: Record<CardVariant, string> = {
  glass: 'glass',
  solid: 'bg-white rounded-2xl shadow-lg',
  gradient: 'gradient-hero text-white rounded-2xl shadow-lg',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  variant = 'solid',
  padding = 'md',
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl overflow-hidden',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
