import type { DerivedGeometry } from '../geometry/derive'
import type { CoveringInputs, RoofingInputs, RoofShape } from '../types/job'
import { degToRad, mmToM } from './units'

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
export function calcCoverings(geometry: DerivedGeometry, roofing: RoofingInputs): CoveringResult {
  const dims = roofPlanDims(geometry, roofing)
  const c = roofing.covering
  const notes: string[] = []

  const gaugeMm = coveringGaugeMm(c)
  const coverWidthMm = Math.max(1, c.tileWidthMm - c.sidelapMm)

  const tileCoverM2 = mmToM(gaugeMm) * mmToM(coverWidthMm)
  const tilesRequired = tileCoverM2 > 0 ? Math.ceil(dims.slopeAreaM2 / tileCoverM2) : 0

  // Linear metres of batten = rows × eaves width, equivalent to slopeArea / gauge.
  const battenLinearM = gaugeMm > 0 ? dims.slopeAreaM2 / mmToM(gaugeMm) : 0
  const battenLinearWithWasteM = battenLinearM * 1.2
  const metresPerBundle = c.battenLengthM * c.battensPerBundle
  const battenBundles =
    metresPerBundle > 0 ? Math.ceil(battenLinearWithWasteM / metresPerBundle) : 0

  const felt = feltTakeoff(c.felt, dims.slopeAreaM2)

  const ridgeCoverMm = Math.max(1, c.ridgeTileLengthMm - c.ridgeTileLapMm)
  const ridgeTiles = Math.ceil(dims.ridgeMm / ridgeCoverMm)
  const hipTiles = Math.ceil(dims.totalHipMm / ridgeCoverMm)

  if (c.dormers > 0) {
    notes.push(
      `${c.dormers} dormer(s) flagged — add cheeks, roof and valley by hand (advanced stub).`,
    )
  }
  if (c.rooflights > 0) {
    notes.push(
      `${c.rooflights} rooflight(s) flagged — deduct from tile count when sizes are known (stub).`,
    )
  }
  if (c.snowGuards) {
    notes.push('Snow guards opted in — typically 1–2 rows above openings / eaves (stub).')
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
    vergeM: mmToM(dims.totalVergeMm),
    valleyM: mmToM(dims.valleyMm),
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
