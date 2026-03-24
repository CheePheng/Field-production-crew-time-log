import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PhotoCapture, MAX_PHOTOS } from './PhotoCapture'
import type { ReportPhoto } from '@/db/schema'

interface WizardStep3Props {
  photos: ReportPhoto[]
  onPhotosChange: (photos: ReportPhoto[]) => void
  notes: string
  onNotesChange: (notes: string) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
  isOnline?: boolean
}

export function WizardStep3({
  photos,
  onPhotosChange,
  notes,
  onNotesChange,
  onSubmit,
  onBack,
  isSubmitting,
  isOnline = true,
}: WizardStep3Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Photos */}
      <Card variant="solid" padding="md">
        <p className="text-xs text-gray-400 text-right mb-3">{photos.length}/{MAX_PHOTOS} photos</p>
        <PhotoCapture photos={photos} onChange={onPhotosChange} />
      </Card>

      {/* Notes */}
      <Card variant="solid" padding="md">
        <label className="block text-sm font-semibold text-forest mb-2" htmlFor="report-notes">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="report-notes"
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Any observations, issues, or comments for this report…"
          rows={4}
          className={[
            'w-full px-4 py-3',
            'rounded-xl border border-gray-200',
            'text-base text-gray-900 placeholder:text-gray-400',
            'bg-white resize-none',
            'focus:outline-none focus:border-forest-light focus:ring-2 focus:ring-forest-light/30',
            'transition-all duration-150',
          ].join(' ')}
        />
      </Card>

      {/* Offline notice */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold text-amber-700">
            Offline — report will be saved locally
          </p>
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isOnline ? 'Submit Report' : 'Save Locally'}
      </Button>

      {/* Back */}
      {!isSubmitting && (
        <Button variant="ghost" size="lg" fullWidth onClick={onBack}>
          Back
        </Button>
      )}
    </div>
  )
}
