import type { DerivedGeometry } from '../geometry/derive'
import type { FasciaMaterial, FasciasInputs, GutterMaterial, RoofingInputs } from '../types/job'
import { roofPlanDims } from './roofCoverings'
import { mmToM } from './units'

/** Indicative supply-only rates, £ (UK ballpark — not a quote). */
export const FASCIA_GBP_PER_M: Record<FasciaMaterial, number> = { pvcu: 12, timber: 9 }
export const SOFFIT_GBP_PER_M2: Record<FasciaMaterial, number> = { pvcu: 18, timber: 14 }
export const BARGE_GBP_PER_M: Record<FasciaMaterial, number> = { pvcu: 12, timber: 9 }
export const PAINT_TIN_GBP = 22

export const GUTTER_GBP_PER_M: Record<GutterMaterial, number> = {
  plastic: 10,
  metal: 22,
  aluminium: 28,
  copper: 55,
}
export const DOWNPIPE_GBP_PER_M: Record<GutterMaterial, number> = {
  plastic: 8,
  metal: 18,
  aluminium: 22,
  copper: 45,
}
export const OUTLET_GBP: Record<GutterMaterial, number> = {
  plastic: 6,
  metal: 12,
  aluminium: 14,
  copper: 22,
}
export const ELBOW_GBP: Record<GutterMaterial, number> = {
  plastic: 4,
  metal: 9,
  aluminium: 11,
  copper: 18,
}

/**
 * Roof area per downpipe (half-round 112 mm, typical UK rule of thumb).
 * Confirm against BS EN 12056-3 / manufacturer capacity tables.
 */
export const ROOF_M2_PER_OUTLET = 50

/** Offset bends per downpipe (fascia face back to the wall). */
export const ELBOWS_PER_OUTLET = 2

export const GUTTER_MATERIAL_PRESETS: {
  id: GutterMaterial
  label: string
  gutterPieceLengthM: number
  downpipePieceLengthM: number
}[] = [
  { id: 'plastic', label: 'Plastic (uPVC)', gutterPieceLengthM: 4, downpipePieceLengthM: 4 },
  { id: 'metal', label: 'Galvanised steel (metal)', gutterPieceLengthM: 3, downpipePieceLengthM: 3 },
  { id: 'aluminium', label: 'Aluminium', gutterPieceLengthM: 3, downpipePieceLengthM: 3 },
  { id: 'copper', label: 'Copper', gutterPieceLengthM: 3, downpipePieceLengthM: 3 },
]

export const PVCU_COLOURS = [
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'anthracite', label: 'Anthracite grey' },
  { id: 'rosewood', label: 'Rosewood' },
  { id: 'cream', label: 'Cream' },
] as const

export interface PaintResult {
  colour: string
  fasciaFaceM2: number
  soffitUndersideM2: number
  bargeFaceM2: number
  areaPerCoatM2: number
  coats: number
  totalAreaM2: number
  litres: number
  tinL: number
  tins: number
  coverageM2PerL: number
  indicativeCostGbp: number
}

export interface FasciasResult {
  /** Eaves run driving fascia / soffit (and gable gutter), mm. */
  eavesRunMm: number
  eavesRunFromPlanMm: number
  propertyWidthMm: number
  propertyWidthFromPlanMm: number
  eavesHeightMm: number
  eavesHeightFromPlanMm: number
  soffitWidthMm: number
  fasciaLinearM: number
  soffitLinearM: number
  bargeLinearM: number
  soffitAreaM2: number
  soffitBoardsAcross: number
  fasciaBoards: number
  soffitBoards: number
  bargeBoards: number
  wastePct: number
  fasciaRuns: number
  gutterRuns: number
  gutterLinearM: number
  gutterPieces: number
  gutterUnions: number
  gutterStopEnds: number
  gutterBrackets: number
  outlets: number
  elbows: number
  downpipeLengthPerOutletMm: number
  downpipeTotalM: number
  downpipePieces: number
  paint: PaintResult | null
  fasciaCostGbp: number
  soffitCostGbp: number
  bargeCostGbp: number
  gutterCostGbp: number
  indicativeTotalGbp: number
  notes: string[]
}

function ceilDiv(value: number, size: number): number {
  if (size <= 0 || value <= 0) return 0
  return Math.ceil(value / size)
}

function withWaste(linearM: number, wastePct: number): number {
  return linearM * (1 + Math.max(0, wastePct) / 100)
}

