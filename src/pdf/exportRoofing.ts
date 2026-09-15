import { jsPDF } from 'jspdf'
import type { DerivedGeometry } from '../geometry/derive'
import type { CoveringResult } from '../calc/roofCoverings'
import type { CarpentryResult, CutRoofResult, TrussRoofResult } from '../calc/roofCarpentry'
import { formatGBP, formatM, formatM2, mmToM } from '../calc/units'
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
 * Section PDF for roofing (POC). Whole-job PDF can concatenate other sections later
 * using the same geometry object — do not re-enter lengths.
 */
export function exportRoofingPdf(args: {
  job: JobState
  geometry: DerivedGeometry
  coverings: CoveringResult
  carpentry: CarpentryResult
}): void {
  const { job, geometry, coverings, carpentry } = args
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
  doc.text('Roofing take-off  ·  local only  ·  not a structural design', 18, 20)
  doc.setFontSize(9)
  doc.text(date, 192, 12, { align: 'right' })
  doc.text(job.jobName || 'Untitled job', 192, 20, { align: 'right' })
  doc.setTextColor(20, 20, 20)

  let y = 38
  y = heading(doc, y, 'Plan geometry (source of truth)')
  y = line(doc, y, 'Outline', geometry.closedOutline ? 'Closed polygon' : 'Open — bbox used')
  y = line(doc, y, 'Span × length', `${formatM(mmToM(geometry.spanMm))} × ${formatM(mmToM(geometry.lengthMm))}`)
  y = line(doc, y, 'Footprint / ceiling', `${formatM2(geometry.footprintM2)} / ${formatM2(geometry.ceilingM2)}`)
  y = line(doc, y, 'External walls', `${formatM(mmToM(geometry.externalLengthMm))}  (${geometry.doorCount} doors, ${geometry.openingCount} openings)`)
  y = line(doc, y, 'Roof shape / pitch', `${job.roofing.roofShape}  ·  ${job.roofing.pitchDeg}°  ·  overhang ${job.roofing.eavesOverhangMm} mm`)

  if (job.roofing.coveringsEnabled) {
    y = ensureSpace(doc, y + 4)
    y = heading(doc, y + 2, 'Roof coverings')
    const c = coverings
    y = line(doc, y, 'Slope area', formatM2(c.dims.slopeAreaM2))
    y = line(
      doc,
      y,
      c.dims.shape === 'gable-gable' ? 'Gauge / cover width' : 'Gauge / cover width',
      `${c.gaugeMm.toFixed(0)} mm / ${c.coverWidthMm.toFixed(0)} mm`,
    )
    y = line(doc, y, `${job.roofing.covering.type === 'slate' ? 'Slates' : 'Tiles'} required`, String(c.tilesRequired))
    y = line(
      doc,
      y,
      'Battens (incl. 20% waste)',
      `${c.battenLinearWithWasteM.toFixed(1)} m  ·  ${c.battenBundles} bundles (10 / bundle)`,
    )
    y = line(doc, y, c.feltLabel, `${c.feltRolls} rolls  (${c.feltRollSpec})`)
    y = line(doc, y, 'Ridge tiles', String(c.ridgeTiles))
    y = line(doc, y, 'Hip tiles', String(c.hipTiles))
    y = line(doc, y, 'Verge / valley', `${c.vergeM.toFixed(2)} m / ${c.valleyM.toFixed(2)} m`)
  }

  if (job.roofing.carpentryEnabled) {
    y = ensureSpace(doc, y + 4, 40)
    y = heading(doc, y + 2, job.roofing.carpentryMode === 'cut' ? 'Roofing carpentry — cut roof' : 'Roofing carpentry — truss')
    if (carpentry.mode === 'cut') {
      y = drawCut(doc, y, carpentry)
      if (job.roofing.cutListOptIn) {
        y = ensureSpace(doc, y + 8, 90)
        y = heading(doc, y + 2, 'Cut list (opt-in)')
        y = drawRafterDiagram(doc, y, carpentry)
      }
    } else {
      y = drawTruss(doc, y, carpentry)
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'Site Office Calcs is independent of My Site Office. Figures are take-off aids, not Building Regulations calculations.',
    18,
    287,
  )
  const safe = (job.jobName || 'job').replace(/[^\w\-]+/g, '-').slice(0, 40)
  doc.save(`site-office-calcs-roofing-${safe}.pdf`)
}

function drawCut(doc: jsPDF, y: number, cut: CutRoofResult): number {
  y = line(doc, y, 'Common rafter (ridge → fascia)', `${cut.commonRafterLengthMm.toFixed(0)} mm  × ${cut.commonRafterCount}  (${cut.rafterSection})`)
  y = line(doc, y, 'Plumb / seat cut', `${cut.plumbCutDeg.toFixed(1)}° plumb  ·  ${cut.seatCutDeg.toFixed(1)}° seat`)
  y = line(
    doc,
    y,
    'Bird’s mouth',
    `seat ${cut.seatCutMm.toFixed(0)} mm  ·  plumb ${cut.birdsMouthPlumbMm.toFixed(0)} mm  ·  BM at ${cut.lengthToBirdsmouthMm.toFixed(0)} mm from ridge`,
  )
  y = line(doc, y, 'Ridge board', `${formatM(mmToM(cut.ridgeBoardMm))}  (${cut.ridgeSection})`)
  y = line(doc, y, 'Wall plate', `${formatM(mmToM(cut.wallPlateMm))}  (${cut.wallPlateSection})`)
  y = line(doc, y, 'Hips / valleys', `${cut.hipCount} hips @ ${cut.hipLengthMm.toFixed(0)} mm  ·  valley ${formatM(mmToM(cut.valleyMm))}`)
  y = line(doc, y, 'Jack rafters', `${cut.jackCount}  ·  common difference ${cut.jackCommonDifferenceMm.toFixed(0)} mm`)
  y = line(doc, y, 'Collar ties', `${cut.collarTieCount} @ ${cut.collarTieLengthMm.toFixed(0)} mm  (${cut.collarSection})`)
  y = line(doc, y, 'Purlins', `${cut.purlinCount} @ ${formatM(mmToM(cut.purlinLengthMm))}  (${cut.purlinSection})`)
  y = line(doc, y, 'Total timber (indicative)', `${cut.totalTimberM.toFixed(1)} m`)
  return y
}

function drawTruss(doc: jsPDF, y: number, t: TrussRoofResult): number {
  y = line(doc, y, 'Type / centres', `${t.trussType}  ·  ${t.centresMm} mm`)
  y = line(doc, y, 'Truss count', String(t.trussCount))
  for (const m of t.members) {
    y = line(doc, y, m.name, `${m.countPerTruss} × ${m.section} @ ${m.lengthMm.toFixed(0)} mm`)
  }
  y = line(doc, y, 'Timber (all trusses)', `${t.totalTimberM.toFixed(1)} m`)
  y = line(doc, y, `Indicative cost @ £${TRUSS_HINT}/m²`, formatGBP(t.indicativeCostGbp))
  if (t.atticFloorWarning) {
    y = line(doc, y, 'Attic warning', 'Heavier floor joist / attic deck required')
  }
  return y
}

const TRUSS_HINT = 85

function drawRafterDiagram(doc: jsPDF, y: number, cut: CutRoofResult): number {
  const x0 = 22
  const y0 = y + 8
  const depth = 10
  const maxW = 166
  const L = cut.commonRafterLengthMm
  const scale = maxW / Math.max(L, 1)
  const bmFromRidge = cut.lengthToBirdsmouthMm * scale
  const seat = Math.min(8, cut.seatCutMm * scale)
  const plumb = Math.min(depth - 1, cut.birdsMouthPlumbMm * scale)

  doc.setDrawColor(15, 28, 46)
  doc.setLineWidth(0.5)
  // Top edge
  doc.line(x0, y0, x0 + maxW, y0)
  // Ridge plumb (short vertical)
  doc.line(x0, y0, x0, y0 + depth)
  // Bottom to birdsmouth
  doc.line(x0, y0 + depth, x0 + bmFromRidge, y0 + depth)
  // Birdsmouth notch
  doc.line(x0 + bmFromRidge, y0 + depth, x0 + bmFromRidge, y0 + depth - plumb)
  doc.line(x0 + bmFromRidge, y0 + depth - plumb, x0 + bmFromRidge + seat, y0 + depth - plumb)
  doc.line(x0 + bmFromRidge + seat, y0 + depth - plumb, x0 + bmFromRidge + seat, y0 + depth)
  // Tail
  doc.line(x0 + bmFromRidge + seat, y0 + depth, x0 + maxW, y0 + depth)
  doc.line(x0 + maxW, y0 + depth, x0 + maxW, y0)

  doc.setFontSize(8)
  doc.text(`Common rafter  ${L.toFixed(0)} mm   × ${cut.commonRafterCount}`, x0, y0 - 3)
  doc.text('plumb', x0, y0 + depth + 5)
  doc.text('bird’s mouth', x0 + bmFromRidge, y0 + depth + 5)
  doc.text('tail / fascia', x0 + maxW - 22, y0 + depth + 5)

  let yy = y0 + depth + 14
  doc.setFont('helvetica', 'bold')
  doc.text('Jack rafters (diminishing)', x0, yy)
  doc.setFont('helvetica', 'normal')
  yy += 5
  const show = cut.jackRafters.slice(0, 12)
  for (const jack of show) {
    const w = (jack.lengthMm / Math.max(L, 1)) * maxW
    doc.setLineWidth(0.4)
    doc.line(x0, yy, x0 + w, yy)
    doc.text(`${jack.lengthMm.toFixed(0)} mm`, x0 + w + 3, yy + 1)
    yy += 5
  }
  if (cut.jackRafters.length === 0) {
    doc.text('No jacks on a gable-to-gable roof.', x0, yy)
    yy += 5
  } else {
    doc.text(
      `Each length × ${cut.jackCount / Math.max(cut.jackRafters.length, 1)} (hip sets). CD = ${cut.jackCommonDifferenceMm.toFixed(0)} mm.`,
      x0,
      yy,
    )
    yy += 5
  }
  return yy + 4
}
