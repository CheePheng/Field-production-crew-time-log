import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCrewDefaults } from '@/hooks/useCrewDefaults'
import { db } from '@/db/schema'
import { getTodayDate } from '@/utils/dateHelpers'
import type { Site } from '@/db/schema'

interface Step1Data {
  date: string
  siteId: string
}

interface WizardStep1Props {
  data: Step1Data
  onChange: (data: Step1Data) => void
  onNext: () => void
}

export function WizardStep1({ data, onChange, onNext }: WizardStep1Props) {
  const [sites, setSites] = useState<Site[]>([])
  const [siteError, setSiteError] = useState('')
  const { defaults } = useCrewDefaults()

  useEffect(() => {
    db.sites.where('is_active').equals(1).toArray().then(setSites).catch(console.error)
  }, [])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...data, date: e.target.value })
  }

  function handleSiteSelect(siteId: string) {
    setSiteError('')
    onChange({ ...data, siteId })
  }

  function handleUseSameSite() {
    if (defaults?.siteId) {
      setSiteError('')
      onChange({ ...data, siteId: defaults.siteId })
    }
  }

  function handleNext() {
    if (!data.siteId) {
      setSiteError('Please select a site to continue.')
      return
    }
    onNext()
  }

  const sameSite = defaults?.siteId ? sites.find(s => s.id === defaults.siteId) : null

  return (
    <div className="flex flex-col gap-5">
      {/* Date */}
      <Card variant="solid" padding="md">
        <Input
          label="Report Date"
          type="date"
          value={data.date}
          onChange={handleDateChange}
          max={getTodayDate()}
          helper="Tap to change date for backdating"
        />
      </Card>

      {/* Same site shortcut */}
      {sameSite && (
        <button
          type="button"
          onClick={handleUseSameSite}
          className={[
            'flex items-center gap-3 w-full',
            'min-h-[56px] px-4 py-3',
            'rounded-xl border-2',
            'transition-all duration-150',
            'active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
            data.siteId === sameSite.id
              ? 'bg-forest/10 border-forest'
              : 'bg-forest/5 border-forest/30 hover:bg-forest/10 hover:border-forest',
          ].join(' ')}
        >
          <span className="text-2xl" aria-hidden="true">⚡</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-forest">Same Site as Yesterday</p>
            <p className="text-xs text-gray-600">{sameSite.name} — {sameSite.location_label}</p>
          </div>
          {data.siteId === sameSite.id && (
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-forest text-white" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </button>
      )}

      {/* Site list */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-forest px-1">Select Site</p>
        {siteError && (
          <p className="text-xs font-medium text-danger px-1">{siteError}</p>
        )}
        {sites.length === 0 ? (
          <Card variant="solid" padding="sm">
            <p className="text-sm text-gray-400 text-center py-4">No active sites found</p>
          </Card>
        ) : (
          sites.map(site => (
            <button
              key={site.id}
              type="button"
              onClick={() => handleSiteSelect(site.id)}
              className={[
                'flex items-center gap-3 w-full',
                'min-h-[64px] px-4 py-3',
                'rounded-xl border-2',
                'transition-all duration-150',
                'active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
                data.siteId === site.id
                  ? 'bg-forest/10 border-forest'
                  : 'bg-white border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-forest">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">{site.name}</p>
                <p className="text-xs text-gray-500">{site.location_label}</p>
              </div>
              {data.siteId === site.id && (
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-forest text-white flex-shrink-0" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Next button */}
      <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
        Next: Select Crew
      </Button>
    </div>
  )
}
