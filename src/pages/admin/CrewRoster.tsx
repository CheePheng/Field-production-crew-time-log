import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/schema'
import type { CrewMember, ActivityType } from '@/db/schema'

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  ic_number: string
  role_label: string
  default_activity_id: string
  is_active: boolean
}

const emptyForm: FormState = {
  name: '',
  ic_number: '',
  role_label: '',
  default_activity_id: '',
  is_active: true,
}

const ROLE_SUGGESTIONS = [
  'Chainsaw Operator',
  'Loader Driver',
  'Crane Operator',
  'Tractor Driver',
  'Field Supervisor',
  'General Worker',
  'Safety Officer',
  'Mechanic',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function CrewRoster() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [crew, setCrew] = useState<CrewMember[]>([])
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CrewMember | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Reactive list
  useEffect(() => {
    const sub = liveQuery(() => db.crew_members.orderBy('name').toArray()).subscribe({
      next: setCrew,
      error: (e) => showToast('Failed to load crew: ' + String(e), 'error'),
    })
    return () => sub.unsubscribe()
  }, [showToast])

  // Load activity types for dropdown
  useEffect(() => {
    const sub = liveQuery(() =>
      db.activity_types.where('is_active').equals(1).sortBy('sort_order')
    ).subscribe({
      next: setActivities,
      error: () => {},
    })
    return () => sub.unsubscribe()
  }, [])

  // Filter crew
  const filtered = crew.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.ic_number.toLowerCase().includes(q)
  })

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setSheetOpen(true)
  }

  function openEdit(member: CrewMember) {
    setEditing(member)
    setForm({
      name: member.name,
      ic_number: member.ic_number,
      role_label: member.role_label,
      default_activity_id: member.default_activity_id ?? '',
      is_active: member.is_active,
    })
    setErrors({})
    setSheetOpen(true)
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.ic_number.trim()) {
      e.ic_number = 'IC number is required'
    } else if (!/^\d{6}-\d{2}-\d{4}$/.test(form.ic_number.trim()) &&
               !/^\d{12}$/.test(form.ic_number.trim())) {
      e.ic_number = 'Enter a valid Malaysian IC (e.g. 901231-14-5678)'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      // Enforce IC number uniqueness
      const existing = await db.crew_members
        .filter(m => m.ic_number === form.ic_number.trim() && m.id !== (editing?.id ?? ''))
        .first()
      if (existing) {
        setErrors(e => ({ ...e, ic_number: 'IC number already in use' }))
        setSaving(false)
        return
      }

      const now = new Date().toISOString()
      if (editing) {
        await db.crew_members.update(editing.id, {
          name: form.name.trim(),
          ic_number: form.ic_number.trim(),
          role_label: form.role_label.trim(),
          default_activity_id: form.default_activity_id || null,
          is_active: form.is_active,
        })
        showToast('Crew member updated', 'success')
      } else {
        await db.crew_members.add({
          id: crypto.randomUUID(),
          name: form.name.trim(),
          ic_number: form.ic_number.trim(),
          role_label: form.role_label.trim(),
          default_activity_id: form.default_activity_id || null,
          is_active: form.is_active,
          created_at: now,
        })
        showToast('Crew member added', 'success')
      }
      setSheetOpen(false)
    } catch (err) {
      showToast('Save failed: ' + String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Crew Roster"
        subtitle={`${crew.filter(c => c.is_active).length} active members`}
        action={
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Back to settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        }
      />

      <main className="p-4 pb-32 max-w-lg mx-auto">
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by name or IC number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Crew list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-forest" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                  <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-700">
                {search ? 'No crew members match your search' : 'No crew members yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search ? 'Try a different name or IC number' : 'Add your first field worker to get started'}
              </p>
            </div>
          )}
          {filtered.map(member => {
            const activity = activities.find(a => a.id === member.default_activity_id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => openEdit(member)}
                className="w-full text-left"
              >
                <Card variant="glass" padding="sm" className="hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          member.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        aria-label={member.is_active ? 'Active' : 'Inactive'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-forest truncate">{member.name}</p>
                      <p className="text-sm text-gray-500 font-mono">{member.ic_number}</p>
                      {member.role_label && (
                        <p className="text-sm text-gray-600 mt-0.5">{member.role_label}</p>
                      )}
                      {activity && (
                        <p className="text-xs text-timber mt-0.5">Default: {activity.name}</p>
                      )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0 mt-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </main>

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-forest text-white shadow-xl flex items-center justify-center hover:bg-[#0a3d21] active:scale-95 transition-all"
        aria-label="Add crew member"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Add / Edit Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Crew Member' : 'Add Crew Member'}
      >
        <div className="flex flex-col gap-4 pb-6">
          <Input
            label="Full Name *"
            placeholder="e.g. Ahmad bin Ismail"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
          />

          <Input
            label="IC Number *"
            placeholder="901231-14-5678 or 901231145678"
            value={form.ic_number}
            onChange={e => setForm(f => ({ ...f, ic_number: e.target.value }))}
            error={errors.ic_number}
            helper="Malaysian IC — 12 digits with or without dashes"
          />

          {/* Role label with suggestions */}
          <div className="relative">
            <Input
              label="Role / Position"
              placeholder="e.g. Chainsaw Operator"
              value={form.role_label}
              onChange={e => {
                setForm(f => ({ ...f, role_label: e.target.value }))
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto"
              >
                {ROLE_SUGGESTIONS.filter(s =>
                  s.toLowerCase().includes(form.role_label.toLowerCase())
                ).map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => {
                      setForm(f => ({ ...f, role_label: s }))
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Default activity dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-forest">Default Activity</label>
            <select
              value={form.default_activity_id}
              onChange={e => setForm(f => ({ ...f, default_activity_id: e.target.value }))}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:border-forest-light focus:ring-2 focus:ring-forest-light/30 transition-all"
            >
              <option value="">— None —</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Active</span>
            <Toggle
              checked={form.is_active}
              onChange={val => setForm(f => ({ ...f, is_active: val }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSave}
              loading={saving}
            >
              {editing ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
