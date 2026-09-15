import type { DerivedGeometry } from '../geometry/derive'
import type { RoofingInputs, TrussType } from '../types/job'
import { roofPlanDims, type RoofPlanDims } from './roofCoverings'
import { mmToM } from './units'

/** Indicative factory-truss supply, £ per m² of building footprint (brief ~£85/m²). */
export const TRUSS_COST_PER_M2 = 85

export interface JackRafter {
  index: number
  lengthMm: number
}

export interface CutRoofResult {
  mode: 'cut'
  dims: RoofPlanDims
  /** Plumb cut = pitch (degrees). Seat / level cut = 90° − pitch. */
  plumbCutDeg: number
  seatCutDeg: number
  /** Horizontal seating on the wall plate (bird’s mouth seat cut). */
  seatCutMm: number
  /** Vertical depth of the bird’s mouth plumb cut = seat × tan(θ). */
  birdsMouthPlumbMm: number
  commonRafterLengthMm: number
  lengthToBirdsmouthMm: number
  riseToFasciaMm: number
  rafterSection: string
  commonsPerSlope: number
  commonRafterCount: number
  ridgeBoardMm: number
  ridgeSection: string
  wallPlateMm: number
  wallPlateSection: string
  hipCount: number
  hipLengthMm: number
  valleyMm: number
  jackCommonDifferenceMm: number
  jackRafters: JackRafter[]
  jackCount: number
  collarTieLengthMm: number
  collarTieCount: number
  collarSection: string
  purlinLengthMm: number
  purlinCount: number
  purlinSection: string
  totalTimberM: number
  notes: string[]
}

export interface TrussMember {
  name: string
  section: string
  lengthMm: number
  countPerTruss: number
}

export interface TrussRoofResult {
  mode: 'truss'
  dims: RoofPlanDims
  trussType: TrussType
  centresMm: number
  trussCount: number
  members: TrussMember[]
  timberPerTrussM: number
  totalTimberM: number
  footprintM2: number
  indicativeCostGbp: number
  atticFloorWarning: boolean
  notes: string[]
}

export type CarpentryResult = CutRoofResult | TrussRoofResult

/**
 * Cut-roof carpentry.
 *
 * Common rafter (ridge to fascia):
 *   run L_h = span/2 + eaves overhang
 *   length L = L_h / cos(θ)
 *   rise    = L_h · tan(θ)
 *
 * Bird’s mouth (on the wall plate):
 *   seat (level) cut ≈ wall-plate width (typically 100 mm)
 *   plumb depth     = seat · tan(θ)
 *   remaining rafter depth above the notch should stay ≥ 2/3 of section depth
 *   (notching rule of thumb — not a substitute for Eurocode 5 / Part A design).
 *
 * Plumb cut at ridge = θ (so the cut face sits vertical against the ridge board).
 * Seat cut           = 90° − θ.
 *
 * Rafter count at spacing s along the eaves/ridge:
 *   n_per_slope = floor(length / s) + 1
 *   gable: both slopes full commons
 *   hip: commons only along the ridge length; jacks fill the hip triangles
 *
 * Jack common difference (45° hip, jacks parallel to commons):
 *   CD = s / cos(θ)
 *   jack_i = L − i · CD   (diminishing towards the hip)
 *
 * Hip rafter: (span/2 + O) · √(2 + tan²θ)  — same as covering hip length.
 *
 * Collar ties: ~⅓ down from the ridge, length ≈ (2/3) · span, every third pair.
 * Purlins: one per slope, length ≈ building length (indicative 75 × 200).
 *
 * Member sizes are SPAN-TABLE INDICATIVE for C16, not designed.
 */
