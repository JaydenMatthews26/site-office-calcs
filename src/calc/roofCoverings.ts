import type { DerivedGeometry } from '../geometry/derive'
import type { CoveringInputs, RoofingInputs, RoofShape } from '../types/job'
import { degToRad, hypot, mmToM } from './units'

export interface RoofPlanDims {
  spanMm: number
  lengthMm: number
  pitchRad: number
  pitchDeg: number
  overhangMm: number
  shape: RoofShape
  /** Horizontal run from ridge to fascia (half span + eaves overhang). */
  rafterRunMm: number
  /** Slope length from ridge to fascia. */
  slopeLengthMm: number
  /** Plan area of the roof including eaves overhangs, m². */
  planRoofM2: number
  /** True slope area (plan / cos pitch). */
  slopeAreaM2: number
  ridgeMm: number
  hipCount: number
  /** Each hip/valley length fascia to ridge, mm. */
  hipLengthMm: number
  totalHipMm: number
  valleyMm: number
  vergeCount: number
  totalVergeMm: number
  eavesLengthMm: number
}

/**
 * Roof plan take-off from the floor-plan bounding box (or user overrides).
 *
 * Assumptions for the POC (rectangular footprint, constant pitch):
 * - Rafters span the shorter plan dimension (`spanMm`).
 * - Ridge runs along the longer dimension (`lengthMm`).
 * - Hip ends are 45° on plan (equal pitch all round).
 *
 * Gable-to-gable ridge ≈ building length.
 * Hip-to-hip ridge ≈ length − span (hips eat span/2 from each end).
 * Gable-to-hip ridge ≈ length − span/2.
 *
 * Slope area:
 *   A_slope = A_plan / cos(θ)
 * For a constant-pitch roof the true area is the plan area scaled by 1/cos(pitch),
 * including hips (the extra hip triangles still sit on the same pitch).
 */
export function roofPlanDims(geometry: DerivedGeometry, roofing: RoofingInputs): RoofPlanDims {
  const spanMm = roofing.spanOverrideMm ?? geometry.spanMm
  const lengthMm = roofing.lengthOverrideMm ?? geometry.lengthMm
  const pitchDeg = roofing.pitchDeg
  const pitchRad = degToRad(pitchDeg)
  const overhangMm = roofing.eavesOverhangMm
  const shape = roofing.roofShape
  const extraValleyMm = roofing.covering.extraValleyMm

  const rafterRunMm = spanMm / 2 + overhangMm
  // slope = run / cos(θ)  = √(run² + rise²)  where rise = run · tan(θ)
  const slopeLengthMm = Math.cos(pitchRad) > 0 ? rafterRunMm / Math.cos(pitchRad) : 0

  let ridgeMm = 0
  let hipCount = 0
  let vergeCount = 0
  let planLengthMm = lengthMm
  let planSpanMm = spanMm + 2 * overhangMm

  switch (shape) {
    case 'gable-gable':
      ridgeMm = lengthMm
      hipCount = 0
      vergeCount = 4 // two gables × two slopes
      planLengthMm = lengthMm
      break
    case 'gable-hip':
      ridgeMm = Math.max(0, lengthMm - spanMm / 2)
      hipCount = 2
      vergeCount = 2
      planLengthMm = lengthMm + overhangMm
      break
    case 'hip-hip':
      ridgeMm = Math.max(0, lengthMm - spanMm)
      hipCount = 4
      vergeCount = 0
      planLengthMm = lengthMm + 2 * overhangMm
      break
  }

  const planRoofM2 = mmToM(planLengthMm) * mmToM(planSpanMm)
  const slopeAreaM2 = Math.cos(pitchRad) > 0 ? planRoofM2 / Math.cos(pitchRad) : 0

  // Hip length (ridge to fascia) on a 45° hip:
  // hip run on plan = √2 · (span/2 + overhang)
  // hip rise        = (span/2 + overhang) · tan(θ)
  // hip length      = (span/2 + O) · √(2 + tan²θ)
  const hipLeg = spanMm / 2 + overhangMm
  const hipLengthMm = hipLeg * Math.sqrt(2 + Math.tan(pitchRad) ** 2)
  const totalHipMm = hipCount * hipLengthMm

  const valleyMm = extraValleyMm
  const totalVergeMm = vergeCount * slopeLengthMm

  // Eaves length: gable roof has two eaves; hip roof eaves follow the plan perimeter of the roof.
  const eavesLengthMm =
    shape === 'gable-gable'
      ? 2 * lengthMm
      : 2 * (planLengthMm + planSpanMm)

  return {
    spanMm,
    lengthMm,
    pitchRad,
    pitchDeg,
    overhangMm,
    shape,
    rafterRunMm,
    slopeLengthMm,
    planRoofM2,
    slopeAreaM2,
    ridgeMm,
    hipCount,
    hipLengthMm,
    totalHipMm,
    valleyMm,
    vergeCount,
    totalVergeMm,
    eavesLengthMm,
  }
}