/**
 * Fascia, soffit and gutter take-off.
 *
 * Linear metres (eaves run) — plan is the source of truth, fields stay overridable:
 *   property width  W = override ?? longer plan dimension (geometry.lengthMm)
 *   gable eaves     = 2 × W                         (front + rear gutters / fascia)
 *   hip eaves       = roofing eavesLengthMm         (plan perimeter + overhangs)
 *   fallback        = geometry.eavesPerimeterMm     (external wall length)
 *
 * Soffit width defaults to the roofing eaves overhang (the horizontal projection
 * the soffit board covers). Soffit area = eaves run × soffit width.
 *
 * Boards:
 *   n = ceil( linearM × (1 + waste%/100) / boardLengthM )
 *   PVCU typically 5.0 m; timber PAR typically 5.1 m.
 *   Soffit boards across the overhang: ceil(soffitWidth / soffitBoardWidth).
 *
 * Bargeboards (gables, optional):
 *   linear = roofing totalVergeMm (vergeCount × slope length).
 *
 * Timber paint (PVCU skips this — maintenance-free):
 *   face area per coat = fasciaDepth × fasciaLinear
 *                      + soffitWidth × soffitLinear
 *                      + fasciaDepth × bargeLinear
 *   litres = (area × coats) / coverage   (typical 12 m²/L, 2 coats)
 *   tins   = ceil(litres / tinSizeL)     (typical 2.5 L)
 *
 * Guttering:
 *   gutter linear = override ?? eaves run
 *   runs          = 2 on gable-to-gable, 4 on hip / gable-hip
 *   outlets       = override ?? max(runs, ceil(roof plan m² / 50))
 *   elbows        = override ?? 2 × outlets   (offset around the eaves)
 *   downpipe each = override ?? eaves height (storey height from plan)
 *   total DP      = outlets × length each
 *   pieces        = ceil(gutterLinear / pieceLength)
 *   unions        = max(0, pieces − runs)
 *   stop ends     = 2 × runs
 *   brackets      = ceil(gutterLinear / centres) + 1 per run   (typical 800 mm)
 *
 * Eaves height defaults to plan storeyHeightMm (floor-to-ceiling). Override when
 * the gutter sits over more than one storey or above a floor zone.
 *
 * UK units throughout (mm / m / £). Take-off aid only — not a rainwater design.
 */