export function calcCutRoof(geometry: DerivedGeometry, roofing: RoofingInputs): CutRoofResult {
  const dims = roofPlanDims(geometry, roofing)
  const notes: string[] = [
    'Indicative C16 span-table sizes only — not a structural design. Check Approved Document A / Eurocode 5.',
  ]

  const θ = dims.pitchRad
  const spacing = roofing.rafterSpacingMm
  const plate = roofing.wallPlateWidthMm

  const commonRafterLengthMm = dims.slopeLengthMm
  const lengthToBirdsmouthMm =
    Math.cos(θ) > 0 ? dims.spanMm / 2 / Math.cos(θ) : 0
  const riseToFasciaMm = dims.rafterRunMm * Math.tan(θ)
  const plumbCutDeg = dims.pitchDeg
  const seatCutDeg = 90 - dims.pitchDeg
  const seatCutMm = plate
  const birdsMouthPlumbMm = plate * Math.tan(θ)

  const rafterSection = indicativeRafterSection(dims.spanMm / 2, spacing)

  const commonsPerSlope =
    dims.shape === 'gable-gable'
      ? Math.floor(dims.lengthMm / spacing) + 1
      : dims.ridgeMm > 0
        ? Math.floor(dims.ridgeMm / spacing) + 1
        : 0
  const commonRafterCount = commonsPerSlope * 2

  const ridgeBoardMm = dims.ridgeMm
  const ridgeSection = '25 × 175 C16 ridge board'

  const wallPlateMm =
    dims.shape === 'gable-gable'
      ? 2 * dims.lengthMm
      : 2 * (dims.lengthMm + dims.spanMm)
  const wallPlateSection = '47 × 100 C16 wall plate'

  const jackCommonDifferenceMm = Math.cos(θ) > 0 ? spacing / Math.cos(θ) : 0
  // Gable: 0 hip sets; gable-hip: 4 sets (2 hips × 2 surfaces); hip-hip: 8 sets.
  const jackSets = dims.shape === 'hip-hip' ? 8 : dims.shape === 'gable-hip' ? 4 : 0
  const jacksPerSet =
    jackSets === 0 ? 0 : Math.max(0, Math.floor(dims.spanMm / 2 / spacing) - 1)
  const jackRafters: JackRafter[] = []
  for (let i = 1; i <= jacksPerSet; i++) {
    const lengthMm = Math.max(0, commonRafterLengthMm - i * jackCommonDifferenceMm)
    jackRafters.push({ index: i, lengthMm })
  }
  const jackCount = jackRafters.length * jackSets

  const collarTieLengthMm = (2 / 3) * dims.spanMm
  const collarTieCount = Math.ceil(commonsPerSlope / 3)
  const collarSection = '47 × 100 C16 collar'

  const purlinCount = dims.shape === 'gable-gable' || dims.ridgeMm > 0 ? 2 : 2
  const purlinLengthMm = dims.lengthMm
  const purlinSection = '75 × 200 C24 purlin (check bearing)'

  const hipTimberM = mmToM(dims.totalHipMm)
  const valleyTimberM = mmToM(dims.valleyMm)
  const totalTimberM =
    mmToM(commonRafterLengthMm) * commonRafterCount +
    mmToM(jackRafters.reduce((s, j) => s + j.lengthMm, 0)) * jackSets +
    mmToM(ridgeBoardMm) +
    mmToM(wallPlateMm) +
    hipTimberM +
    valleyTimberM +
    mmToM(collarTieLengthMm) * collarTieCount +
    mmToM(purlinLengthMm) * purlinCount

  if (birdsMouthPlumbMm > 50) {
    notes.push(
      `Bird’s mouth plumb cut ${birdsMouthPlumbMm.toFixed(0)} mm — keep remaining depth ≥ ⅔ of rafter depth.`,
    )
  }

  return {
    mode: 'cut',
    dims,
    plumbCutDeg,
    seatCutDeg,
    seatCutMm,
    birdsMouthPlumbMm,
    commonRafterLengthMm,
    lengthToBirdsmouthMm,
    riseToFasciaMm,
    rafterSection,
    commonsPerSlope,
    commonRafterCount,
    ridgeBoardMm,
    ridgeSection,
    wallPlateMm,
    wallPlateSection,
    hipCount: dims.hipCount,
    hipLengthMm: dims.hipLengthMm,
    valleyMm: dims.valleyMm,
    jackCommonDifferenceMm,
    jackRafters,
    jackCount,
    collarTieLengthMm,
    collarTieCount,
    collarSection,
    purlinLengthMm,
    purlinCount,
    purlinSection,
    totalTimberM,
    notes,
  }
}

/**
 * Rough C16 rafter size from half-span (ridge to plate) and centres.
 * These are order-of-magnitude only and ignore snow/wind/purlin support.
 */
export function indicativeRafterSection(halfSpanMm: number, spacingMm: number): string {
  const spanM = mmToM(halfSpanMm)
  const tight = spacingMm <= 400
  if (spanM <= 2.1) return tight ? '47 × 100 C16' : '47 × 125 C16'
  if (spanM <= 2.6) return tight ? '47 × 125 C16' : '47 × 150 C16'
  if (spanM <= 3.2) return tight ? '47 × 150 C16' : '47 × 175 C16'
  return '47 × 200 C16 (or introduce a purlin)'
}

/**
 * Truss roof: 600 mm centres (brief). Count = floor(length / 0.6) + 1 (truss at each gable).
 * Member sizes are typical factory sections for a modest domestic span — confirm with the fabricator.
 * Attic trusses carry a floor: flag heavier joists / deck. Cost ≈ £85 / m² footprint.
 */
