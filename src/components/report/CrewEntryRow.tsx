import { useCallback } from 'react'
import { Toggle } from '@/components/ui/Toggle'
import type { DailyReportEntry, ActivityType } from '@/db/schema'

const OT_THRESHOLD = 8

interface CrewEntryRowProps {
  entry: DailyReportEntry
  activities: ActivityType[]
  onChange: (entry: DailyReportEntry) => void
}

export function CrewEntryRow({ entry, activities, onChange }: CrewEntryRowProps) {
  const otEnabled = entry.hours_overtime > 0 || entry.hours_regular > OT_THRESHOLD

  const handleActivityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = activities.find(a => a.id === e.target.value)
      onChange({
        ...entry,
        activity_type_id: e.target.value,
        activity_name: selected?.name ?? '',
      })
    },
    [entry, activities, onChange],
  )

  const handleRegularHoursChange = useCallback(
    (val: number) => {
      let newOt = entry.hours_overtime
      if (val <= OT_THRESHOLD) {
        newOt = 0
      } else if (entry.hours_overtime === 0) {
        // Auto-calculate OT when crossing threshold for the first time
        newOt = Math.round((val - OT_THRESHOLD) * 10) / 10
      }
      onChange({ ...entry, hours_regular: val, hours_overtime: newOt })
    },
    [entry, onChange],
  )

  const handleOtToggle = useCallback(
    (on: boolean) => {
      onChange({ ...entry, hours_overtime: on ? (entry.hours_overtime || 0.5) : 0 })
    },
    [entry, onChange],
  )

  const handleOtHoursChange = useCallback(
    (val: number) => {
      onChange({ ...entry, hours_overtime: val })
    },
    [entry, onChange],
  )

  return (
    <div className="flex flex-col gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Row 1: Name + Activity */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-28">
          <p className="text-sm font-semibold text-gray-900 truncate">{entry.crew_member_name}</p>
        </div>

        {/* Activity dropdown */}
        <div className="flex-1 min-w-0">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No activities</p>
          ) : (
            <select
              value={entry.activity_type_id}
              onChange={handleActivityChange}
              className={[
                'w-full min-h-[48px] px-3 py-2',
                'rounded-xl border border-gray-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:border-forest-light focus:ring-2 focus:ring-forest-light/30',
                'transition-all duration-150',
              ].join(' ')}
              aria-label={`Activity for ${entry.crew_member_name}`}
            >
              <option value="">Select activity…</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Row 2: Hours + OT toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Regular hours stepper — compact inline version */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 w-10">Reg.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRegularHoursChange(Math.max(0, Math.round((entry.hours_regular - 0.5) * 10) / 10))}
              disabled={entry.hours_regular <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-forest text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Decrease regular hours"
            >
              −
            </button>
            <span className="w-12 text-center text-base font-bold text-forest tabular-nums">
              {Number.isInteger(entry.hours_regular) ? entry.hours_regular : entry.hours_regular.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => handleRegularHoursChange(Math.min(24, Math.round((entry.hours_regular + 0.5) * 10) / 10))}
              disabled={entry.hours_regular >= 24}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-forest text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Increase regular hours"
            >
              +
            </button>
          </div>
          <span className="text-xs text-gray-400">hrs</span>
        </div>

        {/* OT toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs font-semibold text-gray-500">OT</span>
          <Toggle
            checked={otEnabled}
            onChange={handleOtToggle}
            size="sm"
          />
        </div>
      </div>

      {/* Row 3: OT hours stepper (shown when OT is on) */}
      {otEnabled && (
        <div className="flex items-center gap-2 pl-12">
          <span className="text-xs font-semibold text-gray-500 w-10">OT hrs</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOtHoursChange(Math.max(0, Math.round((entry.hours_overtime - 0.5) * 10) / 10))}
              disabled={entry.hours_overtime <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-timber text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Decrease overtime hours"
            >
              −
            </button>
            <span className="w-12 text-center text-base font-bold text-timber tabular-nums">
              {Number.isInteger(entry.hours_overtime) ? entry.hours_overtime : entry.hours_overtime.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => handleOtHoursChange(Math.min(24, Math.round((entry.hours_overtime + 0.5) * 10) / 10))}
              disabled={entry.hours_overtime >= 24}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-timber text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Increase overtime hours"
            >
              +
            </button>
          </div>
          <span className="text-xs text-gray-400">hrs</span>
        </div>
      )}

    </div>
  )
}
