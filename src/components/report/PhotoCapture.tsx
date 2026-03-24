import { useCallback, useRef, useState } from 'react'
import { db } from '@/db/schema'
import type { ReportPhoto } from '@/db/schema'

export const MAX_PHOTOS = 5
const MAX_WIDTH = 1280
const THUMB_WIDTH = 50
const GPS_TIMEOUT_MS = 10_000
const TARGET_BYTES = 200_000

interface PhotoCaptureProps {
  photos: ReportPhoto[]
  onChange: (photos: ReportPhoto[]) => void
}

async function compressToTarget(canvas: HTMLCanvasElement, targetBytes: number = TARGET_BYTES): Promise<Blob> {
  let quality = 0.8
  let blob: Blob | null = null

  while (quality >= 0.3) {
    blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (blob && blob.size <= targetBytes) break
    quality -= 0.1
  }

  // If still too large at minimum quality, accept what we have
  if (!blob) throw new Error('Image compression failed');
  return blob;
}

async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      compressToTarget(canvas)
        .then(blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob returned null'))
        })
        .catch(reject)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

async function makeThumbnailBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = THUMB_WIDTH / img.naturalWidth
      const w = THUMB_WIDTH
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Thumbnail load failed'))
    }
    img.src = url
  })
}

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    const timer = setTimeout(() => resolve(null), GPS_TIMEOUT_MS)
    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 },
    )
  })
}

export function PhotoCapture({ photos, onChange }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const handleAddPhoto = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) return
    setCameraError('')
    inputRef.current?.click()
  }, [photos.length])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Reset so same file can be re-selected if needed
      e.target.value = ''

      setProcessing(true)
      setCameraError('')

      try {
        // Run compression and GPS lookup in parallel — GPS has a 10s timeout and
        // must not block the user waiting for the photo to finish processing.
        const [compressed, gps] = await Promise.all([
          resizeImage(file, MAX_WIDTH),
          getGPS(),
        ])
        const thumbnail = await makeThumbnailBase64(compressed)

        const blobKey = crypto.randomUUID()
        const now = new Date().toISOString()

        // Store blob
        await db.photo_blobs.add({ id: blobKey, data: compressed, created_at: now })

        const photo: ReportPhoto = {
          id: crypto.randomUUID(),
          blob_key: blobKey,
          thumbnail_base64: thumbnail,
          gps_lat: gps?.lat ?? null,
          gps_lng: gps?.lng ?? null,
          captured_at: now,
          caption: '',
        }

        onChange([...photos, photo])
      } catch (err) {
        console.error('Photo capture error:', err)
        // Camera permission denied or other error
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. You can continue without photos.')
        } else {
          setCameraError('Failed to process photo. Please try again.')
        }
      } finally {
        setProcessing(false)
      }
    },
    [photos, onChange],
  )

  const handleDelete = useCallback(
    async (photoId: string) => {
      const photo = photos.find(p => p.id === photoId)
      if (photo) {
        await db.photo_blobs.delete(photo.blob_key).catch(console.error)
      }
      onChange(photos.filter(p => p.id !== photoId))
    },
    [photos, onChange],
  )

  const canAdd = photos.length < MAX_PHOTOS && !processing

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-forest">Photos</p>
          <p className="text-xs text-gray-500">{photos.length}/{MAX_PHOTOS} photos</p>
        </div>
        <button
          type="button"
          onClick={handleAddPhoto}
          disabled={!canAdd}
          className={[
            'flex items-center gap-2',
            'min-h-[48px] px-4 py-2',
            'rounded-xl border-2 border-dashed',
            'text-sm font-semibold',
            'transition-all duration-150 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-light focus-visible:ring-offset-2',
            canAdd
              ? 'border-forest text-forest hover:bg-forest/5'
              : 'border-gray-200 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {processing ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Add Photo
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {cameraError && (
        <p className="text-xs font-medium text-danger">{cameraError}</p>
      )}

      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img
                src={photo.thumbnail_base64}
                alt={`Photo taken at ${new Date(photo.captured_at).toLocaleTimeString()}`}
                className="w-full h-full object-cover"
              />
              {/* GPS indicator */}
              {photo.gps_lat != null && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white rounded px-1" aria-label="GPS location captured">
                  GPS
                </span>
              )}
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger/80 transition-colors"
                aria-label="Delete photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
