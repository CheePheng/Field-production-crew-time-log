import type { DailyReport, Site, CrewMember } from '@/db/schema'

// ─── pdfmake singleton ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfMakeInstance: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPdfMake(): Promise<any> {
  if (pdfMakeInstance) return pdfMakeInstance
  const mod = await import('pdfmake/build/pdfmake')
  const vfsMod = await import('pdfmake/build/vfs_fonts')
  const pm = mod.default
  if (vfsMod.default?.vfs) pm.vfs = vfsMod.default.vfs
  pm.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }
  pdfMakeInstance = pm
  return pm
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF for a single daily report.
 * pdfmake is dynamically imported to keep the initial bundle small.
 */
export async function exportReportToPDF(
  report: DailyReport,
  site: Site,
  crewMembers: CrewMember[],
): Promise<void> {
  // Get (or lazily initialise) the shared pdfmake instance
  const pdfMake = await getPdfMake()

  const crewMap = new Map<string, CrewMember>(crewMembers.map(c => [c.id, c]))

  // ── Table rows ─────────────────────────────────────────────────────────────
  const tableHeader = [
    { text: 'Crew Member', style: 'tableHeader' },
    { text: 'IC Number', style: 'tableHeader' },
    { text: 'Activity', style: 'tableHeader' },
    { text: 'Reg Hours', style: 'tableHeader' },
    { text: 'OT Hours', style: 'tableHeader' },
    { text: 'Total', style: 'tableHeader' },
    { text: 'Notes', style: 'tableHeader' },
  ]

  const tableRows = report.entries.map(entry => {
    const crew = crewMap.get(entry.crew_member_id)
    const total = entry.hours_regular + entry.hours_overtime
    return [
      entry.crew_member_name,
      crew?.ic_number ?? '-',
      entry.activity_name,
      entry.hours_regular.toFixed(1),
      entry.hours_overtime.toFixed(1),
      { text: total.toFixed(1), bold: true },
      entry.notes || '-',
    ]
  })

  if (tableRows.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableRows.push([{ text: 'No entries recorded.', colSpan: 7, italics: true, color: '#888' } as any, '', '', '', '', '', ''])
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalRegular = report.entries.reduce((s, e) => s + e.hours_regular, 0)
  const totalOT = report.entries.reduce((s, e) => s + e.hours_overtime, 0)
  const totalAll = totalRegular + totalOT
  const generatedAt = new Date().toLocaleString('en-MY')

  // ── Doc definition ─────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 50, 30, 50] as [number, number, number, number],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
    styles: {
      header: { fontSize: 16, bold: true, color: '#0D4F2B', margin: [0, 0, 0, 4] },
      subheader: { fontSize: 10, bold: true, color: '#555', margin: [0, 0, 0, 2] },
      tableHeader: { bold: true, fillColor: '#0D4F2B', color: '#fff', fontSize: 8 },
      summaryLabel: { bold: true, color: '#0D4F2B' },
      footer: { fontSize: 7, color: '#999', italics: true },
    },
    content: [
      // ── Header ─────────────────────────────────────────────────────────────
      { text: 'CCT PGL FieldLog — Daily Report', style: 'header' },
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 780, y2: 2, lineWidth: 1.5, lineColor: '#0D4F2B' }] },
      { text: '', margin: [0, 8, 0, 0] },

      // ── Report info table ──────────────────────────────────────────────────
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: [{ text: 'Date:  ', style: 'summaryLabel' }, formatDate(report.date)] },
              { text: [{ text: 'Site:  ', style: 'summaryLabel' }, site.name], margin: [0, 2, 0, 0] },
              { text: [{ text: 'Location:  ', style: 'summaryLabel' }, site.location_label || '-'], margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: [{ text: 'Status:  ', style: 'summaryLabel' }, report.status.toUpperCase()] },
              { text: [{ text: 'Submitted by:  ', style: 'summaryLabel' }, report.submitted_by], margin: [0, 2, 0, 0] },
              {
                text: [
                  { text: 'Submitted at:  ', style: 'summaryLabel' },
                  report.submitted_at
                    ? new Date(report.submitted_at).toLocaleString('en-MY')
                    : 'Not yet submitted',
                ],
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },

      // ── Notes ──────────────────────────────────────────────────────────────
      ...(report.notes
        ? [{ text: [{ text: 'Notes:  ', style: 'summaryLabel' }, report.notes], margin: [0, 0, 0, 12] }]
        : []),

      // ── Crew hours table ───────────────────────────────────────────────────
      { text: 'Crew Hours Detail', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 80, '*', 45, 45, 40, '*'],
          body: [tableHeader, ...tableRows],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i === 0 || i === 1) ? '#0D4F2B' : '#e5e7eb',
          fillColor: (rowIndex: number) => rowIndex % 2 === 0 ? '#f8faf5' : null,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 16],
      },

      // ── Summary ────────────────────────────────────────────────────────────
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [
                [
                  { text: 'Total Regular Hours:', style: 'summaryLabel' },
                  { text: totalRegular.toFixed(1), alignment: 'right' },
                ],
                [
                  { text: 'Total Overtime Hours:', style: 'summaryLabel' },
                  { text: totalOT.toFixed(1), alignment: 'right' },
                ],
                [
                  { text: 'Grand Total Hours:', style: 'summaryLabel', fontSize: 10 },
                  { text: totalAll.toFixed(1), bold: true, fontSize: 10, alignment: 'right' },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
        margin: [0, 0, 0, 8],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Generated: ${generatedAt}`, style: 'footer', margin: [30, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 0, 30, 0] },
      ],
    }),
  }

  const filename = `report-${report.date}-${sanitizeFilename(site.name)}.pdf`
  pdfMake.createPdf(docDefinition).download(filename)
}
