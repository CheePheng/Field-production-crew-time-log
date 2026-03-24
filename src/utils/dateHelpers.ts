// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Formats a Date as YYYY-MM-DD using local timezone. */
function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today's date as a local YYYY-MM-DD string. */
export function getTodayDate(): string {
  return toLocalDateString(new Date())
}

/** Returns the date N calendar days ago as a local YYYY-MM-DD string. */
export function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalDateString(d)
}

/** Returns the first day of the current month as an ISO-8601 string (YYYY-MM-DD). */
export function getMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable display string.
 * Example: "Monday, 25 March 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
