import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/schema'
import { getCurrentUser, logout, hashPin, verifyPin, generateSalt } from '@/utils/auth'
import { exportDatabaseBackup, importDatabaseBackup, downloadBackup } from '@/utils/backup'
import { getTodayDate } from '@/utils/dateHelpers'

// ─── Sunlight mode helpers ─────────────────────────────────────────────────────

const SUNLIGHT_KEY = 'fieldlog_sunlight_mode'

function getSunlightPref(): boolean {
  return localStorage.getItem(SUNLIGHT_KEY) === 'true'
}

function setSunlightPref(val: boolean) {
  localStorage.setItem(SUNLIGHT_KEY, val ? 'true' : 'false')
  if (val) {
    document.documentElement.classList.add('sunlight')
  } else {
    document.documentElement.classList.remove('sunlight')
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2 mt-5 first:mt-0">
      {label}
    </p>
  )
}

// ─── Tappable list row ────────────────────────────────────────────────────────

interface ListRowProps {
  label: string
  sublabel?: string
  onClick?: () => void
  danger?: boolean
  trailing?: React.ReactNode
}

function ListRow({ label, sublabel, onClick, danger, trailing }: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        'flex items-center justify-between w-full',
        'px-1 py-3 min-h-[48px]',
        'border-b border-gray-100 last:border-0',
        onClick ? 'hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg' : '',
        danger ? 'text-red-600' : 'text-gray-800',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-gray-800'}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
        )}
      </div>
      {trailing ?? (
        onClick && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0 ml-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Settings() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentUser = getCurrentUser()

  // Sunlight mode
  const [sunlight, setSunlight] = useState(getSunlightPref)

  // Change PIN sheet
  const [pinSheetOpen, setPinSheetOpen] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinErrors, setPinErrors] = useState<{ old?: string; new?: string; confirm?: string }>({})
  const [savingPin, setSavingPin] = useState(false)

  // Clear data confirm
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [clearing, setClearing] = useState(false)

  // Backup
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  // Apply sunlight on mount (in case it was set in a prior session)
  useEffect(() => {
    if (getSunlightPref()) {
      document.documentElement.classList.add('sunlight')
    }
  }, [])

  function handleSunlightToggle(val: boolean) {
    setSunlight(val)
    setSunlightPref(val)
  }

  function openChangePIN() {
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinErrors({})
    setPinSheetOpen(true)
  }

  async function handleChangePin() {
    const errs: { old?: string; new?: string; confirm?: string } = {}
    if (!oldPin) errs.old = 'Current PIN is required'
    if (!newPin) {
      errs.new = 'New PIN is required'
    } else if (!/^\d{4,8}$/.test(newPin)) {
      errs.new = 'PIN must be 4-8 digits'
    }
    if (!confirmPin) {
      errs.confirm = 'Please confirm your new PIN'
    } else if (newPin !== confirmPin) {
      errs.confirm = 'PINs do not match'
    }
    setPinErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (!currentUser) return
    setSavingPin(true)
    try {
      const user = await db.users.get(currentUser.id)
      if (!user) throw new Error('User not found')

      const valid = await verifyPin(oldPin, user.pin_hash, user.pin_salt)
      if (!valid) {
        setPinErrors({ old: 'Incorrect current PIN' })
        setSavingPin(false)
        return
      }

      const salt = generateSalt()
      const hash = await hashPin(newPin, salt)
      await db.users.update(currentUser.id, {
        pin_hash: hash,
        pin_salt: salt,
        updated_at: new Date().toISOString(),
      })
      showToast('PIN changed successfully', 'success')
      setPinSheetOpen(false)
    } catch (err) {
      showToast('Failed to change PIN: ' + String(err), 'error')
    } finally {
      setSavingPin(false)
    }
  }

  async function handleExportBackup() {
    setExportLoading(true)
    try {
      const json = await exportDatabaseBackup()
      const date = getTodayDate()
      downloadBackup(json, `fieldlog-backup-${date}`)
      showToast('Backup exported', 'success')
    } catch (err) {
      showToast('Export failed: ' + String(err), 'error')
    } finally {
      setExportLoading(false)
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const text = await file.text()
      await importDatabaseBackup(text)
      showToast('Backup imported successfully', 'success')
    } catch (err) {
      showToast('Import failed: ' + String(err), 'error')
    } finally {
      setImportLoading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleClearData() {
    if (clearConfirmText !== 'CLEAR') return
    setClearing(true)
    try {
      await db.transaction('rw', [
        db.sites,
        db.crew_members,
        db.activity_types,
        db.daily_reports,
        db.photo_blobs,
      ], async () => {
        await Promise.all([
          db.sites.clear(),
          db.crew_members.clear(),
          db.activity_types.clear(),
          db.daily_reports.clear(),
          db.photo_blobs.clear(),
        ])
      })
      showToast('All data cleared', 'success')
      setClearConfirmOpen(false)
      setClearConfirmText('')
    } catch (err) {
      showToast('Failed to clear data: ' + String(err), 'error')
    } finally {
      setClearing(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const roleBadgeColor =
    currentUser?.role === 'admin'
      ? 'bg-forest text-white'
      : currentUser?.role === 'supervisor'
      ? 'bg-timber text-white'
      : 'bg-gray-200 text-gray-700'

  return (
    <>
      <PageHeader title="Settings" />

      <main className="p-4 pb-32 max-w-lg mx-auto">

        {/* ── User ── */}
        <SectionLabel label="Account" />
        <Card variant="glass" padding="sm" className="mb-1">
          <div className="px-1 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-forest">{currentUser?.display_name ?? 'Unknown'}</p>
              <p className="text-xs text-gray-500">@{currentUser?.username}</p>
            </div>
            {currentUser?.role && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${roleBadgeColor}`}>
                {currentUser.role}
              </span>
            )}
          </div>
          <div className="border-t border-gray-100">
            <ListRow
              label="Change PIN"
              sublabel="Update your login PIN"
              onClick={openChangePIN}
            />
          </div>
        </Card>

        {/* ── Admin (admin role only) ── */}
        {currentUser?.role === 'admin' && (
          <>
            <SectionLabel label="Administration" />
            <Card variant="glass" padding="sm" className="mb-1">
              <ListRow
                label="Crew Roster"
                sublabel="Manage field workers"
                onClick={() => navigate('/admin/crew')}
              />
              <ListRow
                label="Sites"
                sublabel="Manage work sites and locations"
                onClick={() => navigate('/admin/sites')}
              />
              <ListRow
                label="Activity Types"
                sublabel="Manage work activity categories"
                onClick={() => navigate('/admin/activities')}
              />
            </Card>
          </>
        )}

        {/* ── Display ── */}
        <SectionLabel label="Display" />
        <Card variant="glass" padding="sm" className="mb-1">
          <div className="px-1 py-3 flex items-center justify-between min-h-[48px]">
            <div>
              <p className="text-sm font-semibold text-gray-800">Sunlight Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">High contrast for bright outdoor use</p>
            </div>
            <Toggle
              checked={sunlight}
              onChange={handleSunlightToggle}
            />
          </div>
        </Card>

        {/* ── Data ── */}
        <SectionLabel label="Data" />
        <Card variant="glass" padding="sm" className="mb-1">
          <ListRow
            label="Export Backup"
            sublabel="Download a .json backup of all data"
            onClick={exportLoading ? undefined : handleExportBackup}
            trailing={exportLoading ? (
              <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : undefined}
          />
          <ListRow
            label="Import Backup"
            sublabel="Restore from a .json backup file"
            onClick={importLoading ? undefined : handleImportClick}
            trailing={importLoading ? (
              <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : undefined}
          />
          <ListRow
            label="Clear All Data"
            sublabel="Permanently delete all reports and records"
            onClick={() => { setClearConfirmText(''); setClearConfirmOpen(true) }}
            danger
          />
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        {/* ── About ── */}
        <SectionLabel label="About" />
        <Card variant="glass" padding="sm" className="mb-6">
          <div className="px-1 py-4 text-center">
            <p className="font-bold text-forest text-base">CCT PGL FieldLog</p>
            <p className="text-xs text-gray-500 mt-1">Version 1.0.0 MVP</p>
            <p className="text-xs text-gray-400 mt-1">Offline-first • Made for the field</p>
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="ghost"
          fullWidth
          onClick={handleLogout}
          className="border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100"
        >
          Logout
        </Button>
      </main>

      {/* ── Change PIN sheet ── */}
      <BottomSheet
        isOpen={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        title="Change PIN"
      >
        <div className="flex flex-col gap-4 pb-6">
          <Input
            label="Current PIN"
            type="password"
            inputMode="numeric"
            pattern="\d*"
            placeholder="••••"
            value={oldPin}
            onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
            error={pinErrors.old}
          />
          <Input
            label="New PIN"
            type="password"
            inputMode="numeric"
            pattern="\d*"
            placeholder="••••"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            error={pinErrors.new}
            helper="4-8 digits"
          />
          <Input
            label="Confirm New PIN"
            type="password"
            inputMode="numeric"
            pattern="\d*"
            placeholder="••••"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            error={pinErrors.confirm}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setPinSheetOpen(false)}
              disabled={savingPin}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleChangePin}
              loading={savingPin}
            >
              Update PIN
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Clear data confirm sheet ── */}
      <BottomSheet
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="Clear All Data"
      >
        <div className="flex flex-col gap-4 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700">This action cannot be undone.</p>
            <p className="text-sm text-red-600 mt-1">
              All daily reports, crew members, sites, and activity types will be permanently deleted.
              User accounts are preserved.
            </p>
          </div>
          <Input
            label='Type "CLEAR" to confirm'
            placeholder="CLEAR"
            value={clearConfirmText}
            onChange={e => setClearConfirmText(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setClearConfirmOpen(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleClearData}
              loading={clearing}
              disabled={clearConfirmText !== 'CLEAR'}
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
