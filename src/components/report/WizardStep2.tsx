import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { CrewChip } from './CrewChip'
import { CrewEntryRow } from './CrewEntryRow'
import { useCrewDefaults } from '@/hooks/useCrewDefaults'
import { db } from '@/db/schema'
import type { DailyReportEntry, CrewMember, ActivityType } from '@/db/schema'

interface WizardStep2Props {
  entries: DailyReportEntry[]
  siteId: string
  onChange: (entries: DailyReportEntry[]) => void
  onNext: () => void
  onBack: () => void
}

function buildEntry(member: CrewMember, activities: ActivityType[]): DailyReportEntry {
  const defaultActivity = member.default_activity_id
    ? activities.find(a => a.id === member.default_activity_id)
    : activities[0]

  return {
    id: crypto.randomUUID(),
    crew_member_id: member.id,
    crew_member_name: member.name,
    activity_type_id: defaultActivity?.id ?? '',
    activity_name: defaultActivity?.name ?? '',
    hours_regular: 8,
    hours_overtime: 0,
    notes: '',
  }
}

export function WizardStep2({ entries, siteId: _siteId, onChange, onNext, onBack }: WizardStep2Props) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [allCrew, setAllCrew] = useState<CrewMember[]>([])
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [search, setSearch] = useState('')
  const [crewError, setCrewError] = useState('')
  const { defaults } = useCrewDefaults()

  useEffect(() => {
    Promise.all([
      db.crew_members.filter(m => m.is_active).toArray(),
      db.activity_types.filter(a => a.is_active).sortBy('sort_order'),
    ]).then(([crew, acts]) => {
      setAllCrew(crew)
      setActivities(acts)
    }).catch(console.error)
  }, [])

  const selectedIds = useMemo(() => new Set(entries.map(e => e.crew_member_id)), [entries])

  const filteredCrew = useMemo(() => {
    if (!search.trim()) return allCrew
    const q = search.toLowerCase()
    return allCrew.filter(m => m.name.toLowerCase().includes(q) || m.role_label.toLowerCase().includes(q))
  }, [allCrew, search])

  const handleToggle = useCallback((memberId: string) => {
    setCrewError('')
    const member = allCrew.find(m => m.id === memberId)
    if (!member) return

    if (selectedIds.has(memberId)) {
      // Deselect
      onChange(entries.filter(e => e.crew_member_id !== memberId))
    } else {
      // Select — add new entry
      onChange([...entries, buildEntry(member, activities)])
    }
  }, [allCrew, activities, entries, selectedIds, onChange])

  const handleApplyYesterdayCrew = useCallback(() => {
    if (!defaults) return
    setCrewError('')

    // Build entries for all crew members from yesterday that still exist in active crew
    const newEntries: DailyReportEntry[] = []
    for (const defaultEntry of defaults.entries) {
      const member = allCrew.find(m => m.id === defaultEntry.crew_member_id)
      if (!member) continue
      // Keep activity from yesterday, reset hours
      const act = activities.find(a => a.id === defaultEntry.activity_type_id)
      newEntries.push({
        id: crypto.randomUUID(),
        crew_member_id: member.id,
        crew_member_name: member.name,
        activity_type_id: defaultEntry.activity_type_id,
        activity_name: act?.name ?? defaultEntry.activity_name,
        hours_regular: 8,
        hours_overtime: 0,
        notes: '',
      })
    }
    onChange(newEntries)
  }, [defaults, allCrew, activities, onChange])

  const handleEntryChange = useCallback((updated: DailyReportEntry) => {
    onChange(entries.map(e => e.id === updated.id ? updated : e))
  }, [entries, onChange])

  function handleNext() {
    if (entries.length === 0) {
      setCrewError('Select at least one crew member to continue.')
      return
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Yesterday crew shortcut */}
      {defaults && defaults.entries.length > 0 && (
        <button
          type="button"
          onClick={handleApplyYesterdayCrew}
          className={[
            'flex items-center gap-3 w-full',
            'min-h-[56px] px-4 py-3',
            'rounded-xl border-2',
            'transition-all duration-150 active:scale-[0.98]',
            'bg-forest/5 border-forest/30 hover:bg-forest/10 hover:border-forest',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
          ].join(' ')}
        >
          <span className="text-2xl" aria-hidden="true">⚡</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-forest">Same Crew as Yesterday</p>
            <p className="text-xs text-gray-600">{defaults.entries.length} crew members from last report</p>
          </div>
        </button>
      )}

      {/* Search */}
      <Input
        label="Search Crew"
        placeholder="Search by name or role…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Crew selection grid */}
      <Card variant="solid" padding="sm">
        <p className="text-sm font-semibold text-forest mb-3 px-1">
          Select Crew Members
          {entries.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({entries.length} selected)
            </span>
          )}
        </p>
        {crewError && (
          <p className="text-xs font-medium text-danger px-1 mb-2">{crewError}</p>
        )}
        {filteredCrew.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {search ? 'No crew found matching your search.' : 'No active crew members found.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredCrew.map(member => (
              <CrewChip
                key={member.id}
                member={member}
                selected={selectedIds.has(member.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Hours/Activity editing for selected crew */}
      {entries.length > 0 && (
        <Card variant="solid" padding="md">
          <p className="text-sm font-semibold text-forest mb-2">Hours & Activities</p>
          {entries.map(entry => (
            <CrewEntryRow
              key={entry.id}
              entry={entry}
              activities={activities}
              onChange={handleEntryChange}
            />
          ))}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="ghost" size="lg" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={handleNext} className="flex-1">
          Next: Photos
        </Button>
      </div>
    </div>
  )
}
