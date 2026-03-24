import type { DailyReport, CrewMember } from '@/db/schema'

// ─── CSV escaping ─────────────────────────────────────────────────────────────

/**
 * Escape a field value for CSV.
 * Wraps in double-quotes if the value contains a comma, double-quote, or newline.
 * Double-quotes within the value are escaped by doubling them.
 */
function escapeCSV(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Convert an array of DailyReports into a CSV string, one row per crew entry.
 * IC Number is resolved by looking up crew_member_id in the crewMembers array.
 */
export function exportReportsToCSV(
  reports: DailyReport[],
  crewMembers: CrewMember[],
): string {
  const crewMap = new Map<string, CrewMember>(crewMembers.map(c => [c.id, c]))

  const header = [
    'Date',
    'Site',
    'Crew Member',
    'IC Number',
    'Activity',
    'Hours Regular',
    'Hours Overtime',
    'Total Hours',
    'Notes',
  ]
    .map(escapeCSV)
    .join(',')

  const rows: string[] = [header]

  // Sort reports by date ascending for payroll readability
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date))

  for (const report of sorted) {
    for (const entry of report.entries) {
      const crew = crewMap.get(entry.crew_member_id)
      const icNumber = crew?.ic_number ?? ''
      const totalHrs = entry.hours_regular + entry.hours_overtime

      const row = [
        report.date,
        report.site_id, // callers may want to pre-resolve site names; kept as ID here
        entry.crew_member_name,
        icNumber,
        entry.activity_name,
        entry.hours_regular,
        entry.hours_overtime,
        totalHrs,
        entry.notes,
      ]
        .map(escapeCSV)
        .join(',')

      rows.push(row)
    }

    // If a report has no entries, still emit a placeholder row
    if (report.entries.length === 0) {
      const row = [
        report.date,
        report.site_id,
        '', '', '', '', '', '', '',
      ]
        .map(escapeCSV)
        .join(',')
      rows.push(row)
    }
  }

  return rows.join('\r\n')
}

/**
 * Trigger a browser download of the given CSV content as a .csv file.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility with Malaysian characters
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
