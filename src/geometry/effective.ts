import type { DerivedGeometry } from './derive'
import type { InputMode, ManualTakeoff, Plan } from '../types/job'
import { deriveGeometry } from './derive'
import { DOOR_HEIGHT_MM, DOOR_WIDTH_MM, OPENING_HEIGHT_MM, OPENING_WIDTH_MM } from '../types/job'

export function manualFromGeometry(g: DerivedGeometry, plan: Plan): ManualTakeoff {
  return {
    spanMm: g.spanMm,
    lengthMm: g.lengthMm,
    footprintM2: g.footprintM2,
    externalLengthMm: g.externalLengthMm,
    partitionLengthMm: g.partitionLengthMm,
    storeyHeightMm: g.storeyHeightMm,
    storeys: g.storeys,
    doorCount: g.doorCount,
    openingCount: g.openingCount,
    doorWidthMm: plan.openings.find((o) => o.kind === 'door')?.widthMm ?? DOOR_WIDTH_MM,
    doorHeightMm: plan.openings.find((o) => o.kind === 'door')?.heightMm ?? DOOR_HEIGHT_MM,
    windowWidthMm: plan.openings.find((o) => o.kind === 'opening')?.widthMm ?? OPENING_WIDTH_MM,
    windowHeightMm: plan.openings.find((o) => o.kind === 'opening')?.heightMm ?? OPENING_HEIGHT_MM,
  }
}

export function geometryFromManual(manual: ManualTakeoff): DerivedGeometry {
  const doorAreaM2 = (manual.doorCount * manual.doorWidthMm * manual.doorHeightMm) / 1e6
  const windowAreaM2 = (manual.openingCount * manual.windowWidthMm * manual.windowHeightMm) / 1e6
  const openingWidthMm =
    manual.doorCount * manual.doorWidthMm + manual.openingCount * manual.windowWidthMm
  const netExternalLengthMm = Math.max(0, manual.externalLengthMm - openingWidthMm)
  const widthMm = manual.lengthMm
  const depthMm = manual.spanMm
  return {
    externalLengthMm: manual.externalLengthMm,
    partitionLengthMm: manual.partitionLengthMm,
    netExternalLengthMm,
    footprintM2: manual.footprintM2,
    ceilingM2: manual.footprintM2,
    boundingWidthMm: widthMm,
    boundingDepthMm: depthMm,
    spanMm: manual.spanMm,
    lengthMm: manual.lengthMm,
    eavesPerimeterMm: manual.externalLengthMm,
    doorCount: manual.doorCount,
    openingCount: manual.openingCount,
    doorAreaM2,
    windowAreaM2,
    openingAreaM2: doorAreaM2 + windowAreaM2,
    storeys: Math.max(1, manual.storeys || 1),
    closedOutline: manual.footprintM2 > 0,
    polygon: null,
    storeyHeightMm: manual.storeyHeightMm,
    wallCount: manual.externalLengthMm > 0 || manual.footprintM2 > 0 ? 4 : 0,
    source: 'manual',
  }
}

/**
 * Single take-off model every calculator reads.
 * Draw mode: derived from the Konva plan.
 * Manual mode: typed span / length / perimeter / areas / opening counts.
 */
export function effectiveGeometry(plan: Plan, mode: InputMode, manual: ManualTakeoff): DerivedGeometry {
  if (mode === 'manual') return geometryFromManual(manual)
  return deriveGeometry(plan)
}

export function typicalFootprintM2(spanMm: number, lengthMm: number): number {
  return (spanMm * lengthMm) / 1e6
}

/** Suggest a rectangular perimeter from span × length (two eaves + two gables). */
export function typicalPerimeterMm(spanMm: number, lengthMm: number): number {
  return 2 * (spanMm + lengthMm)
}
