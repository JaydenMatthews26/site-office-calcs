import {
  DOOR_HEIGHT_MM,
  DOOR_WIDTH_MM,
  EXTERNAL_THICKNESS_MM,
  PARTITION_THICKNESS_MM,
  type Opening,
  type Wall,
} from '../types/job'
import { uid } from './ids'

export function rectangularBuilding(
  widthMm: number,
  depthMm: number,
  originMm = { x: 2000, y: 2000 },
): { walls: Wall[]; openings: Opening[] } {
  const x = originMm.x
  const y = originMm.y
  const t = EXTERNAL_THICKNESS_MM
  const south: Wall = {
    id: uid(),
    kind: 'external',
    x1: x,
    y1: y + depthMm,
    x2: x + widthMm,
    y2: y + depthMm,
    thicknessMm: t,
  }
  const walls: Wall[] = [
    { id: uid(), kind: 'external', x1: x, y1: y, x2: x + widthMm, y2: y, thicknessMm: t },
    {
      id: uid(),
      kind: 'external',
      x1: x + widthMm,
      y1: y,
      x2: x + widthMm,
      y2: y + depthMm,
      thicknessMm: t,
    },
    south,
    { id: uid(), kind: 'external', x1: x, y1: y + depthMm, x2: x, y2: y, thicknessMm: t },
  ]
  const door: Opening = {
    id: uid(),
    kind: 'door',
    wallId: south.id,
    offsetMm: Math.max(500, (widthMm - DOOR_WIDTH_MM) / 2),
    widthMm: DOOR_WIDTH_MM,
    heightMm: DOOR_HEIGHT_MM,
  }
  return { walls, openings: [door] }
}

export function partitionWall(x1: number, y1: number, x2: number, y2: number): Wall {
  return {
    id: uid(),
    kind: 'partition',
    x1,
    y1,
    x2,
    y2,
    thicknessMm: PARTITION_THICKNESS_MM,
  }
}
