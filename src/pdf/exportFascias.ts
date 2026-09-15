import { jsPDF } from 'jspdf'
import type { FasciasResult } from '../calc/fascias'
import { formatGBP, formatM, formatM2, mmToM } from '../calc/units'
import type { DerivedGeometry } from '../geometry/derive'
import type { JobState } from '../types/job'

function line(doc: jsPDF, y: number, left: string, right: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(left, 18, y)
  doc.text(right, 192, y, { align: 'right' })
  return y + 6
}

function heading(doc: jsPDF, y: number, title: string) {
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

function ensureSpace(doc: jsPDF, y: number, needed = 24): number {
  if (y + needed < 280) return y
  doc.addPage()
  return 22
}

/**
 * Section PDF for fascias, soffits and guttering.
 * Reads the same derived geometry object as roofing — do not re-enter lengths.
 */
export function exportFasciasPdf(args: {
  job: JobState
  geometry: DerivedGeometry
  fascias: FasciasResult
}): void {
  const { job, geometry, fascias: r } = args
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
  doc.text('Fascias, soffits & guttering  ·  local only  ·  not a rainwater design', 18, 20)
  doc.setFontSize(9)
  doc.text(date, 192, 12, { align: 'right' })
  doc.text(job.jobName || 'Untitled job', 192, 20, { align: 'right' })
  doc.setTextColor(20, 20, 20)

  let y = 38
  y = heading(doc, y, 'Plan geometry (source of truth)')
  y = line(doc, y, 'Outline', geometry.closedOutline ? 'Closed polygon' : 'Open — bbox used')
  y = line(doc, y, 'Span × length', `${formatM(mmToM(geometry.spanMm))} × ${formatM(mmToM(geometry.lengthMm))}`)
  y = line(doc, y, 'External walls / eaves perimeter', formatM(mmToM(geometry.externalLengthMm)))
  y = line(doc, y, 'Storey height', `${geometry.storeyHeightMm} mm`)
  y = line(
    doc,
    y,
    'Roof shape / pitch / overhang',
    `${job.roofing.roofShape}  ·  ${job.roofing.pitchDeg}°  ·  ${job.roofing.eavesOverhangMm} mm`,
  )

  y = ensureSpace(doc, y + 4, 50)
  y = heading(doc, y + 2, `Fascia & soffit — ${job.fascias.material === 'timber' ? 'timber' : 'PVCU'}`)
  y = line(doc, y, 'Eaves run (fascia / soffit)', formatM(r.fasciaLinearM))
  y = line(doc, y, 'Fascia boards', `${r.fasciaBoards}  (${job.fascias.boardLengthM} m, ${r.wastePct}% waste)`)
  y = line(doc, y, 'Fascia depth', `${job.fascias.fasciaDepthMm} mm`)
  y = line(doc, y, 'Soffit width / area', `${r.soffitWidthMm} mm  ·  ${formatM2(r.soffitAreaM2)}`)
  y = line(
    doc,
    y,
    'Soffit boards',
    `${r.soffitBoards}  (${r.soffitBoardsAcross} across overhang)`,
  )
  if (r.bargeLinearM > 0) {
    y = line(doc, y, 'Bargeboards', `${formatM(r.bargeLinearM)}  ·  ${r.bargeBoards} boards`)
  }
  if (job.fascias.material === 'pvcu') {
    y = line(doc, y, 'PVCU colour', job.fascias.pvcuColour)
  }

  if (r.paint) {
    y = ensureSpace(doc, y + 4, 40)
    y = heading(doc, y + 2, 'Timber paint')
    y = line(doc, y, 'Colour', r.paint.colour)
    y = line(doc, y, 'Face area per coat', formatM2(r.paint.areaPerCoatM2))
    y = line(doc, y, `Coverage / coats`, `${r.paint.coverageM2PerL} m²/L  ·  ${r.paint.coats} coats`)
    y = line(doc, y, 'Paint required', `${r.paint.litres.toFixed(2)} L`)
    y = line(doc, y, 'Tins', `${r.paint.tins} × ${r.paint.tinL} L  (${formatGBP(r.paint.indicativeCostGbp)})`)
  }

  y = ensureSpace(doc, y + 4, 55)
  y = heading(doc, y + 2, `Guttering — ${job.fascias.gutterMaterial}`)
  y = line(doc, y, 'Property width', formatM(mmToM(r.propertyWidthMm)))
  y = line(doc, y, 'Eaves height', `${r.eavesHeightMm} mm`)
  y = line(doc, y, 'Gutter run', `${formatM(r.gutterLinearM)}  ·  ${r.gutterRuns} runs`)
  y = line(doc, y, 'Gutter lengths', `${r.gutterPieces} @ ${job.fascias.gutterPieceLengthM} m`)
  y = line(doc, y, 'Unions / stop ends / brackets', `${r.gutterUnions}  ·  ${r.gutterStopEnds}  ·  ${r.gutterBrackets}`)
  y = line(doc, y, 'Outlets', String(r.outlets))
  y = line(doc, y, 'Elbows', String(r.elbows))
  y = line(
    doc,
    y,
    'Downpipe',
    `${formatM(r.downpipeTotalM)} total  (${r.outlets} × ${r.downpipeLengthPerOutletMm} mm)  ·  ${r.downpipePieces} lengths`,
  )

  y = ensureSpace(doc, y + 4)
  y = heading(doc, y + 2, 'Indicative supply (not a quote)')
  y = line(doc, y, 'Fascia / soffit / barge', `${formatGBP(r.fasciaCostGbp)}  /  ${formatGBP(r.soffitCostGbp)}  /  ${formatGBP(r.bargeCostGbp)}`)
  y = line(doc, y, 'Guttering', formatGBP(r.gutterCostGbp))
  if (r.paint) y = line(doc, y, 'Paint', formatGBP(r.paint.indicativeCostGbp))
  y = line(doc, y, 'Total', formatGBP(r.indicativeTotalGbp))

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'Site Office Calcs is independent of My Site Office. Figures are take-off aids, not Building Regulations calculations.',
    18,
    287,
  )
  const safe = (job.jobName || 'job').replace(/[^\w\-]+/g, '-').slice(0, 40)
  doc.save(`site-office-calcs-fascias-${safe}.pdf`)
}
