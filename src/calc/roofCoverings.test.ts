import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, DEFAULT_ROOFING } from '../types/job'
import { deriveGeometry } from '../geometry/derive'
import { calcCoverings, coveringGaugeMm, roofPlanDims } from './roofCoverings'
import type { Wall } from '../types/job'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls })
}

describe('roof coverings', () => {
  it('uses 1/cos(pitch) for gable slope area including eaves overhang', () => {
    const g = boxPlan(8000, 6000)
    const roofing = { ...DEFAULT_ROOFING, pitchDeg: 35, eavesOverhangMm: 450, roofShape: 'gable-gable' as const }
    const dims = roofPlanDims(g, roofing)
    const planM2 = 8 * (6 + 2 * 0.45)
    const slopeM2 = planM2 / Math.cos((35 * Math.PI) / 180)
    expect(dims.planRoofM2).toBeCloseTo(planM2, 5)
    expect(dims.slopeAreaM2).toBeCloseTo(slopeM2, 5)
    expect(dims.vergeCount).toBe(4)
    expect(dims.hipCount).toBe(0)
  })

  it('uses double-lap gauge for slates and single-lap for tiles', () => {
    expect(
      coveringGaugeMm({
        ...DEFAULT_ROOFING.covering,
        type: 'tile',
        tileLengthMm: 420,
        headlapMm: 75,
      }),
    ).toBe(345)
    expect(
      coveringGaugeMm({
        ...DEFAULT_ROOFING.covering,
        type: 'slate',
        tileLengthMm: 500,
        headlapMm: 100,
      }),
    ).toBe(200)
  })

  it('adds 20% batten waste and packs 10 per bundle of 3.6 m', () => {
    const g = boxPlan(8000, 6000)
    const result = calcCoverings(g, DEFAULT_ROOFING)
    expect(result.battenLinearWithWasteM).toBeCloseTo(result.battenLinearM * 1.2, 8)
    const packed = result.battenBundles * 3.6 * 10
    expect(packed).toBeGreaterThanOrEqual(result.battenLinearWithWasteM)
  })

  it('counts four hips on a hip-to-hip roof and shortens the ridge', () => {
    const g = boxPlan(8000, 6000)
    const dims = roofPlanDims(g, { ...DEFAULT_ROOFING, roofShape: 'hip-hip' })
    expect(dims.hipCount).toBe(4)
    expect(dims.ridgeMm).toBe(2000)
    expect(dims.vergeCount).toBe(0)
  })

  it('adds dormer slope/cheeks/valleys and deducts rooflights from tiles', () => {
    const g = boxPlan(8000, 6000)
    const base = calcCoverings(g, DEFAULT_ROOFING)
    const withDormer = calcCoverings(g, {
      ...DEFAULT_ROOFING,
      covering: {
        ...DEFAULT_ROOFING.covering,
        dormers: 1,
        dormerWidthMm: 1500,
        dormerCheekHeightMm: 1500,
        dormerRoofDepthMm: 1800,
      },
    })
    expect(withDormer.dormerSlopeM2).toBeGreaterThan(0)
    expect(withDormer.dormerCheekM2).toBeGreaterThan(0)
    expect(withDormer.dormerValleyM).toBeGreaterThan(0)
    expect(withDormer.tilesRequired).toBeGreaterThan(base.tilesRequired)
    expect(withDormer.valleyM).toBeGreaterThan(base.valleyM)

    const withLight = calcCoverings(g, {
      ...DEFAULT_ROOFING,
      covering: {
        ...DEFAULT_ROOFING.covering,
        rooflights: 2,
        rooflightWidthMm: 780,
        rooflightHeightMm: 1180,
      },
    })
    expect(withLight.rooflightDeductM2).toBeCloseTo(2 * 0.78 * 1.18, 5)
    expect(withLight.rooflightFlashings).toBe(2)
    expect(withLight.tilesRequired).toBeLessThan(base.tilesRequired)
  })

  it('counts snow-guard length from eaves and clips at 400 mm centres', () => {
    const g = boxPlan(8000, 6000)
    const r = calcCoverings(g, {
      ...DEFAULT_ROOFING,
      covering: { ...DEFAULT_ROOFING.covering, snowGuards: true, snowGuardRows: 2, snowGuardLengthOverrideMm: null },
    })
    expect(r.snowGuardM).toBeCloseTo(2 * (2 * 8), 5)
    expect(r.snowGuardClips).toBeGreaterThan(0)
  })
})