export interface CoveringResult {
  dims: RoofPlanDims
  gaugeMm: number
  coverWidthMm: number
  tilesRequired: number
  battenLinearM: number
  battenLinearWithWasteM: number
  battenBundles: number
  feltLabel: string
  feltRolls: number
  feltRollSpec: string
  ridgeTiles: number
  hipTiles: number
  vergeM: number
  valleyM: number
  /** Extra slope from gable-front dormer roofs (plan / cos pitch). */
  dormerSlopeM2: number
  /** Two triangular tile-hung cheeks per dormer. */
  dormerCheekM2: number
  /** Extra valley run from two valleys per dormer. */
  dormerValleyM: number
  /** Extra verge on two dormer front rakes. */
  dormerVergeM: number
  rooflightDeductM2: number
  rooflightFlashings: number
  netCoverM2: number
  snowGuardM: number
  snowGuardClips: number
  notes: string[]
}

/**
 * Batten gauge (BS 5534):
 * - Single-lap interlocking tile: gauge = tile length − headlap
 *   (typical concrete 420 mm tile, 75 mm headlap → 345 mm gauge).
 * - Double-lap slate: gauge = (slate length − headlap) / 2
 *   (typical 500 × 250 slate, 100 mm headlap → 200 mm gauge).
 *
 * Cover width = tile width − sidelap (interlocking nib-to-nib cover).
 *
 * Battens: linear metres ≈ slope area / gauge. Sold 10 / bundle, +20% waste (brief).
 * Felt: bitumen 1F ~15 m × 1 m with 150 mm side lap; breathable ~50 m × 1.5 m with 150 mm lap.
 */
/**
 * Gable-front dormer extras (equal pitch to the main roof):
 *   dormer roof plan ≈ width × depth; slope = plan / cos(θ)
 *   two triangular cheeks ≈ 2 × ½ × depth × cheek height
 *   two valleys ≈ 2 × dormer slope length (depth / cos θ)
 *   two front rakes ≈ 2 × hypot(width/2, cheek height) as extra verge
 *
 * Rooflights: deduct width × height from the tiled area only (felt and battens still run).
 *   One flashing kit per unit.
 *
 * Snow guards: rows × run (override or eaves length). Clips at 400 mm centres + 1.
 */
export function calcCoverings(geometry: DerivedGeometry, roofing: RoofingInputs): CoveringResult {
  const dims = roofPlanDims(geometry, roofing)
  const c = roofing.covering
  const notes: string[] = []
  const pitchRad = dims.pitchRad
  const cosPitch = Math.cos(pitchRad)

  const nDormers = Math.max(0, Math.round(c.dormers))
  const dormerPlanM2 = nDormers * mmToM(c.dormerWidthMm) * mmToM(c.dormerRoofDepthMm)
  const dormerSlopeM2 = cosPitch > 0 ? dormerPlanM2 / cosPitch : 0
  const dormerCheekM2 = nDormers * mmToM(c.dormerRoofDepthMm) * mmToM(c.dormerCheekHeightMm)
  const dormerSlopeLengthMm = cosPitch > 0 ? c.dormerRoofDepthMm / cosPitch : 0
  const dormerValleyM = nDormers * 2 * mmToM(dormerSlopeLengthMm)
  const dormerRakeMm = hypot(c.dormerWidthMm / 2, c.dormerCheekHeightMm)
  const dormerVergeM = nDormers * 2 * mmToM(dormerRakeMm)

  const nLights = Math.max(0, Math.round(c.rooflights))
  const rooflightDeductM2 = nLights * mmToM(c.rooflightWidthMm) * mmToM(c.rooflightHeightMm)
  const rooflightFlashings = nLights

  const netCoverM2 = Math.max(0, dims.slopeAreaM2 + dormerSlopeM2 + dormerCheekM2 - rooflightDeductM2)
  const battenAreaM2 = dims.slopeAreaM2 + dormerSlopeM2 + dormerCheekM2
  const feltAreaM2 = dims.slopeAreaM2 + dormerSlopeM2

  const gaugeMm = coveringGaugeMm(c)
  const coverWidthMm = Math.max(1, c.tileWidthMm - c.sidelapMm)

  const tileCoverM2 = mmToM(gaugeMm) * mmToM(coverWidthMm)
  const tilesRequired = tileCoverM2 > 0 ? Math.ceil(netCoverM2 / tileCoverM2) : 0

  // Linear metres of batten = rows × eaves width, equivalent to slopeArea / gauge.
  const battenLinearM = gaugeMm > 0 ? battenAreaM2 / mmToM(gaugeMm) : 0
  const battenLinearWithWasteM = battenLinearM * 1.2
  const metresPerBundle = c.battenLengthM * c.battensPerBundle
  const battenBundles =
    metresPerBundle > 0 ? Math.ceil(battenLinearWithWasteM / metresPerBundle) : 0

  const felt = feltTakeoff(c.felt, feltAreaM2)

  const ridgeCoverMm = Math.max(1, c.ridgeTileLengthMm - c.ridgeTileLapMm)
  const ridgeTiles = Math.ceil(dims.ridgeMm / ridgeCoverMm)
  const hipTiles = Math.ceil(dims.totalHipMm / ridgeCoverMm)

  const snowGuardM = c.snowGuards
    ? Math.max(1, c.snowGuardRows) * mmToM(c.snowGuardLengthOverrideMm ?? dims.eavesLengthMm)
    : 0
  const snowGuardClips = c.snowGuards ? Math.ceil(snowGuardM / 0.4) + Math.max(1, c.snowGuardRows) : 0

  if (nDormers > 0) {
    notes.push(
      `${nDormers} gable-front dormer(s): +${dormerSlopeM2.toFixed(2)} m² roof, +${dormerCheekM2.toFixed(2)} m² cheeks, +${dormerValleyM.toFixed(2)} m valley, +${dormerVergeM.toFixed(2)} m verge.`,
    )
  }
  if (nLights > 0) {
    notes.push(
      `${nLights} rooflight(s) ${c.rooflightWidthMm} × ${c.rooflightHeightMm} mm — ${rooflightDeductM2.toFixed(2)} m² deducted from tiles, ${rooflightFlashings} flashing kit(s). Felt/battens still run.`,
    )
  }
  if (c.snowGuards) {
    notes.push(
      `Snow guards: ${Math.max(1, c.snowGuardRows)} row(s) · ${snowGuardM.toFixed(2)} m · ${snowGuardClips} clips at 400 mm centres.`,
    )
  }
  notes.push('Take-off aid only. Confirm laps, exposure grading and BS 5534 fixing schedule on site.')

  return {
    dims,
    gaugeMm,
    coverWidthMm,
    tilesRequired,
    battenLinearM,
    battenLinearWithWasteM,
    battenBundles,
    feltLabel: felt.label,
    feltRolls: felt.rolls,
    feltRollSpec: felt.spec,
    ridgeTiles,
    hipTiles,
    vergeM: mmToM(dims.totalVergeMm) + dormerVergeM,
    valleyM: mmToM(dims.valleyMm) + dormerValleyM,
    dormerSlopeM2,
    dormerCheekM2,
    dormerValleyM,
    dormerVergeM,
    rooflightDeductM2,
    rooflightFlashings,
    netCoverM2,
    snowGuardM,
    snowGuardClips,
    notes,
  }
}

