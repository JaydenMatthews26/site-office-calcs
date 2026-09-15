import { describe, expect, it } from 'vitest'
import { DEFAULT_FASCIAS, DEFAULT_PLAN, DEFAULT_ROOFING } from '../types/job'
import { deriveGeometry } from '../geometry/derive'
import {
  calcFascias,
  ELBOWS_PER_OUTLET,
  PAINT_TIN_GBP,
  ROOF_M2_PER_OUTLET,
} from './fascias'
import type { FasciasInputs, Wall } from '../types/job'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls, storeyHeightMm: 2400 })
}

const gableRoofing = { ...DEFAULT_ROOFING, roofShape: 'gable-gable' as const, eavesOverhangMm: 450 }

describe('fascia / soffit linear metres from plan', () => {
  it('uses 2 × property width (longer plan side) for gable eaves', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, DEFAULT_FASCIAS)
    // Longer side 8 m → two eaves = 16 m fascia and soffit.
    expect(result.propertyWidthMm).toBe(8000)
    expect(result.eavesRunMm).toBe(16000)
    expect(result.fasciaLinearM).toBeCloseTo(16, 8)
    expect(result.soffitLinearM).toBeCloseTo(16, 8)
    expect(result.gutterLinearM).toBeCloseTo(16, 8)
    expect(result.fasciaRuns).toBe(2)
  })

  it('uses roof plan perimeter for hip-to-hip eaves', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, { ...gableRoofing, roofShape: 'hip-hip' }, DEFAULT_FASCIAS)
    // planLength = 8 + 2×0.45, planSpan = 6 + 2×0.45 → perimeter 2×(8.9+6.9)=31.6 m
    expect(result.eavesRunMm).toBeCloseTo(31600, 5)
    expect(result.fasciaRuns).toBe(4)
    expect(result.gutterRuns).toBe(4)
  })

  it('keeps eaves-run and property-width overrides editable', () => {
    const g = boxPlan(8000, 6000)
    const inputs: FasciasInputs = {
      ...DEFAULT_FASCIAS,
      propertyWidthOverrideMm: 10000,
      eavesRunOverrideMm: 22000,
      gutterRunOverrideMm: 18000,
    }
    const result = calcFascias(g, gableRoofing, inputs)
    expect(result.propertyWidthMm).toBe(10000)
    expect(result.eavesRunFromPlanMm).toBe(16000)
    expect(result.eavesRunMm).toBe(22000)
    expect(result.gutterLinearM).toBeCloseTo(18, 8)
  })

  it('updates gable eaves when property width is overridden and eaves is not', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      propertyWidthOverrideMm: 10000,
    })
    expect(result.eavesRunFromPlanMm).toBe(16000)
    expect(result.eavesRunMm).toBe(20000)
    expect(result.gutterLinearM).toBeCloseTo(20, 8)
  })
})

describe('soffit area and boards', () => {
  it('multiplies eaves run by soffit width (default = eaves overhang)', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, DEFAULT_FASCIAS)
    expect(result.soffitWidthMm).toBe(450)
    expect(result.soffitAreaM2).toBeCloseTo(16 * 0.45, 8)
    // 450 mm overhang / 300 mm board → 2 boards across
    expect(result.soffitBoardsAcross).toBe(2)
  })

  it('adds waste then packs fascia boards by sold length', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, { ...DEFAULT_FASCIAS, wastePct: 10, boardLengthM: 5 })
    // 16 m × 1.10 = 17.6 m → ceil(17.6 / 5) = 4 boards
    expect(result.fasciaBoards).toBe(4)
  })
})

describe('timber paint from linear metres', () => {
  it('hides paint on PVCU and shows tins on timber', () => {
    const g = boxPlan(8000, 6000)
    const pvcu = calcFascias(g, gableRoofing, DEFAULT_FASCIAS)
    expect(pvcu.paint).toBeNull()

    const timber = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      material: 'timber',
      includeBargeboards: false,
      paintCoverageM2PerL: 12,
      paintCoats: 2,
      paintTinL: 2.5,
      fasciaDepthMm: 175,
    })
    expect(timber.paint).not.toBeNull()
    const face = 16 * 0.175 + 16 * 0.45
    expect(timber.paint!.areaPerCoatM2).toBeCloseTo(face, 8)
    expect(timber.paint!.totalAreaM2).toBeCloseTo(face * 2, 8)
    expect(timber.paint!.litres).toBeCloseTo((face * 2) / 12, 8)
    expect(timber.paint!.tins).toBe(Math.ceil(timber.paint!.litres / 2.5))
    expect(timber.paint!.indicativeCostGbp).toBe(timber.paint!.tins * PAINT_TIN_GBP)
  })

  it('includes barge face area when gable bargeboards are on', () => {
    const g = boxPlan(8000, 6000)
    const off = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      material: 'timber',
      includeBargeboards: false,
    })
    const on = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      material: 'timber',
      includeBargeboards: true,
    })
    expect(on.bargeLinearM).toBeGreaterThan(0)
    expect(on.paint!.areaPerCoatM2).toBeGreaterThan(off.paint!.areaPerCoatM2)
  })
})

describe('guttering from plan + manual fields', () => {
  it('defaults eaves height from storey height and downpipes from outlets × height', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, DEFAULT_FASCIAS)
    expect(result.eavesHeightMm).toBe(2400)
    const roofPlanM2 = 8 * (6 + 2 * 0.45)
    const fromArea = Math.ceil(roofPlanM2 / ROOF_M2_PER_OUTLET)
    expect(result.outlets).toBe(Math.max(2, fromArea))
    expect(result.elbows).toBe(result.outlets * ELBOWS_PER_OUTLET)
    expect(result.downpipeLengthPerOutletMm).toBe(2400)
    expect(result.downpipeTotalM).toBeCloseTo(result.outlets * 2.4, 8)
  })

  it('applies outlet, elbow, height and downpipe overrides', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      outletsOverride: 3,
      elbowsOverride: 5,
      eavesHeightOverrideMm: 5100,
      downpipeLengthOverrideMm: 3000,
    })
    expect(result.outlets).toBe(3)
    expect(result.elbows).toBe(5)
    expect(result.eavesHeightMm).toBe(5100)
    expect(result.downpipeLengthPerOutletMm).toBe(3000)
    expect(result.downpipeTotalM).toBeCloseTo(9, 8)
  })

  it('packs gutter lengths and counts unions, stop ends and brackets', () => {
    const g = boxPlan(8000, 6000)
    const result = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      gutterPieceLengthM: 4,
      gutterBracketCentresMm: 800,
    })
    // 16 m / 4 m = 4 pieces; 2 runs → 2 unions; 4 stop ends
    expect(result.gutterPieces).toBe(4)
    expect(result.gutterUnions).toBe(2)
    expect(result.gutterStopEnds).toBe(4)
    expect(result.gutterBrackets).toBe(Math.ceil(16 / 0.8) + 2)
  })

  it('scales metal / aluminium / copper piece counts from their sold lengths', () => {
    const g = boxPlan(8000, 6000)
    const plastic = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      gutterMaterial: 'plastic',
      gutterPieceLengthM: 4,
    })
    const copper = calcFascias(g, gableRoofing, {
      ...DEFAULT_FASCIAS,
      gutterMaterial: 'copper',
      gutterPieceLengthM: 3,
    })
    expect(plastic.gutterPieces).toBe(4)
    expect(copper.gutterPieces).toBe(Math.ceil(16 / 3))
    expect(copper.gutterCostGbp).toBeGreaterThan(plastic.gutterCostGbp)
  })
})
