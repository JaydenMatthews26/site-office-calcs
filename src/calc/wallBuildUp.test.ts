import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, type Wall } from '../types/job'
import { DEFAULT_EXTERNAL_WALLS, DEFAULT_STRUCTURE } from '../types/modules'
import { deriveGeometry } from '../geometry/derive'
import { calcExternalWalls } from './externalWalls'
import { calcStructure } from './structure'
import {
  describeWallBuildUp,
  externalPatchFromBuildUp,
  structurePatchFromBuildUp,
  syncWallBuildUp,
  wallBuildUpFromExternal,
  wallBuildUpFromStructure,
  wallBuildUpsDiverge,
} from './wallBuildUp'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls, storeyHeightMm: 2400, storeys: 2 })
}

describe('shared wall build-up', () => {
  const structure = {
    ...DEFAULT_STRUCTURE,
    innerSkin: 'dense-block' as const,
    outerSkin: 'block' as const,
    cavityMm: 100,
    renderKind: 'sand-cement' as const,
    renderThicknessMm: 15,
  }

  it('detects a structure/external mismatch and syncs either way', () => {
    const external = { ...DEFAULT_EXTERNAL_WALLS, outerSkin: 'brick' as const, innerBlock: 'lightweight-block' as const }
    expect(wallBuildUpsDiverge(wallBuildUpFromStructure(structure), wallBuildUpFromExternal(external))).toBe(true)

    const fromStructure = syncWallBuildUp(structure, external, 'structure')
    expect(
      wallBuildUpsDiverge(
        wallBuildUpFromStructure(fromStructure.structure),
        wallBuildUpFromExternal(fromStructure.externalWalls),
      ),
    ).toBe(false)
    expect(fromStructure.externalWalls.innerBlock).toBe('dense-block')
    expect(fromStructure.externalWalls.outerSkin).toBe('block')
    expect(fromStructure.externalWalls.renderKind).toBe('sand-cement')
    expect(fromStructure.externalWalls.renderThicknessMm).toBe(15)

    const fromExternal = syncWallBuildUp(structure, external, 'external')
    expect(fromExternal.structure.outerSkin).toBe('brick')
    expect(fromExternal.structure.innerSkin).toBe('lightweight-block')
    expect(
      wallBuildUpsDiverge(
        wallBuildUpFromStructure(fromExternal.structure),
        wallBuildUpFromExternal(fromExternal.externalWalls),
      ),
    ).toBe(false)
  })

  it('describes block + sand-cement the same way both sections read it', () => {
    const build = wallBuildUpFromStructure(structure)
    const label = describeWallBuildUp(build)
    expect(label).toContain('Dense block inner')
    expect(label).toContain('Block outer')
    expect(label).toContain('Sand-cement render 15 mm')
    expect(label).toContain('100 mm cavity')
    expect(describeWallBuildUp(wallBuildUpFromExternal({ ...DEFAULT_EXTERNAL_WALLS, ...externalPatchFromBuildUp(build) }))).toBe(label)
    expect(structurePatchFromBuildUp(build).innerSkin).toBe('dense-block')
  })

  it('puts the same render area on structure and external walls for a block outer skin', () => {
    const g = boxPlan(10000, 5000)
    const external = { ...DEFAULT_EXTERNAL_WALLS, ...externalPatchFromBuildUp(wallBuildUpFromStructure(structure)) }
    const walls = calcExternalWalls(g, external, [])
    const built = calcStructure(g, structure)
    expect(walls.renderM2).toBeGreaterThan(0)
    expect(walls.renderM2).toBeCloseTo(built.renderM2, 5)
    expect(walls.renderM3).toBeCloseTo(built.renderM3, 5)
    expect(walls.buildUp).toBe(describeWallBuildUp(wallBuildUpFromStructure(structure)))
    expect(built.notes.some((n) => n.includes(walls.buildUp))).toBe(true)
  })
})
