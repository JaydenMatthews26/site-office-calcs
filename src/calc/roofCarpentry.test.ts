import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, DEFAULT_ROOFING } from '../types/job'
import { deriveGeometry } from '../geometry/derive'
import { calcCutRoof, calcTrussRoof, TRUSS_COST_PER_M2 } from './roofCarpentry'
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

describe('cut roof carpentry', () => {
  it('computes common rafter, plumb and bird’s mouth for 6 m span at 35°', () => {
    const g = boxPlan(8000, 6000)
    const cut = calcCutRoof(g, {
      ...DEFAULT_ROOFING,
      pitchDeg: 35,
      eavesOverhangMm: 450,
      rafterSpacingMm: 400,
      wallPlateWidthMm: 100,
    })
    const θ = (35 * Math.PI) / 180
    const run = 3000 + 450
    expect(cut.commonRafterLengthMm).toBeCloseTo(run / Math.cos(θ), 5)
    expect(cut.plumbCutDeg).toBe(35)
    expect(cut.seatCutDeg).toBe(55)
    expect(cut.birdsMouthPlumbMm).toBeCloseTo(100 * Math.tan(θ), 5)
    expect(cut.commonsPerSlope).toBe(Math.floor(8000 / 400) + 1)
    expect(cut.commonRafterCount).toBe(cut.commonsPerSlope * 2)
  })

  it('diminishes jack rafters by spacing / cos(pitch)', () => {
    const g = boxPlan(8000, 6000)
    const cut = calcCutRoof(g, { ...DEFAULT_ROOFING, roofShape: 'hip-hip', rafterSpacingMm: 400 })
    const cd = 400 / Math.cos((35 * Math.PI) / 180)
    expect(cut.jackCommonDifferenceMm).toBeCloseTo(cd, 5)
    expect(cut.jackRafters.length).toBeGreaterThan(0)
    if (cut.jackRafters.length >= 2) {
      expect(cut.jackRafters[0].lengthMm - cut.jackRafters[1].lengthMm).toBeCloseTo(cd, 5)
    }
    expect(cut.jackCount).toBe(cut.jackRafters.length * 8)
  })

  it('does not list jack rafters on a gable-to-gable roof', () => {
    const g = boxPlan(8000, 6000)
    const cut = calcCutRoof(g, { ...DEFAULT_ROOFING, roofShape: 'gable-gable' })
    expect(cut.jackCount).toBe(0)
    expect(cut.jackRafters).toEqual([])
  })
})

describe('truss roof', () => {
  it('counts trusses at 600 mm centres and costs ~£85/m² footprint', () => {
    const g = boxPlan(8000, 6000)
    const truss = calcTrussRoof(g, { ...DEFAULT_ROOFING, trussType: 'fink' })
    expect(truss.centresMm).toBe(600)
    expect(truss.trussCount).toBe(Math.floor(8000 / 600) + 1)
    expect(truss.indicativeCostGbp).toBeCloseTo(48 * TRUSS_COST_PER_M2, 5)
    expect(truss.atticFloorWarning).toBe(false)
  })

  it('flags heavier floor joists on attic trusses', () => {
    const g = boxPlan(8000, 6000)
    const truss = calcTrussRoof(g, { ...DEFAULT_ROOFING, trussType: 'attic' })
    expect(truss.atticFloorWarning).toBe(true)
    expect(truss.members.some((m) => /floor/i.test(m.name))).toBe(true)
  })
})
