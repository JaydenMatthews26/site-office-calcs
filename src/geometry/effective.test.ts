import { describe, expect, it } from 'vitest'
import { calcFascias } from '../calc/fascias'
import {
  DEFAULT_FASCIAS,
  DEFAULT_MANUAL,
  DEFAULT_PLAN,
  DEFAULT_ROOFING,
  type Plan,
  type Wall,
} from '../types/job'
import { deriveGeometry } from './derive'
import {
  effectiveGeometry,
  geometryFromManual,
  manualFromGeometry,
  typicalFootprintM2,
  typicalPerimeterMm,
} from './effective'

function box(w: number, d: number): Wall[] {
  return [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
}

function drawn8x6(): Plan {
  return {
    ...DEFAULT_PLAN,
    walls: box(8000, 6000),
    openings: [
      { id: 'd', kind: 'door', wallId: 's', offsetMm: 2000, widthMm: 826, heightMm: 2040 },
      { id: 'o', kind: 'opening', wallId: 'n', offsetMm: 1000, widthMm: 1200, heightMm: 1200 },
    ],
  }
}

const typed8x6 = {
  ...DEFAULT_MANUAL,
  spanMm: 6000,
  lengthMm: 8000,
  footprintM2: 48,
  externalLengthMm: 28000,
  storeyHeightMm: 2400,
  storeys: 1,
  doorCount: 1,
  openingCount: 1,
  doorWidthMm: 826,
  doorHeightMm: 2040,
  windowWidthMm: 1200,
  windowHeightMm: 1200,
}

describe('effectiveGeometry', () => {
  it('draw mode ignores typed manual values', () => {
    const plan = drawn8x6()
    const g = effectiveGeometry(plan, 'draw', {
      ...DEFAULT_MANUAL,
      spanMm: 1000,
      lengthMm: 2000,
      footprintM2: 2,
      externalLengthMm: 6000,
    })
    expect(g.source).toBe('plan')
    expect(g.spanMm).toBe(6000)
    expect(g.lengthMm).toBe(8000)
    expect(g.footprintM2).toBeCloseTo(48, 5)
    expect(g.externalLengthMm).toBe(28000)
    expect(g.doorCount).toBe(1)
    expect(g.openingCount).toBe(1)
  })

  it('manual mode ignores canvas walls', () => {
    const g = effectiveGeometry(drawn8x6(), 'manual', typed8x6)
    expect(g.source).toBe('manual')
    expect(g.spanMm).toBe(6000)
    expect(g.lengthMm).toBe(8000)
    expect(g.footprintM2).toBe(48)
    expect(g.polygon).toBeNull()
  })

  it('round-trips a drawn box through typed fields', () => {
    const plan = drawn8x6()
    const drawn = deriveGeometry(plan)
    const mapped = manualFromGeometry(drawn, plan)
    const back = geometryFromManual(mapped)
    expect(mapped.spanMm).toBe(drawn.spanMm)
    expect(mapped.lengthMm).toBe(drawn.lengthMm)
    expect(mapped.footprintM2).toBeCloseTo(drawn.footprintM2, 5)
    expect(mapped.externalLengthMm).toBe(drawn.externalLengthMm)
    expect(mapped.doorCount).toBe(1)
    expect(mapped.openingCount).toBe(1)
    expect(back.spanMm).toBe(drawn.spanMm)
    expect(back.lengthMm).toBe(drawn.lengthMm)
    expect(back.footprintM2).toBeCloseTo(drawn.footprintM2, 5)
    expect(back.externalLengthMm).toBe(drawn.externalLengthMm)
    expect(back.doorCount).toBe(drawn.doorCount)
    expect(back.openingCount).toBe(drawn.openingCount)
  })

  it('gives fascias the same eaves from a typed 8 × 6 m box as from a drawn box', () => {
    const roofing = { ...DEFAULT_ROOFING, roofShape: 'gable-gable' as const, eavesOverhangMm: 450 }
    const fromDraw = calcFascias(effectiveGeometry(drawn8x6(), 'draw', DEFAULT_MANUAL), roofing, DEFAULT_FASCIAS)
    const fromTyped = calcFascias(
      effectiveGeometry(DEFAULT_PLAN, 'manual', typed8x6),
      roofing,
      DEFAULT_FASCIAS,
    )
    expect(fromDraw.propertyWidthMm).toBe(8000)
    expect(fromTyped.propertyWidthMm).toBe(8000)
    expect(fromTyped.fasciaLinearM).toBeCloseTo(fromDraw.fasciaLinearM, 8)
    expect(fromTyped.gutterLinearM).toBeCloseTo(fromDraw.gutterLinearM, 8)
    expect(fromTyped.soffitAreaM2).toBeCloseTo(fromDraw.soffitAreaM2, 8)
  })

  it('suggests rectangular footprint and perimeter from span × length', () => {
    expect(typicalFootprintM2(6000, 8000)).toBe(48)
    expect(typicalPerimeterMm(6000, 8000)).toBe(28000)
  })
})
