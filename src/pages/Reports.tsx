import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { db } from '@/db/schema'
import { getTodayDate, getDateDaysAgo } from '@/utils/dateHelpers'
import type { DailyReport, Site } from '@/db/schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalHours(r: DailyReport): number {
  return r.entries.reduce((s, e) => s + e.hours_regular + e.hours_overtime, 0)
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'draft' | 'submitted'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
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

// ─── Report Card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: DailyReport
  site: Site | undefined
}

function ReportCard({ report, site }: ReportCardProps) {
  const navigate = useNavigate()
  const hrs = totalHours(report)

  return (
    <button
      type="button"
      onClick={() => navigate(`/report/${report.id}`)}
      className="w-full text-left block"
    >
      <Card variant="solid" padding="sm" className="hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-bold text-gray-900">
                {new Date(report.date + 'T00:00:00').toLocaleDateString('en-MY', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
              <StatusBadge status={report.status} />
            </div>
            {site ? (
              <p className="text-sm text-gray-600 truncate">{site.name}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Unknown site</p>
            )}
            <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
              <span>{report.entries.length} crew</span>
              <span>{hrs.toFixed(1)} hours</span>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4 text-gray-300 shrink-0 mt-1" aria-hidden="true">
            <path fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd" />
          </svg>
        </div>
      </Card>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Reports() {
  const today = getTodayDate()
  const defaultFrom = getDateDaysAgo(7)

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(today)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [allReports, setAllReports] = useState<DailyReport[]>([])
  const [sites, setSites] = useState<Map<string, Site>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const firstEmit = useRef(true)

  // Reactive query: fetch reports in date range, filter by status in memory
  useEffect(() => {
    firstEmit.current = true
    setIsLoading(true) // eslint-disable-line react-hooks/set-state-in-effect -- resetting before liveQuery subscription

    const sub = liveQuery(async () => {
      const [reports, allSites] = await Promise.all([
        db.daily_reports.where('date').between(fromDate, toDate, true, true).toArray(),
        db.sites.toArray(),
      ])
      const siteMap = new Map<string, Site>(allSites.map(s => [s.id, s]))
      return { reports, siteMap }
    }).subscribe({
      next: ({ reports, siteMap }) => {
        setAllReports(reports)
        setSites(siteMap)
        if (firstEmit.current) {
          setIsLoading(false)
          firstEmit.current = false
        }
      },
      error: (err) => {
        console.error('Reports liveQuery error:', err)
        setIsLoading(false)
      },
    })

    return () => sub.unsubscribe()
  }, [fromDate, toDate])

  // Apply status filter and sort descending
  const filtered = allReports
    .filter(r => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'submitted') return r.status === 'submitted' || r.status === 'synced'
      return r.status === statusFilter
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader title="Reports" subtitle="Past submissions" />

      <main className="p-5 pb-24 max-w-lg mx-auto">
        {/* Filters */}
        <Card variant="solid" padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Filter</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              label="From"
              type="date"
              value={fromDate}
              max={toDate}
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
          <div className="flex gap-2 flex-wrap">
            <FilterChip
              label="All"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              label="Draft"
              active={statusFilter === 'draft'}
              onClick={() => setStatusFilter('draft')}
            />
            <FilterChip
              label="Submitted"
              active={statusFilter === 'submitted'}
              onClick={() => setStatusFilter('submitted')}
            />
          </div>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className="w-7 h-7 text-gray-400" aria-hidden="true">
                <path fillRule="evenodd"
                  d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875z"
                  clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-600">No reports found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting the date range or filter.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {filtered.length} {filtered.length === 1 ? 'report' : 'reports'} found
            </p>
            {filtered.map(r => (
              <ReportCard key={r.id} report={r} site={sites.get(r.site_id)} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
