import type { ExternalWallInputs, InnerSkin, OuterSkin, RenderKind, StructureInputs } from '../types/modules'

/**
 * Masonry cavity build-up shared by Building structure and External walls.
 * Render applies when the outer skin is block.
 */
export interface WallBuildUp {
  innerSkin: InnerSkin
  outerSkin: OuterSkin
  cavityMm: number
  renderKind: RenderKind
  renderThicknessMm: number
}

const INNER_LABEL: Record<InnerSkin, string> = {
  'lightweight-block': 'Lightweight block',
  'dense-block': 'Dense block',
  brick: 'Brick',
}

const RENDER_LABEL: Record<RenderKind, string> = {
  'sand-cement': 'Sand-cement',
  'k-rend': 'K-rend',
}

export function wallBuildUpFromStructure(input: StructureInputs): WallBuildUp {
  return {
    innerSkin: input.innerSkin,
    outerSkin: input.outerSkin,
    cavityMm: input.cavityMm,
    renderKind: input.renderKind,
    renderThicknessMm: input.renderThicknessMm,
  }
}

export function wallBuildUpFromExternal(input: ExternalWallInputs): WallBuildUp {
  return {
    innerSkin: input.innerBlock,
    outerSkin: input.outerSkin,
    cavityMm: input.cavityMm,
    renderKind: input.renderKind,
    renderThicknessMm: input.renderThicknessMm,
  }
}

export function wallBuildUpsDiverge(a: WallBuildUp, b: WallBuildUp): boolean {
  return (
    a.innerSkin !== b.innerSkin ||
    a.outerSkin !== b.outerSkin ||
    a.cavityMm !== b.cavityMm ||
    a.renderKind !== b.renderKind ||
    a.renderThicknessMm !== b.renderThicknessMm
  )
}

export function structurePatchFromBuildUp(
  build: WallBuildUp,
): Pick<StructureInputs, 'innerSkin' | 'outerSkin' | 'cavityMm' | 'renderKind' | 'renderThicknessMm'> {
  return {
    innerSkin: build.innerSkin,
    outerSkin: build.outerSkin,
    cavityMm: build.cavityMm,
    renderKind: build.renderKind,
    renderThicknessMm: build.renderThicknessMm,
  }
}

export function externalPatchFromBuildUp(
  build: WallBuildUp,
): Pick<ExternalWallInputs, 'innerBlock' | 'outerSkin' | 'cavityMm' | 'renderKind' | 'renderThicknessMm'> {
  return {
    innerBlock: build.innerSkin,
    outerSkin: build.outerSkin,
    cavityMm: build.cavityMm,
    renderKind: build.renderKind,
    renderThicknessMm: build.renderThicknessMm,
  }
}

/** Copy the shared build-up onto both calculators. `source` wins if they differ. */
export function syncWallBuildUp(
  structure: StructureInputs,
  external: ExternalWallInputs,
  source: 'structure' | 'external',
): { structure: StructureInputs; externalWalls: ExternalWallInputs } {
  const build =
    source === 'structure' ? wallBuildUpFromStructure(structure) : wallBuildUpFromExternal(external)
  return {
    structure: { ...structure, ...structurePatchFromBuildUp(build) },
    externalWalls: { ...external, ...externalPatchFromBuildUp(build) },
  }
}

export function renderApplies(build: WallBuildUp): boolean {
  return build.outerSkin === 'block'
}

export function describeWallBuildUp(build: WallBuildUp): string {
  const inner = `${INNER_LABEL[build.innerSkin]} inner`
  const cavity = `${build.cavityMm} mm cavity`
  if (build.outerSkin === 'brick') {
    return `${inner} · Brick outer (no render) · ${cavity}`
  }
  return `${inner} · Block outer · ${cavity} · ${RENDER_LABEL[build.renderKind]} render ${build.renderThicknessMm} mm`
}
