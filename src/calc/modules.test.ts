import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, DEFAULT_ROOFING, DEFAULT_FASCIAS } from '../types/job'
import {
  DEFAULT_EXTERNAL_WALLS,
  DEFAULT_EXTERNALS,
  DEFAULT_FINISHES,
  DEFAULT_FIRST_FLOOR,
  DEFAULT_FLOOR_COVER,
  DEFAULT_FOUNDATIONS,
  DEFAULT_GROUND_FLOOR,
  DEFAULT_MEP,
  DEFAULT_PAINTING,
  DEFAULT_PARTITIONS,
  DEFAULT_SCAFFOLD,
  DEFAULT_SKIRTING,
  DEFAULT_STAIRS,
  DEFAULT_STRUCTURE,
} from '../types/modules'
import { deriveGeometry } from '../geometry/derive'
import { effectiveGeometry, geometryFromManual } from '../geometry/effective'
import { calcStructure } from './structure'
import { calcFoundations, SUBSTRATE_DEPTH_MM } from './foundations'
import { calcGroundFloor } from './groundFloor'
import { calcPartitions } from './partitions'
import { calcFirstFloor } from './firstFloor'
import { calcStairs, MAX_PITCH_DEG, MAX_RISE_MM, MIN_GOING_MM } from './stairs'
import { calcExternalWalls } from './externalWalls'
import { calcFinishes } from './finishes'
import { calcSkirting } from './skirting'
import { calcFloorCover } from './floorCover'
import { calcMep } from './mep'
import { calcPainting } from './painting'
import { calcExternals } from './externals'
import { calcScaffold, BAY_MM } from './scaffold'
import { DEFAULT_MANUAL } from '../types/job'
import type { Wall } from '../types/job'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls, storeyHeightMm: 2400, storeys: 1 })
}

describe('effective geometry', () => {
  it('uses typed measurements in manual mode and the plan in draw mode', () => {
    const plan = { ...DEFAULT_PLAN, walls: boxPlan(8000, 6000).polygon ? [] : [] }
    const drawn = boxPlan(8000, 6000)
    const manual = {
      ...DEFAULT_MANUAL,
      spanMm: 5000,
      lengthMm: 9000,
      footprintM2: 45,
      externalLengthMm: 28000,
      storeyHeightMm: 2400,
      storeys: 2,
      doorCount: 2,
      openingCount: 3,
      doorWidthMm: 826,
      doorHeightMm: 2040,
      windowWidthMm: 1200,
      windowHeightMm: 1200,
    }
    const g = geometryFromManual(manual)
    expect(g.source).toBe('manual')
    expect(g.spanMm).toBe(5000)
    expect(g.storeys).toBe(2)
    expect(g.footprintM2).toBe(45)
    expect(effectiveGeometry({ ...DEFAULT_PLAN, walls: [] }, 'manual', manual).lengthMm).toBe(9000)
    expect(drawn.source).toBe('plan')
    expect(drawn.footprintM2).toBeCloseTo(48, 5)
    void plan
  })
})

describe('structure', () => {
  it('counts bricks from net elevation for a masonry brick outer skin', () => {
    const g = boxPlan(8000, 6000)
    const r = calcStructure(g, { ...DEFAULT_STRUCTURE, frame: 'masonry', outerSkin: 'brick' })
    const gross = 28 * 2.4
    expect(r.grossElevationM2).toBeCloseTo(gross, 5)
    expect(r.outerUnits).toBeGreaterThan(0)
    expect(r.renderM2).toBe(0)
  })

  it('adds render when the outer skin is block, and flags SE on steel-brick timber', () => {
    const g = boxPlan(8000, 6000)
    const block = calcStructure(g, { ...DEFAULT_STRUCTURE, outerSkin: 'block' })
    expect(block.renderM2).toBeCloseTo(block.netElevationM2, 5)
    const steel = calcStructure(g, { ...DEFAULT_STRUCTURE, frame: 'timber', timberOuter: 'steel-brick' })
    expect(steel.seFlag).toBe(true)
  })
})

describe('foundations', () => {
  it('computes strip concrete as width × depth × external run', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFoundations(g, { ...DEFAULT_FOUNDATIONS, type: 'strip', stripWidthMm: 600, stripDepthMm: 1000 })
    expect(r.concreteM3).toBeCloseTo(0.6 * 1.0 * 28, 5)
    expect(r.dpcLinearM).toBeCloseTo(28, 5)
  })

  it('uses substrate depths as the clay/sand/rock defaults', () => {
    expect(SUBSTRATE_DEPTH_MM.clay).toBe(1000)
    expect(SUBSTRATE_DEPTH_MM.sand).toBe(750)
    expect(SUBSTRATE_DEPTH_MM.rock).toBe(450)
  })
})

