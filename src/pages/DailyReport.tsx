import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useReport } from '@/hooks/useReport'
import { useCrewDefaults } from '@/hooks/useCrewDefaults'
import { useToast } from '@/components/ui/Toast'
import { getCurrentUser } from '@/utils/auth'
import { db } from '@/db/schema'
import { WizardStep1 } from '@/components/report/WizardStep1'
import { WizardStep2 } from '@/components/report/WizardStep2'
import { WizardStep3 } from '@/components/report/WizardStep3'
import type { DailyReportEntry, ReportPhoto } from '@/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportFormData {
  date: string
  siteId: string
  entries: DailyReportEntry[]
  photos: ReportPhoto[]
  notes: string
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Progress indicator ───────────────────────────────────────────────────────

interface StepProgressProps {
  current: number
  total: number
}

function StepProgress({ current, total }: StepProgressProps) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 bg-white/80 border-b border-gray-100">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isCompleted = step < current
        const isCurrent = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                'transition-all duration-200',
                isCompleted
                  ? 'bg-forest text-white'
                  : isCurrent
                  ? 'bg-forest-light text-white ring-2 ring-forest-light/40'
                  : 'bg-gray-100 text-gray-400',
              ].join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : step}
            </div>
            {step < total && (
              <div
                className={[
                  'h-0.5 flex-1 min-w-[24px] rounded transition-all duration-300',
                  isCompleted ? 'bg-forest' : 'bg-gray-200',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
      <p className="ml-auto text-xs font-semibold text-gray-500">
        Step {current} of {total}
      </p>
    </div>
  )
}

// ─── Duplicate warning dialog ────────────────────────────────────────────────

interface DuplicateDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DuplicateDialog({ isOpen, onConfirm, onCancel }: DuplicateDialogProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-base font-bold text-gray-900 mb-2">Duplicate Report?</h3>
        <p className="text-sm text-gray-600 mb-5">
          A report for this date and site already exists. Do you want to submit anyway?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-[48px] rounded-xl bg-forest text-white text-sm font-semibold hover:bg-[#0a3d21] transition-colors"
          >
            Submit Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyReport() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { createReport, updateReport, submitReport, getReport } = useReport()
  const { defaults } = useCrewDefaults()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const pendingSubmitRef = useRef(false)

  // Refs to hold latest values for the unmount cleanup
  const formDataRef = useRef<ReportFormData>({
    date: getTodayDate(),
    siteId: '',
    entries: [],
    photos: [],
    notes: '',
  })
  const editingReportIdRef = useRef<string | null>(null)
  const isSubmittingRef = useRef(false)

  const [formData, setFormData] = useState<ReportFormData>({
    date: getTodayDate(),
    siteId: '',
    entries: [],
    photos: [],
    notes: '',
  })

  // On mount: load existing report (edit mode) or apply defaults (new mode)
  useEffect(() => {
    if (id) {
      // Edit mode — load the existing report
      getReport(id).then(report => {
        if (!report) return
        setEditingReportId(report.id)
        setFormData({
          date: report.date,
          siteId: report.site_id,
          entries: report.entries,
          photos: report.photos,
          notes: report.notes,
        })
      }).catch(console.error)
    } else {
      // New mode — pre-fill site from defaults if available
      if (defaults?.siteId) {
        setFormData(prev => ({
          ...prev,
          siteId: defaults.siteId,
        }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, defaults])

  // Keep refs in sync with latest state so the unmount cleanup can read them
  useEffect(() => { formDataRef.current = formData }, [formData])
  useEffect(() => { editingReportIdRef.current = editingReportId }, [editingReportId])
  useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])

  // Auto-save draft on beforeunload (desktop only).
  // NOTE: On mobile browsers, async IndexedDB writes triggered here will NOT
  // complete before the page tears down — the Promise is abandoned. The real
  // protection for unsaved data on mobile is the useEffect unmount cleanup
  // below, which fires synchronously on SPA navigation before the component
  // is destroyed. This handler is kept for best-effort desktop support.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!editingReportId && formData.siteId && formData.entries.length > 0) {
        const user = getCurrentUser()
        const now = new Date().toISOString()
        const draftId = crypto.randomUUID()
        // Fire-and-forget draft save (best effort, synchronous storage not possible here)
        db.daily_reports.add({
          id: draftId,
          date: formData.date,
          site_id: formData.siteId,
          submitted_by: user?.id ?? 'unknown',
          status: 'draft',
          notes: formData.notes,
          created_at: now,
          updated_at: now,
          submitted_at: null,
          synced_at: null,
          entries: formData.entries,
          photos: formData.photos,
        }).catch(() => {/* ignore */})
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [editingReportId, formData])

  // Auto-save draft on SPA navigation (component unmount via React Router)
  useEffect(() => {
    return () => {
      const data = formDataRef.current
      const reportId = editingReportIdRef.current
      const submitting = isSubmittingRef.current

      // Skip if already submitting (doSubmit handles persistence) or no meaningful data
      if (submitting) return
      if (!data.siteId && data.entries.length === 0) return

      const user = getCurrentUser()
      const now = new Date().toISOString()

      if (reportId) {
        // Update existing draft record — but skip if it has already been
        // submitted or synced to avoid reverting a completed report to draft.
        db.daily_reports.get(reportId).then(existing => {
          if (!existing) return
          if (existing.status === 'submitted' || existing.status === 'synced') return
          return db.daily_reports.update(reportId, {
            date: data.date,
            site_id: data.siteId,
            notes: data.notes,
            entries: data.entries,
            photos: data.photos,
            status: 'draft',
            updated_at: now,
          })
        }).catch(() => {/* ignore */})
      } else if (data.siteId && data.entries.length > 0) {
        // Create a new draft record
        const draftId = crypto.randomUUID()
        db.daily_reports.add({
          id: draftId,
          date: data.date,
          site_id: data.siteId,
          submitted_by: user?.id ?? 'unknown',
          status: 'draft',
          notes: data.notes,
          created_at: now,
          updated_at: now,
          submitted_at: null,
          synced_at: null,
          entries: data.entries,
          photos: data.photos,
        }).catch(() => {/* ignore */})
      }
    }
  }, []) // empty deps — runs cleanup only on unmount, reads latest values via refs

  const handleStep1Change = useCallback((data: { date: string; siteId: string }) => {
    setFormData(prev => ({ ...prev, ...data }))
  }, [])

  const handleStep2Change = useCallback((entries: DailyReportEntry[]) => {
    setFormData(prev => ({ ...prev, entries }))
  }, [])

  const handlePhotosChange = useCallback((photos: ReportPhoto[]) => {
    setFormData(prev => ({ ...prev, photos }))
  }, [])

  const handleNotesChange = useCallback((notes: string) => {
    setFormData(prev => ({ ...prev, notes }))
  }, [])

  const doSubmit = useCallback(async () => {
    const user = getCurrentUser()
    if (!user) {
      showToast('You must be logged in to submit a report.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      let reportId: string

      if (editingReportId) {
        // Update existing report, revert to draft so it re-submits
        await updateReport(editingReportId, {
          date: formData.date,
          site_id: formData.siteId,
          entries: formData.entries,
          photos: formData.photos,
          notes: formData.notes,
          status: 'draft',
          submitted_at: null,
        })
        reportId = editingReportId
      } else {
        reportId = await createReport({
          date: formData.date,
          site_id: formData.siteId,
          submitted_by: user.id,
          status: 'draft',
          notes: formData.notes,
          submitted_at: null,
          synced_at: null,
          entries: formData.entries,
          photos: formData.photos,
        })
      }

      await submitReport(reportId)
      showToast('Report saved locally \u2713', 'success')
      navigate('/')
    } catch (err) {
      console.error('Submit error:', err)
      showToast('Failed to save report. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [editingReportId, formData, createReport, updateReport, submitReport, showToast, navigate])

  const handleSubmit = useCallback(async () => {
    if (pendingSubmitRef.current) return
    pendingSubmitRef.current = true

    try {
      // Duplicate check (only for new reports)
      if (!editingReportId) {
        const existing = await db.daily_reports
          .where('[date+site_id]')
          .equals([formData.date, formData.siteId])
          .filter(r => r.status !== 'draft')
          .count()

        if (existing > 0) {
          setShowDuplicateDialog(true)
          return
        }
      }

      await doSubmit()
    } finally {
      pendingSubmitRef.current = false
    }
  }, [editingReportId, formData.date, formData.siteId, doSubmit])

  const handleDuplicateConfirm = useCallback(async () => {
    setShowDuplicateDialog(false)
    await doSubmit()
  }, [doSubmit])

  const stepLabels = ['Site & Date', 'Crew & Hours', 'Photos & Submit']
  const pageTitle = id ? 'Edit Report' : 'New Report'
  const pageSubtitle = stepLabels[step - 1]

  return (
    <>
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />
      <StepProgress current={step} total={3} />

      <main className="p-5 pb-32 max-w-lg mx-auto">
        {step === 1 && (
          <WizardStep1
            data={{ date: formData.date, siteId: formData.siteId }}
            onChange={handleStep1Change}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <WizardStep2
            entries={formData.entries}
            siteId={formData.siteId}
            onChange={handleStep2Change}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <WizardStep3
            photos={formData.photos}
            onPhotosChange={handlePhotosChange}
            notes={formData.notes}
            onNotesChange={handleNotesChange}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            isSubmitting={isSubmitting}
          />
        )}
      </main>

      <DuplicateDialog
        isOpen={showDuplicateDialog}
        onConfirm={handleDuplicateConfirm}
        onCancel={() => setShowDuplicateDialog(false)}
      />
    </>
  )
}
