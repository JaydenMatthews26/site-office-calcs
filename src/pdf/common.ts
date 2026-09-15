import { jsPDF } from 'jspdf'
import { formatM, formatM2, mmToM } from '../calc/units'
import type { DerivedGeometry } from '../geometry/derive'
import type { JobState } from '../types/job'

export function line(doc: jsPDF, y: number, left: string, right: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(left, 18, y)
  doc.text(right, 192, y, { align: 'right' })
  return y + 6
}

export function heading(doc: jsPDF, y: number, title: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 28, 46)
  doc.text(title, 18, y)
  doc.setDrawColor(196, 92, 38)
  doc.setLineWidth(0.6)
  doc.line(18, y + 2, 192, y + 2)
  doc.setTextColor(20, 20, 20)
  return y + 10
}

export function ensureSpace(doc: jsPDF, y: number, needed = 24): number {
  if (y + needed < 275) return y
  doc.addPage()
  return 22
}

export function startSectionPdf(job: JobState, subtitle: string): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date().toLocaleDateString('en-GB')
  doc.setFillColor(15, 28, 46)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Site Office Calcs', 18, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${subtitle}  ·  local only  ·  take-off aid`, 18, 20)
  doc.setFontSize(9)
  doc.text(date, 192, 12, { align: 'right' })
  doc.text(job.jobName || 'Untitled job', 192, 20, { align: 'right' })
  doc.setTextColor(20, 20, 20)
  return { doc, y: 38 }
}

export function drawPlanBlock(doc: jsPDF, y: number, geometry: DerivedGeometry, extra?: string): number {
  y = heading(doc, y, `Plan geometry (${geometry.source === 'manual' ? 'typed measurements' : 'drawn plan'})`)
  y = line(doc, y, 'Span × length', `${formatM(mmToM(geometry.spanMm))} × ${formatM(mmToM(geometry.lengthMm))}`)
  y = line(doc, y, 'Footprint / ceiling', `${formatM2(geometry.footprintM2)} / ${formatM2(geometry.ceilingM2)}`)
  y = line(
    doc,
    y,
    'External / partitions',
    `${formatM(mmToM(geometry.externalLengthMm))} / ${formatM(mmToM(geometry.partitionLengthMm))}`,
  )
  y = line(
    doc,
    y,
    'Storeys / height',
    `${geometry.storeys}  ·  ${geometry.storeyHeightMm} mm`,
  )
  y = line(
    doc,
    y,
    'Openings',
    `${geometry.doorCount} doors (${formatM2(geometry.doorAreaM2)})  ·  ${geometry.openingCount} windows (${formatM2(geometry.windowAreaM2)})`,
  )
  if (extra) y = line(doc, y, 'Notes', extra)
  return y
}

export function finishPdf(doc: jsPDF, job: JobState, slug: string): void {
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'Site Office Calcs is independent of My Site Office. Figures are take-off aids, not Building Regulations calculations.',
    18,
    287,
  )
  const safe = (job.jobName || 'job').replace(/[^\w\-]+/g, '-').slice(0, 40)
  doc.save(`site-office-calcs-${slug}-${safe}.pdf`)
}

export function noteList(doc: jsPDF, y: number, notes: string[]): number {
  for (const n of notes) {
    y = ensureSpace(doc, y, 10)
    doc.setFontSize(8)
    doc.setTextColor(80)
    const lines = doc.splitTextToSize(`• ${n}`, 174) as string[]
    doc.text(lines, 18, y)
    y += lines.length * 4 + 1
    doc.setTextColor(20, 20, 20)
  }
  return y
}
