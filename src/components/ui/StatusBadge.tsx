// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'draft' | 'submitted' | 'synced'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = {
    draft:     'bg-amber-100 text-amber-800 border border-amber-200',
    submitted: 'bg-green-100 text-green-800 border border-green-200',
    synced:    'bg-blue-100 text-blue-800 border border-blue-200',
  }[status]
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg}`}>
      {label}
    </span>
  )
}
