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
import type { Site } from '@/db/schema'

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  location_label: string
  gps_lat: string
  gps_lng: string
  is_active: boolean
}

const emptyForm: FormState = {
  name: '',
  location_label: '',
  gps_lat: '',
  gps_lng: '',
  is_active: true,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sites() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [sites, setSites] = useState<Site[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Site | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Reactive list
  useEffect(() => {
    const sub = liveQuery(() => db.sites.orderBy('name').toArray()).subscribe({
      next: setSites,
      error: (e) => showToast('Failed to load sites: ' + String(e), 'error'),
    })
    return () => sub.unsubscribe()
  }, [showToast])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setSheetOpen(true)
  }

  function openEdit(site: Site) {
    setEditing(site)
    setForm({
      name: site.name,
      location_label: site.location_label,
      gps_lat: site.gps_lat !== null ? String(site.gps_lat) : '',
      gps_lng: site.gps_lng !== null ? String(site.gps_lng) : '',
      is_active: site.is_active,
    })
    setErrors({})
    setSheetOpen(true)
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = 'Site name is required'
    if (!form.location_label.trim()) e.location_label = 'Location label is required'
    if (form.gps_lat) {
      const lat = parseFloat(form.gps_lat)
      if (isNaN(lat)) {
        e.gps_lat = 'Invalid latitude'
      } else if (lat < -90 || lat > 90) {
        e.gps_lat = 'Latitude must be between -90 and 90'
      }
    }
    if (form.gps_lng) {
      const lng = parseFloat(form.gps_lng)
      if (isNaN(lng)) {
        e.gps_lng = 'Invalid longitude'
      } else if (lng < -180 || lng > 180) {
        e.gps_lng = 'Longitude must be between -180 and 180'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function captureGps() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          gps_lat: pos.coords.latitude.toFixed(6),
          gps_lng: pos.coords.longitude.toFixed(6),
        }))
        showToast('Location captured', 'success')
        setGpsLoading(false)
      },
      err => {
        showToast('Could not get location: ' + err.message, 'error')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const lat = form.gps_lat ? parseFloat(form.gps_lat) : null
      const lng = form.gps_lng ? parseFloat(form.gps_lng) : null

      if (editing) {
        await db.sites.update(editing.id, {
          name: form.name.trim(),
          location_label: form.location_label.trim(),
          gps_lat: lat,
          gps_lng: lng,
          is_active: form.is_active,
        })
        showToast('Site updated', 'success')
      } else {
        await db.sites.add({
          id: crypto.randomUUID(),
          name: form.name.trim(),
          location_label: form.location_label.trim(),
          gps_lat: lat,
          gps_lng: lng,
          is_active: form.is_active,
          created_at: now,
        })
        showToast('Site added', 'success')
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
        title="Sites"
        subtitle={`${sites.filter(s => s.is_active).length} active sites`}
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
          {sites.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              No sites yet. Add your first site below.
            </p>
          )}
          {sites.map(site => (
            <button
              key={site.id}
              type="button"
              onClick={() => openEdit(site)}
              className="w-full text-left"
            >
              <Card variant="glass" padding="sm" className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        site.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      aria-label={site.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-forest truncate">{site.name}</p>
                    <p className="text-sm text-gray-600">{site.location_label}</p>
                    {(site.gps_lat !== null && site.gps_lng !== null) && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {site.gps_lat.toFixed(5)}, {site.gps_lng.toFixed(5)}
                      </p>
                    )}
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
        aria-label="Add site"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Add / Edit Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Site' : 'Add Site'}
      >
        <div className="flex flex-col gap-4 pb-6">
          <Input
            label="Site Name *"
            placeholder="e.g. Ladang Maju Jaya"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
          />

          <Input
            label="Location Label *"
            placeholder="e.g. Compartment 12, Block A"
            value={form.location_label}
            onChange={e => setForm(f => ({ ...f, location_label: e.target.value }))}
            error={errors.location_label}
          />

          {/* GPS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-forest">GPS Coordinates</span>
              <button
                type="button"
                onClick={captureGps}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-forest border border-forest rounded-lg px-3 py-1.5 min-h-[36px] hover:bg-forest/5 disabled:opacity-50 transition-colors"
              >
                {gpsLoading ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                )}
                Capture Location
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude"
                placeholder="3.140853"
                value={form.gps_lat}
                onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value }))}
                error={errors.gps_lat}
              />
              <Input
                label="Longitude"
                placeholder="101.686855"
                value={form.gps_lng}
                onChange={e => setForm(f => ({ ...f, gps_lng: e.target.value }))}
                error={errors.gps_lng}
              />
            </div>
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
              {editing ? 'Save Changes' : 'Add Site'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