describe('floors and partitions', () => {
  it('counts ground-floor joists at centres along the length', () => {
    const g = boxPlan(8000, 6000)
    const r = calcGroundFloor(g, { ...DEFAULT_GROUND_FLOOR, type: 'timber', joistCentresMm: 400 })
    expect(r.joists).toBe(Math.floor(8000 / 400) + 1)
    expect(r.joistLinearM).toBeCloseTo(r.joists * 6, 5)
  })

  it('boards both faces of partitions', () => {
    const g = {
      ...boxPlan(8000, 6000),
      partitionLengthMm: 6000,
    }
    const r = calcPartitions(g, DEFAULT_PARTITIONS, 1)
    expect(r.lengthM).toBeCloseTo(6, 5)
    expect(r.lintels).toBe(1)
    expect(r.plasterboardSheets).toBeGreaterThan(0)
  })

  it('adds trimmers around a stair opening on the first floor', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFirstFloor(g, { ...DEFAULT_FIRST_FLOOR, stairOpeningLengthMm: 2500, stairOpeningWidthMm: 900 })
    expect(r.trimmers).toBe(3)
    expect(r.trimmerLengthMm).toBe(2500 * 2 + 900)
  })
})

describe('stairs Part K-style checks', () => {
  it('passes a 2400 mm rise at 225 mm going with enough risers', () => {
    const g = boxPlan(8000, 6000)
    const r = calcStairs(g, { ...DEFAULT_STAIRS, goingMm: 225 })
    expect(r.riseMm).toBeLessThanOrEqual(MAX_RISE_MM + 0.05)
    expect(r.goingMm).toBeGreaterThanOrEqual(MIN_GOING_MM)
    expect(r.pitchDeg).toBeLessThan(MAX_PITCH_DEG)
    expect(r.pass).toBe(true)
  })

  it('fails a steep 150 mm going and suggests a longer run or quarter-turn', () => {
    const g = boxPlan(8000, 6000)
    const r = calcStairs(g, { ...DEFAULT_STAIRS, goingMm: 150 })
    expect(r.pass).toBe(false)
    expect(r.suggestion).toMatch(/quarter-turn|going/i)
  })
})

describe('finishes, MEP, scaffold', () => {
  it('deducts openings from wall area', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFinishes(g, DEFAULT_FINISHES)
    expect(r.ceilingM2).toBeCloseTo(48, 5)
    expect(r.wallM2).toBeGreaterThan(0)
  })

  it('sizes tiles with grout and 10% waste', () => {
    const g = boxPlan(8000, 6000)
    const r = calcFloorCover(g, { ...DEFAULT_FLOOR_COVER, wastePct: 10, tileLengthMm: 300, tileWidthMm: 300, groutMm: 3 })
    const cover = 0.303 * 0.303
    expect(r.tilesPerM2).toBeCloseTo(1 / cover, 6)
    expect(r.tiles).toBe(Math.ceil(48 * 1.1 * r.tilesPerM2))
  })

  it('guides boiler kW from 100 W/m²', () => {
    const g = boxPlan(8000, 6000)
    const r = calcMep(g, DEFAULT_MEP)
    expect(r.boilerKw).toBe(Math.ceil((100 * 48 * 1.15) / 1000))
    expect(r.hotM).toBeCloseTo(r.coldM, 5)
  })

  it('counts scaffold bays at 2.1 m', () => {
    const g = boxPlan(8000, 6000)
    const r = calcScaffold(g, DEFAULT_SCAFFOLD)
    expect(r.bays).toBe(Math.ceil(28000 / BAY_MM))
    expect(r.hireGbp).toBeGreaterThan(0)
  })

  it('skirting deducts door widths from the internal perimeter', () => {
    const g = boxPlan(8000, 6000)
    const r = calcSkirting(g, DEFAULT_SKIRTING, 1, 826, 2040)
    expect(r.skirtingM).toBeCloseTo(28 - 0.826, 5)
    expect(r.architraveM).toBeGreaterThan(0)
  })
})

describe('external walls lintels', () => {
  it('sizes lintels as opening + 2 × bearing', () => {
    const g = boxPlan(8000, 6000)
    const r = calcExternalWalls(g, { ...DEFAULT_EXTERNAL_WALLS, lintelBearingMm: 150, outerSkin: 'brick' }, [
      {
        id: '1',
        code: 'WG1',
        kind: 'window',
        storey: 'gf',
        photoDataUrl: null,
        widthMm: 1200,
        heightMm: 1200,
        openings: 1,
        panes: 2,
        glazing: 'double',
        sillWidthMm: 150,
        subSillWidthMm: 150,
      },
    ])
    expect(r.lintels[0].lengthMm).toBe(1500)
    expect(r.lintels[0].kind).toBe('catnic-steel')
  })
})

describe('painting coats', () => {
  it('uses mist + 2 top on new plaster', () => {
    const g = boxPlan(8000, 6000)
    const r = calcPainting(g, DEFAULT_PAINTING, DEFAULT_ROOFING, DEFAULT_FASCIAS, 1)
    expect(r.coats.mist).toBe(1)
    expect(r.coats.top).toBe(2)
    expect(r.tins).toBeGreaterThan(0)
  })
})

describe('externals soakaway', () => {
  it('sizes an indicative soakaway from roof/footprint area', () => {
    const g = boxPlan(8000, 6000)
    const r = calcExternals(g, { ...DEFAULT_EXTERNALS, soakaway: true, fenceLengthM: 18.3, bayMm: 1830 })
    expect(r.soakawayM3).toBeGreaterThan(0)
    expect(r.posts).toBe(11)
    expect(r.panels).toBe(10)
  })
})