export function coveringGaugeMm(c: CoveringInputs): number {
  if (c.type === 'slate') {
    // Double-lap: gauge = (length − headlap) / 2
    return Math.max(1, (c.tileLengthMm - c.headlapMm) / 2)
  }
  // Single-lap interlocking
  return Math.max(1, c.tileLengthMm - c.headlapMm)
}

function feltTakeoff(
  style: CoveringInputs['felt'],
  slopeAreaM2: number,
): { label: string; rolls: number; spec: string } {
  if (style === 'bitumen') {
    // 15 m × 1.0 m roll, 150 mm side lap → 0.85 m effective width → 12.75 m² / roll
    const effectiveM2 = 15 * 0.85
    return {
      label: 'Bitumen (1F type)',
      spec: '15 m × 1.0 m rolls, 150 mm laps',
      rolls: Math.ceil(slopeAreaM2 / effectiveM2),
    }
  }
  // Breathable: 50 m × 1.5 m, 150 mm lap → 1.35 m effective → 67.5 m² / roll
  const effectiveM2 = 50 * 1.35
  return {
    label: 'Breathable membrane',
    spec: '50 m × 1.5 m rolls, 150 mm laps',
    rolls: Math.ceil(slopeAreaM2 / effectiveM2),
  }
}

export const TILE_PRESETS: { id: string; label: string; patch: Partial<CoveringInputs> }[] = [
  {
    id: 'concrete-interlock',
    label: 'Concrete interlocking 420 × 330',
    patch: {
      type: 'tile',
      tileLengthMm: 420,
      tileWidthMm: 330,
      headlapMm: 75,
      sidelapMm: 30,
    },
  },
  {
    id: 'clay-pantile',
    label: 'Clay pantile 400 × 330',
    patch: {
      type: 'tile',
      tileLengthMm: 400,
      tileWidthMm: 330,
      headlapMm: 70,
      sidelapMm: 30,
    },
  },
  {
    id: 'natural-slate',
    label: 'Natural slate 500 × 250 (double lap)',
    patch: {
      type: 'slate',
      tileLengthMm: 500,
      tileWidthMm: 250,
      headlapMm: 100,
      sidelapMm: 0,
    },
  },
  {
    id: 'fibre-slate',
    label: 'Fibre-cement slate 600 × 300',
    patch: {
      type: 'slate',
      tileLengthMm: 600,
      tileWidthMm: 300,
      headlapMm: 110,
      sidelapMm: 0,
    },
  },
]
