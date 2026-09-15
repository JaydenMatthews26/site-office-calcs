import { jsPDF } from 'jspdf'
import type { FasciasResult } from '../calc/fascias'
import { formatGBP, formatM, formatM2, mmToM } from '../calc/units'
import type { DerivedGeometry } from '../geometry/derive'
import type { JobState } from '../types/job'
import { ensureSpace, finishPdf, heading, line, startSectionPdf } from './common'

export interface FasciasPdfArgs {
  job: JobState
  geometry: DerivedGeometry
  fascias: FasciasResult
}

/**
 * Fascia / soffit / gutter take-off body. Used by the section PDF and the whole-job PDF.
 * Reads the same derived geometry object as roofing — do not re-enter lengths.
 */
export function drawFasciasTakeoff(doc: jsPDF, y: number, args: FasciasPdfArgs): number {
  const { job, fascias: r } = args

  y = ensureSpace(doc, y + 4, 50)
  y = heading(doc, y + 2, `Fascia & soffit — ${job.fascias.material === 'timber' ? 'timber' : 'PVCU'}`)
  y = line(doc, y, 'Eaves run (fascia / soffit)', formatM(r.fasciaLinearM))
  y = line(doc, y, 'Fascia boards', `${r.fasciaBoards}  (${job.fascias.boardLengthM} m, ${r.wastePct}% waste)`)
  y = line(doc, y, 'Fascia depth', `${job.fascias.fasciaDepthMm} mm`)
  y = line(doc, y, 'Soffit width / area', `${r.soffitWidthMm} mm  ·  ${formatM2(r.soffitAreaM2)}`)
  y = line(doc, y, 'Soffit boards', `${r.soffitBoards}  (${r.soffitBoardsAcross} across overhang)`)
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
    y = line(doc, y, 'Coverage / coats', `${r.paint.coverageM2PerL} m²/L  ·  ${r.paint.coats} coats`)
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
  return y
}

/**
 * Section PDF for fascias, soffits and guttering.
 */
export function exportFasciasPdf(args: FasciasPdfArgs): void {
  const { job, geometry } = args
  const { doc, y: y0 } = startSectionPdf(job, 'Fascias, soffits & guttering')
  let y = heading(doc, y0, 'Plan geometry (source of truth)')
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
  y = drawFasciasTakeoff(doc, y, args)
  finishPdf(doc, job, 'fascias')
}