export function calcTrussRoof(
  geometry: DerivedGeometry,
  roofing: RoofingInputs,
): TrussRoofResult {
  const dims = roofPlanDims(geometry, roofing)
  const centresMm = 600
  const trussCount = dims.lengthMm > 0 ? Math.floor(dims.lengthMm / centresMm) + 1 : 0
  const members = trussMembers(roofing.trussType, dims)
  const timberPerTrussM = members.reduce(
    (sum, m) => sum + mmToM(m.lengthMm) * m.countPerTruss,
    0,
  )
  const totalTimberM = timberPerTrussM * trussCount
  const footprintM2 = geometry.footprintM2
  const indicativeCostGbp = footprintM2 * TRUSS_COST_PER_M2
  const atticFloorWarning = roofing.trussType === 'attic'

  const notes = [
    'Truss layout at 600 mm centres including a truss on each gable/end.',
    'Eaves overhang is usually a ladder or clipped overhang — not included in fabricator span.',
    `Indicative supply cost ${TRUSS_COST_PER_M2.toFixed(0)} £/m² of footprint — confirm with manufacturer.`,
  ]
  if (atticFloorWarning) {
    notes.push(
      'Attic truss: specify a heavier floor joist / attic deck. Do not treat the bottom chord as a standard Fink joist.',
    )
  }

  return {
    mode: 'truss',
    dims,
    trussType: roofing.trussType,
    centresMm,
    trussCount,
    members,
    timberPerTrussM,
    totalTimberM,
    footprintM2,
    indicativeCostGbp,
    atticFloorWarning,
    notes,
  }
}

export function calcCarpentry(geometry: DerivedGeometry, roofing: RoofingInputs): CarpentryResult {
  return roofing.carpentryMode === 'truss'
    ? calcTrussRoof(geometry, roofing)
    : calcCutRoof(geometry, roofing)
}

function trussMembers(type: TrussType, dims: RoofPlanDims): TrussMember[] {
  const top = dims.spanMm / 2 / Math.max(Math.cos(dims.pitchRad), 1e-6)
  const bottom = dims.spanMm
  const rise = (dims.spanMm / 2) * Math.tan(dims.pitchRad)
  const web = rise * 0.85

  switch (type) {
    case 'fink':
      return [
        { name: 'Top chord', section: '35 × 97 TR26', lengthMm: top, countPerTruss: 2 },
        { name: 'Bottom chord', section: '35 × 72 TR26', lengthMm: bottom, countPerTruss: 1 },
        { name: 'Webs (W)', section: '35 × 72 TR26', lengthMm: web, countPerTruss: 4 },
      ]
    case 'attic':
      return [
        { name: 'Rafter / top chord', section: '47 × 147 TR26', lengthMm: top, countPerTruss: 2 },
        {
          name: 'Floor joist (heavy)',
          section: '47 × 198 TR26',
          lengthMm: bottom,
          countPerTruss: 1,
        },
        { name: 'Collar / attic wall', section: '47 × 97 TR26', lengthMm: rise, countPerTruss: 2 },
        { name: 'Webs', section: '35 × 97 TR26', lengthMm: web, countPerTruss: 2 },
      ]
    case 'mono-pitch':
      return [
        {
          name: 'Top chord',
          section: '35 × 97 TR26',
          lengthMm: dims.spanMm / Math.max(Math.cos(dims.pitchRad), 1e-6),
          countPerTruss: 1,
        },
        { name: 'Bottom chord', section: '35 × 72 TR26', lengthMm: bottom, countPerTruss: 1 },
        { name: 'King / webs', section: '35 × 72 TR26', lengthMm: rise, countPerTruss: 2 },
      ]
    case 'scissor':
      return [
        { name: 'Top chord', section: '35 × 97 TR26', lengthMm: top, countPerTruss: 2 },
        {
          name: 'Scissor bottom',
          section: '35 × 97 TR26',
          lengthMm: top * 0.95,
          countPerTruss: 2,
        },
        { name: 'Webs', section: '35 × 72 TR26', lengthMm: web, countPerTruss: 2 },
      ]
    case 'raised-tie':
      return [
        { name: 'Top chord', section: '35 × 97 TR26', lengthMm: top, countPerTruss: 2 },
        {
          name: 'Raised tie',
          section: '35 × 97 TR26',
          lengthMm: bottom * 0.7,
          countPerTruss: 1,
        },
        { name: 'Hangers / webs', section: '35 × 72 TR26', lengthMm: web, countPerTruss: 4 },
      ]
  }
}

export function pitchLabel(deg: number): string {
  return `${deg.toFixed(0)}° pitch`
}
