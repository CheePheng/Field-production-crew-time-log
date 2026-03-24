import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { db } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { getTodayDate, formatDateDisplay } from '@/utils/dateHelpers'
import type { DailyReport, Site } from '@/db/schema'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStartDate(): string {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().slice(0, 10)
}

function sumHours(reports: DailyReport[]): number {
  return reports.reduce((acc, r) =>
    acc + r.entries.reduce((s, e) => s + e.hours_regular + e.hours_overtime, 0), 0)
}

function totalReportHours(r: DailyReport): number {
  return r.entries.reduce((s, e) => s + e.hours_regular + e.hours_overtime, 0)
}

// ─── Today Card ───────────────────────────────────────────────────────────────

interface TodayCardProps {
  todayReports: DailyReport[]
  sites: Map<string, Site>
  crewActiveCount: number
}

function TodayCard({ todayReports, sites, crewActiveCount }: TodayCardProps) {
  const navigate = useNavigate()
  const submitted = todayReports.find(r => r.status === 'submitted' || r.status === 'synced')
  const draft = todayReports.find(r => r.status === 'draft')

  if (submitted) {
    const site = sites.get(submitted.site_id)
    const totalHours = totalReportHours(submitted)
    return (
      <Card variant="glass" padding="md" className="mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-7 h-7 text-green-600" aria-hidden="true">
              <path fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-green-700">Report Submitted</p>
            {site && <p className="text-sm text-gray-600 mt-0.5 truncate">{site.name}</p>}
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>{submitted.entries.length} crew members</span>
              <span>{totalHours.toFixed(1)} total hours</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => navigate(`/report/${submitted.id}`)}
          >
            View Report
          </Button>
        </div>
      </Card>
    )
  }

  if (draft) {
    const site = sites.get(draft.site_id)
    return (
      <Card variant="glass" padding="md" className="mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-7 h-7 text-amber-600" aria-hidden="true">
              <path fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-amber-700">Draft in Progress</p>
            {site && <p className="text-sm text-gray-600 mt-0.5 truncate">{site.name}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {draft.entries.length} crew {draft.entries.length === 1 ? 'entry' : 'entries'} added
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => navigate(`/report/${draft.id}`)}
          >
            Continue Draft
          </Button>
        </div>
      </Card>
    )
  }

  // No report yet
  return (
    <Card variant="glass" padding="md" className="mb-4">
      <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            className="w-9 h-9 text-forest" aria-hidden="true">
            <path fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z"
              clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-700 mb-1">No report yet today</p>
        <p className="text-sm text-gray-500 mb-4">
          {crewActiveCount > 0
            ? `${crewActiveCount} crew members ready`
            : 'Start logging today\'s work'}
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/report/new')}>
          Start Today's Report
        </Button>
      </div>
    </Card>
  )
}

// ─── Quick stats ──────────────────────────────────────────────────────────────

interface QuickStatsProps {
  weekReports: DailyReport[]
  crewActiveCount: number
}

function QuickStats({ weekReports, crewActiveCount }: QuickStatsProps) {
  const submittedThisWeek = weekReports.filter(
    r => r.status === 'submitted' || r.status === 'synced'
  ).length
  const totalHours = sumHours(weekReports)

  const stats = [
    { label: 'This Week', value: submittedThisWeek.toString(), sub: 'reports' },
    { label: 'Total Hours', value: totalHours.toFixed(0), sub: 'this week' },
    { label: 'Crew Active', value: crewActiveCount.toString(), sub: 'members' },
  ]

  return (
    <Card variant="solid" padding="md" className="mb-4">
      <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Quick Stats</h2>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.label} className="text-center p-2 bg-surface rounded-xl">
            <p className="text-2xl font-bold text-forest">{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Recent reports ───────────────────────────────────────────────────────────

interface RecentReportsProps {
  reports: DailyReport[]
  sites: Map<string, Site>
}

function RecentReports({ reports, sites }: RecentReportsProps) {
  const navigate = useNavigate()
  if (reports.length === 0) return null

  return (
    <Card variant="solid" padding="md">
      <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">Recent Reports</h2>
      <div className="flex flex-col gap-2">
        {reports.map(r => {
          const site = sites.get(r.site_id)
          const hrs = totalReportHours(r)
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/report/${r.id}`)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-forest/5 active:bg-forest/10 transition-colors min-h-[56px]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-MY', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                {site && <p className="text-xs text-gray-500 truncate">{site.name}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-gray-700">{hrs.toFixed(1)}h</p>
                <p className="text-xs text-gray-400">{r.entries.length} crew</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                className="w-4 h-4 text-gray-300 shrink-0" aria-hidden="true">
                <path fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd" />
              </svg>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Today() {
  const today = getTodayDate()
  const weekStart = getWeekStartDate()

  const [todayReports, setTodayReports] = useState<DailyReport[]>([])
  const [weekReports, setWeekReports] = useState<DailyReport[]>([])
  const [recentReports, setRecentReports] = useState<DailyReport[]>([])
  const [sites, setSites] = useState<Map<string, Site>>(new Map())
  const [crewActiveCount, setCrewActiveCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const firstEmit = useRef(true)

  const user = getCurrentUser()

  // Reactive live query for today + week reports
  useEffect(() => {
    firstEmit.current = true
    setIsLoading(true)

    const sub = liveQuery(async () => {
      const [todayRows, weekRows, recentRows, allSites, activeCrew] = await Promise.all([
        db.daily_reports.where('date').equals(today).toArray(),
        db.daily_reports.where('date').between(weekStart, today, true, true).toArray(),
        // Only fetch recent reports, not all historical data
        db.daily_reports
          .orderBy('date')
          .reverse()
          .filter(r => r.status === 'submitted' || r.status === 'synced')
          .limit(3)
          .toArray(),
        db.sites.toArray(),
        db.crew_members.where('is_active').equals(1).count(),
      ])

      const siteMap = new Map<string, Site>(allSites.map(s => [s.id, s]))

      return { todayRows, weekRows, recent: recentRows, siteMap, activeCrew }
    }).subscribe({
      next: ({ todayRows, weekRows, recent, siteMap, activeCrew }) => {
        setTodayReports(todayRows)
        setWeekReports(weekRows)
        setRecentReports(recent)
        setSites(siteMap)
        setCrewActiveCount(activeCrew)
        if (firstEmit.current) {
          setIsLoading(false)
          firstEmit.current = false
        }
      },
      error: (err) => {
        console.error('Today liveQuery error:', err)
        setIsLoading(false)
      },
    })

    return () => sub.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, weekStart])

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatDateDisplay(today)}
      />

      <main className="p-5 pb-24 max-w-lg mx-auto">
        {/* Greeting */}
        {user && (
          <p className="text-sm font-semibold text-forest mb-4">
            Welcome back, {user.display_name}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <TodayCard
              todayReports={todayReports}
              sites={sites}
              crewActiveCount={crewActiveCount}
            />
            <QuickStats weekReports={weekReports} crewActiveCount={crewActiveCount} />
            <RecentReports reports={recentReports} sites={sites} />
          </>
        )}
      </main>
    </>
  )
}
