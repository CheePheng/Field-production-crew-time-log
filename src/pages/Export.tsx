import { useCallback, useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/schema'
import { exportReportsToCSV, downloadCSV } from '@/utils/exportCsv'
import { getTodayDate, getDateDaysAgo, getMonthStart } from '@/utils/dateHelpers'
import type { DailyReport, CrewMember, Site } from '@/db/schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalEntries(reports: DailyReport[]): number {
  return reports.reduce((s, r) => s + r.entries.length, 0)
}

function totalHours(reports: DailyReport[]): number {
  return reports.reduce(
    (s, r) => s + r.entries.reduce((es, e) => es + e.hours_regular + e.hours_overtime, 0),
    0,
  )
}

// ─── Preset chip ─────────────────────────────────────────────────────────────

interface PresetChipProps {
  label: string
  active: boolean
  onClick: () => void
}

function PresetChip({ label, active, onClick }: PresetChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[40px]',
        active
          ? 'bg-forest text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-forest/40',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// ─── Active preset detection ──────────────────────────────────────────────────

type Preset = 'today' | 'week' | 'month' | 'all' | 'custom'

function detectPreset(from: string, to: string): Preset {
  const today = getTodayDate()
  if (from === today && to === today) return 'today'
  if (from === getDateDaysAgo(6) && to === today) return 'week'
  if (from === getMonthStart() && to === today) return 'month'
  return 'custom'
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Export() {
  const today = getTodayDate()
  const { showToast } = useToast()

  const [fromDate, setFromDate] = useState(getDateDaysAgo(6))
  const [toDate, setToDate] = useState(today)

  const [reports, setReports] = useState<DailyReport[]>([])
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [sites, setSites] = useState<Map<string, Site>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isCsvExporting, setIsCsvExporting] = useState(false)
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const firstEmit = useRef(true)

  // Live query for reports in range
  useEffect(() => {
    firstEmit.current = true
    setIsLoading(true)

    const sub = liveQuery(async () => {
      const [rows, allCrew, allSites] = await Promise.all([
        db.daily_reports.where('date').between(fromDate, toDate, true, true).toArray(),
        db.crew_members.toArray(),
        db.sites.toArray(),
      ])
      const siteMap = new Map<string, Site>(allSites.map(s => [s.id, s]))
      return { rows, allCrew, siteMap }
    }).subscribe({
      next: ({ rows, allCrew, siteMap }) => {
        setReports(rows)
        setCrewMembers(allCrew)
        setSites(siteMap)
        if (firstEmit.current) {
          setIsLoading(false)
          firstEmit.current = false
        }
      },
      error: (err) => {
        console.error('Export liveQuery error:', err)
        setIsLoading(false)
      },
    })

    return () => sub.unsubscribe()
  }, [fromDate, toDate])

  // Presets
  const activePreset: Preset = fromDate === '' && toDate === '' ? 'all' : detectPreset(fromDate, toDate)

  const applyPreset = useCallback((preset: Preset) => {
    const t = getTodayDate()
    switch (preset) {
      case 'today':
        setFromDate(t)
        setToDate(t)
        break
      case 'week':
        setFromDate(getDateDaysAgo(6))
        setToDate(t)
        break
      case 'month':
        setFromDate(getMonthStart())
        setToDate(t)
        break
      case 'all':
        setFromDate('2000-01-01')
        setToDate(t)
        break
    }
  }, [])

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(async () => {
    if (reports.length === 0) {
      showToast('No reports in the selected range.', 'warning')
      return
    }
    setIsCsvExporting(true)
    try {
      // Resolve site names into CSV: build reports with site name substituted
      // We pass sites so we can resolve site names inline
      const reportsWithSiteNames = reports.map(r => {
        const site = sites.get(r.site_id)
        return { ...r, site_id: site?.name ?? r.site_id }
      })
      const csv = exportReportsToCSV(reportsWithSiteNames, crewMembers)
      const filename = `fieldlog-payroll-${fromDate}-to-${toDate}`
      downloadCSV(csv, filename)
      showToast('CSV downloaded successfully.', 'success')
    } catch (err) {
      console.error('CSV export error:', err)
      showToast('CSV export failed. Please try again.', 'error')
    } finally {
      setIsCsvExporting(false)
    }
  }, [reports, crewMembers, sites, fromDate, toDate, showToast])

  // ── PDF export ──────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (reports.length === 0) {
      showToast('No reports in the selected range.', 'warning')
      return
    }
    setIsPdfExporting(true)
    try {
      const { exportReportToPDF } = await import('@/utils/exportPdf')
      const submitted = reports.filter(r => r.status === 'submitted' || r.status === 'synced')
      if (submitted.length === 0) {
        showToast('No submitted reports to export as PDF.', 'warning')
        return
      }
      // Export one PDF per submitted report
      for (const report of submitted) {
        const site = sites.get(report.site_id)
        if (!site) continue
        await exportReportToPDF(report, site, crewMembers)
      }
      showToast(
        submitted.length === 1
          ? 'PDF downloaded.'
          : `${submitted.length} PDFs downloaded.`,
        'success',
      )
    } catch (err) {
      console.error('PDF export error:', err)
      showToast('PDF export failed. Please try again.', 'error')
    } finally {
      setIsPdfExporting(false)
    }
  }, [reports, crewMembers, sites, showToast])

  // ── Summary stats ───────────────────────────────────────────────────────────
  const numReports = reports.length
  const numEntries = totalEntries(reports)
  const numHours = totalHours(reports)
  const submittedCount = reports.filter(r => r.status !== 'draft').length

  return (
    <>
      <PageHeader title="Export" subtitle="Download reports" />

      <main className="p-5 pb-24 max-w-lg mx-auto">
        {/* Date range */}
        <Card variant="solid" padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Date Range</h2>

          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            <PresetChip
              label="Today"
              active={activePreset === 'today'}
              onClick={() => applyPreset('today')}
            />
            <PresetChip
              label="This Week"
              active={activePreset === 'week'}
              onClick={() => applyPreset('week')}
            />
            <PresetChip
              label="This Month"
              active={activePreset === 'month'}
              onClick={() => applyPreset('month')}
            />
            <PresetChip
              label="All"
              active={activePreset === 'all'}
              onClick={() => applyPreset('all')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="From"
              type="date"
              value={fromDate}
              max={toDate || today}
              onChange={e => setFromDate(e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </Card>

        {/* Preview */}
        <Card variant="solid" padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Preview</h2>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-forest">{numReports}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">Total Reports</p>
                <p className="text-xs text-gray-400">{submittedCount} submitted</p>
              </div>
              <div className="bg-surface rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-forest">{numEntries}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">Crew Entries</p>
                <p className="text-xs text-gray-400">across all reports</p>
              </div>
              <div className="col-span-2 bg-surface rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-forest">{numHours.toFixed(1)}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">Total Hours</p>
                <p className="text-xs text-gray-400">regular + overtime</p>
              </div>
            </div>
          )}
        </Card>

        {/* Export buttons */}
        <Card variant="solid" padding="md">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Download</h2>
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={isCsvExporting}
              disabled={isLoading || numReports === 0}
              onClick={handleExportCSV}
            >
              {isCsvExporting ? 'Generating CSV…' : 'Export CSV (Payroll)'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              loading={isPdfExporting}
              disabled={isLoading || submittedCount === 0}
              onClick={handleExportPDF}
            >
              {isPdfExporting ? 'Generating PDF…' : `Export PDF${submittedCount > 1 ? ` (${submittedCount} reports)` : ''}`}
            </Button>
          </div>
          {numReports === 0 && !isLoading && (
            <div className="flex flex-col items-center py-6 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m0 0 2.25 2.25M9.75 15l2.25-2.25M13.5 2.25H6.375c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V7.5L13.5 2.25Z" />
                </svg>
              </div>
              <p className="font-medium text-gray-500">No reports found</p>
              <p className="text-xs mt-1">Try adjusting the date range</p>
            </div>
          )}
          {numReports > 0 && submittedCount === 0 && !isLoading && (
            <p className="text-xs text-amber-600 text-center mt-2">
              PDF export requires at least one submitted report.
            </p>
          )}
        </Card>
      </main>
    </>
  )
}
