interface StatusChipProps {
  isOnline: boolean
}

export function StatusChip({ isOnline }: StatusChipProps) {
  return (
    <div
      role="status"
      aria-label={isOnline ? 'Online' : 'Offline — saving locally'}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        'rounded-full text-xs font-semibold',
        'border',
        isOnline
          ? 'bg-success/10 text-success border-success/30'
          : 'bg-amber-50 text-amber-700 border-amber-200',
      ].join(' ')}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        className={[
          'inline-block w-1.5 h-1.5 rounded-full',
          isOnline ? 'bg-success animate-pulse' : 'bg-amber-500',
        ].join(' ')}
      />
      <span>{isOnline ? 'Online' : 'Offline — saving locally'}</span>
    </div>
  )
}
