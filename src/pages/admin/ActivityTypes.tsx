import { useEffect, useState } from 'react'
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
import { getCurrentUser } from '@/utils/auth'
import type { ActivityType } from '@/db/schema'

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  category: string
  sort_order: string
  is_active: boolean
}

const emptyForm: FormState = {
  name: '',
  category: '',
  sort_order: '0',
  is_active: true,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityTypes() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const currentUser = getCurrentUser()
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/')
    }
  }, [currentUser, navigate])

  const [activities, setActivities] = useState<ActivityType[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityType | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  // Reactive list sorted by sort_order
  useEffect(() => {
    const sub = liveQuery(() =>
      db.activity_types.orderBy('sort_order').toArray()
    ).subscribe({
      next: setActivities,
      error: (e) => showToast('Failed to load activity types: ' + String(e), 'error'),
    })
    return () => sub.unsubscribe()
  }, [showToast])

  function openAdd() {
    // Default sort order = max + 10
    const maxOrder = activities.reduce((m, a) => Math.max(m, a.sort_order), 0)
    setEditing(null)
    setForm({ ...emptyForm, sort_order: String(maxOrder + 10) })
    setErrors({})
    setSheetOpen(true)
  }

  function openEdit(activity: ActivityType) {
    setEditing(activity)
    setForm({
      name: activity.name,
      category: activity.category,
      sort_order: String(activity.sort_order),
      is_active: activity.is_active,
    })
    setErrors({})
    setSheetOpen(true)
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = 'Activity name is required'
    const order = parseInt(form.sort_order, 10)
    if (isNaN(order)) e.sort_order = 'Sort order must be a number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const sortOrder = parseInt(form.sort_order, 10)

      if (editing) {
        await db.activity_types.update(editing.id, {
          name: form.name.trim(),
          category: form.category.trim(),
          sort_order: sortOrder,
          is_active: form.is_active,
        })
        showToast('Activity type updated', 'success')
      } else {
        await db.activity_types.add({
          id: crypto.randomUUID(),
          name: form.name.trim(),
          category: form.category.trim(),
          sort_order: sortOrder,
          is_active: form.is_active,
          created_at: now,
        })
        showToast('Activity type added', 'success')
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
        title="Activity Types"
        subtitle={`${activities.filter(a => a.is_active).length} active types`}
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
        <div className="flex flex-col gap-3">
          {activities.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              No activity types yet. Add one below.
            </p>
          )}
          {activities.map((activity, index) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => openEdit(activity)}
              className="w-full text-left"
            >
              <Card variant="glass" padding="sm" className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-mono w-6 text-right">
                      {index + 1}
                    </span>
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        activity.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      aria-label={activity.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-forest truncate">{activity.name}</p>
                    {activity.category && (
                      <p className="text-sm text-gray-600">{activity.category}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Order: {activity.sort_order}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0 mt-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </main>

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-forest text-white shadow-xl flex items-center justify-center hover:bg-[#0a3d21] active:scale-95 transition-all"
        aria-label="Add activity type"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Add / Edit Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Activity Type' : 'Add Activity Type'}
      >
        <div className="flex flex-col gap-4 pb-6">
          <Input
            label="Activity Name *"
            placeholder="e.g. Felling, Skidding, Planting"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
          />

          <Input
            label="Category"
            placeholder="e.g. Harvesting, Maintenance"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          />

          <Input
            label="Sort Order"
            type="number"
            placeholder="10"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            error={errors.sort_order}
            helper="Lower numbers appear first in lists"
          />

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
              {editing ? 'Save Changes' : 'Add Activity'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