export function calcFascias(
  geometry: DerivedGeometry,
  roofing: RoofingInputs,
  fascias: FasciasInputs,
): FasciasResult {
  const dims = roofPlanDims(geometry, roofing)
  const notes: string[] = []

  const propertyWidthFromPlanMm = geometry.lengthMm
  const propertyWidthMm = fascias.propertyWidthOverrideMm ?? propertyWidthFromPlanMm

  const eavesHeightFromPlanMm = geometry.storeyHeightMm
  const eavesHeightMm = fascias.eavesHeightOverrideMm ?? eavesHeightFromPlanMm

  const soffitWidthMm = fascias.soffitWidthOverrideMm ?? roofing.eavesOverhangMm

  const gableEavesFromPlanMm = 2 * propertyWidthFromPlanMm
  const gableEavesMm = 2 * propertyWidthMm
  const hipEavesMm =
    dims.eavesLengthMm > 0 ? dims.eavesLengthMm : geometry.eavesPerimeterMm
  const eavesRunFromPlanMm =
    roofing.roofShape === 'gable-gable'
      ? propertyWidthFromPlanMm > 0
        ? gableEavesFromPlanMm
        : geometry.eavesPerimeterMm
      : hipEavesMm
  const eavesRunDerivedMm =
    roofing.roofShape === 'gable-gable'
      ? propertyWidthMm > 0
        ? gableEavesMm
        : geometry.eavesPerimeterMm
      : hipEavesMm
  const eavesRunMm = fascias.eavesRunOverrideMm ?? eavesRunDerivedMm

  const fasciaRuns = roofing.roofShape === 'gable-gable' ? 2 : 4
  const gutterRuns = fasciaRuns

  const fasciaLinearM = mmToM(eavesRunMm)
  const soffitLinearM = fasciaLinearM
  const bargeLinearM =
    fascias.includeBargeboards && dims.vergeCount > 0 ? mmToM(dims.totalVergeMm) : 0

  const soffitAreaM2 = soffitLinearM * mmToM(soffitWidthMm)
  const soffitBoardsAcross = ceilDiv(soffitWidthMm, fascias.soffitBoardWidthMm)

  const fasciaBoards = ceilDiv(withWaste(fasciaLinearM, fascias.wastePct), fascias.boardLengthM)
  const soffitBoardLinearM = soffitLinearM * Math.max(1, soffitBoardsAcross)
  const soffitBoards = ceilDiv(withWaste(soffitBoardLinearM, fascias.wastePct), fascias.boardLengthM)
  const bargeBoards = ceilDiv(withWaste(bargeLinearM, fascias.wastePct), fascias.boardLengthM)

  const gutterLinearM = mmToM(fascias.gutterRunOverrideMm ?? eavesRunMm)
  const gutterPieces = ceilDiv(gutterLinearM, fascias.gutterPieceLengthM)
  const gutterUnions = Math.max(0, gutterPieces - gutterRuns)
  const gutterStopEnds = gutterLinearM > 0 ? 2 * gutterRuns : 0
  const centresM = mmToM(fascias.gutterBracketCentresMm)
  const gutterBrackets =
    gutterLinearM > 0 && centresM > 0
      ? ceilDiv(gutterLinearM, centresM) + gutterRuns
      : 0

  const roofPlanM2 = dims.planRoofM2
  const outletsFromRoof = ceilDiv(roofPlanM2, ROOF_M2_PER_OUTLET)
  const outletsDerived = Math.max(gutterRuns, outletsFromRoof)
  const outlets = fascias.outletsOverride ?? (gutterLinearM > 0 ? outletsDerived : 0)

  const elbows = fascias.elbowsOverride ?? outlets * ELBOWS_PER_OUTLET
  const downpipeLengthPerOutletMm = fascias.downpipeLengthOverrideMm ?? eavesHeightMm
  const downpipeTotalM = outlets * mmToM(downpipeLengthPerOutletMm)
  const downpipePieces = ceilDiv(downpipeTotalM, fascias.downpipePieceLengthM)

  const paint =
    fascias.material === 'timber'
      ? calcTimberPaint(fascias, fasciaLinearM, soffitLinearM, bargeLinearM, soffitWidthMm)
      : null

  const mat = fascias.material
  const gutterMat = fascias.gutterMaterial
  const fasciaCostGbp = fasciaLinearM * FASCIA_GBP_PER_M[mat]
  const soffitCostGbp = soffitAreaM2 * SOFFIT_GBP_PER_M2[mat]
  const bargeCostGbp = bargeLinearM * BARGE_GBP_PER_M[mat]
  const gutterCostGbp =
    gutterLinearM * GUTTER_GBP_PER_M[gutterMat] +
    downpipeTotalM * DOWNPIPE_GBP_PER_M[gutterMat] +
    outlets * OUTLET_GBP[gutterMat] +
    elbows * ELBOW_GBP[gutterMat]
  const paintCostGbp = paint?.indicativeCostGbp ?? 0
  const indicativeTotalGbp = fasciaCostGbp + soffitCostGbp + bargeCostGbp + gutterCostGbp + paintCostGbp

  if (geometry.wallCount === 0) {
    notes.push('No plan yet — eaves run, property width and height stay at zero until walls are drawn (or override the fields).')
  }
  if (roofing.roofShape !== 'gable-gable' && fascias.includeBargeboards && dims.vergeCount === 0) {
    notes.push('Hip-to-hip has no verges — bargeboards are not required.')
  }
  if (fascias.material === 'pvcu') {
    notes.push('PVCU is maintenance-free in this take-off — paint tins apply to timber only.')
  }
  notes.push(
    'Take-off aid only. Confirm board sizes, gutter capacity (BS EN 12056-3) and downpipe positions on site.',
  )

  return {
    eavesRunMm,
    eavesRunFromPlanMm,
    propertyWidthMm,
    propertyWidthFromPlanMm,
    eavesHeightMm,
    eavesHeightFromPlanMm,
    soffitWidthMm,
    fasciaLinearM,
    soffitLinearM,
    bargeLinearM,
    soffitAreaM2,
    soffitBoardsAcross,
    fasciaBoards,
    soffitBoards,
    bargeBoards,
    wastePct: fascias.wastePct,
    fasciaRuns,
    gutterRuns,
    gutterLinearM,
    gutterPieces,
    gutterUnions,
    gutterStopEnds,
    gutterBrackets,
    outlets,
    elbows,
    downpipeLengthPerOutletMm,
    downpipeTotalM,
    downpipePieces,
    paint,
    fasciaCostGbp,
    soffitCostGbp,
    bargeCostGbp,
    gutterCostGbp,
    indicativeTotalGbp,
    notes,
  }
}

export function calcTimberPaint(
  fascias: FasciasInputs,
  fasciaLinearM: number,
  soffitLinearM: number,
  bargeLinearM: number,
  soffitWidthMm: number,
): PaintResult {
  const fasciaFaceM2 = fasciaLinearM * mmToM(fascias.fasciaDepthMm)
  const soffitUndersideM2 = soffitLinearM * mmToM(soffitWidthMm)
  const bargeFaceM2 = bargeLinearM * mmToM(fascias.fasciaDepthMm)
  const areaPerCoatM2 = fasciaFaceM2 + soffitUndersideM2 + bargeFaceM2
  const totalAreaM2 = areaPerCoatM2 * Math.max(0, fascias.paintCoats)
  const coverage = fascias.paintCoverageM2PerL > 0 ? fascias.paintCoverageM2PerL : 1
  const litres = totalAreaM2 / coverage
  const tinL = fascias.paintTinL > 0 ? fascias.paintTinL : 2.5
  const tins = ceilDiv(litres, tinL)
  return {
    colour: fascias.paintColour,
    fasciaFaceM2,
    soffitUndersideM2,
    bargeFaceM2,
    areaPerCoatM2,
    coats: fascias.paintCoats,
    totalAreaM2,
    litres,
    tinL,
    tins,
    coverageM2PerL: fascias.paintCoverageM2PerL,
    indicativeCostGbp: tins * PAINT_TIN_GBP,
  }
}

export function boardLengthForMaterial(material: FasciaMaterial): number {
  return material === 'timber' ? 5.1 : 5
}
