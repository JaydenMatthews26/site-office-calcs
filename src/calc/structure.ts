import type { DerivedGeometry } from '../geometry/derive'
import type { JoineryInputs, StructureInputs } from '../types/modules'
import { ceilDiv, mmToM, withWaste } from './units'

export function elevationAreas(
  g: DerivedGeometry,
  extraOpeningAreaM2 = 0,
): { grossM2: number; netM2: number } {
  const grossM2 = mmToM(g.externalLengthMm) * mmToM(g.storeyHeightMm) * Math.max(1, g.storeys)
  const deduct = g.openingAreaM2 + extraOpeningAreaM2
  return { grossM2, netM2: Math.max(0, grossM2 - deduct) }
}

function coverAreaMm2(lengthMm: number, heightMm: number, jointMm: number): number {
  return Math.max(1, lengthMm + jointMm) * Math.max(1, heightMm + jointMm)
}

export interface StructureResult {
  grossElevationM2: number
  netElevationM2: number
  innerUnits: number
  outerUnits: number
  mortarM3: number
  wallTies: number
  renderM2: number
  renderM3: number
  timberStuds: number
  timberPlatesM: number
  sheathingM2: number
  claddingM2: number
  brickSlips: number
  seFlag: boolean
  notes: string[]
}

/**
 * Building structure take-off from plan elevations.
 *
 * Gross elevation = external perimeter × storey height × storeys.
 * Net elevation   = gross − door/window areas (plan openings + extra joinery).
 *
 * Masonry skins (10 mm joints typical):
 *   cover = (unit length + joint) × (unit height + joint)
 *   units = ceil(netArea / cover) × (1 + waste%)
 *   Lightweight / dense block inner; brick or block outer.
 *   Block outer unlocks render: area = net elevation; volume = area × thickness.
 *   Brick outer skips render.
 *   Wall ties ≈ 2.5 / m² (NHBC cavity, 450 × 900 mm grid) × net area.
 *   Mortar ≈ 0.02 m³ / m² brickwork (indicative).
 *
 * Timber frame:
 *   studs at 400/600 mm along perimeter × storeys; + extra king/cripple allowance 10%.
 *   plates = 2 × perimeter × storeys (sole + head).
 *   sheathing = net elevation.
 *   Outer skin: cladding m² / render / brick slips (~60 / m²) / steel+brick (SE flag).
 */
export function calcStructure(
  g: DerivedGeometry,
  input: StructureInputs,
  joinery?: JoineryInputs,
): StructureResult {
  const extra =
    joinery?.items.reduce((acc, it) => acc + (it.widthMm * it.heightMm) / 1e6, 0) ?? 0
  const { grossM2, netM2 } = elevationAreas(g, extra > g.openingAreaM2 ? extra - g.openingAreaM2 : 0)
  const notes: string[] = []
  const waste = input.wastePct
  const joint = input.mortarJointMm

  let innerUnits = 0
  let outerUnits = 0
  let mortarM3 = 0
  let wallTies = 0
  let renderM2 = 0
  let renderM3 = 0
  let timberStuds = 0
  let timberPlatesM = 0
  let sheathingM2 = 0
  let claddingM2 = 0
  let brickSlips = 0
  let seFlag = false

  if (input.frame === 'masonry') {
    if (input.innerSkinEnabled) {
      const cover = coverAreaMm2(input.blockLengthMm, input.blockHeightMm, joint) / 1e6
      innerUnits = ceilDiv(withWaste(netM2, waste), cover)
    }
    if (input.outerSkinEnabled) {
      if (input.outerSkin === 'brick') {
        const cover = coverAreaMm2(input.brickLengthMm, input.brickHeightMm, joint) / 1e6
        outerUnits = ceilDiv(withWaste(netM2, waste), cover)
      } else {
        const cover = coverAreaMm2(input.blockLengthMm, input.blockHeightMm, joint) / 1e6
        outerUnits = ceilDiv(withWaste(netM2, waste), cover)
        renderM2 = netM2
        renderM3 = netM2 * mmToM(input.renderThicknessMm)
        notes.push(
          `Block outer skin — ${input.renderKind} render at ${input.renderThicknessMm} mm (${renderM3.toFixed(2)} m³).`,
        )
      }
    }
    wallTies = Math.ceil(netM2 * input.wallTiesPerM2)
    mortarM3 = netM2 * (input.outerSkin === 'brick' ? 0.02 : 0.012) * (input.outerSkinEnabled ? 1 : 0)
    mortarM3 += netM2 * 0.012 * (input.innerSkinEnabled ? 1 : 0)
  } else {
    const centres = 400
    const runM = mmToM(g.externalLengthMm) * Math.max(1, g.storeys)
    timberStuds = Math.ceil((runM / mmToM(centres) + 1) * 1.1)
    timberPlatesM = runM * 2
    sheathingM2 = netM2
    if (input.timberOuter === 'cladding') claddingM2 = withWaste(netM2, waste)
    if (input.timberOuter === 'render') {
      renderM2 = netM2
      renderM3 = netM2 * mmToM(input.renderThicknessMm)
    }
    if (input.timberOuter === 'brick-slips') {
      const cover = coverAreaMm2(input.brickLengthMm, input.brickHeightMm, joint) / 1e6
      brickSlips = ceilDiv(withWaste(netM2, waste), cover)
    }
    if (input.timberOuter === 'steel-brick') {
      seFlag = true
      const cover = coverAreaMm2(input.brickLengthMm, input.brickHeightMm, joint) / 1e6
      outerUnits = ceilDiv(withWaste(netM2, waste), cover)
      notes.push('Steel frame with brick facing — structural engineer sign-off required (hybrid).')
    }
  }

  notes.push('Take-off aid only — not a substitute for Approved Document A or an engineer’s design.')
  return {
    grossElevationM2: grossM2,
    netElevationM2: netM2,
    innerUnits,
    outerUnits,
    mortarM3,
    wallTies,
    renderM2,
    renderM3,
    timberStuds,
    timberPlatesM,
    sheathingM2,
    claddingM2,
    brickSlips,
    seFlag,
    notes,
  }
}
