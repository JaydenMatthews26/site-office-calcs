import { uid } from '../geometry/ids'

export type FrameKind = 'masonry' | 'timber'
export type InnerSkin = 'lightweight-block' | 'dense-block' | 'brick'
export type OuterSkin = 'brick' | 'block'
export type RenderKind = 'sand-cement' | 'k-rend'
export type TimberOuter = 'cladding' | 'render' | 'brick-slips' | 'steel-brick'
export type JoineryKind = 'window' | 'door' | 'rooflight'
export type JoineryStorey = 'gf' | 'ff' | 'roof'
export type GlazingKind = 'double' | 'triple' | 'integral-blinds'
export type FoundationType = 'strip' | 'raft'
export type Substrate = 'clay' | 'sand' | 'rock'
export type DpcMaterial = 'polymeric' | 'bitumen' | 'polythene'
export type GroundFloorType = 'slab' | 'beam-block' | 'timber'
export type PartitionType = 'timber-stud' | 'blockwork' | 'metal-stud'
export type StairPlan = 'straight' | 'quarter-landing' | 'half-landing' | 'dogleg'
export type SkirtingMaterial = 'mdf' | 'pine' | 'oak'
export type SkirtingProfile = 'chamfer' | 'ovolo' | 'torus' | 'ogee' | 'pencil-round'
export type FloorCoverKind = 'tile' | 'laminate' | 'carpet' | 'vinyl'
export type FloorCoverMode = 'whole-house' | 'room-by-room'
export type PipeSystem = 'copper' | 'hep2o'
export type PaintSubstrate = 'new-plaster' | 'existing-painted' | 'fresh-render'
export type DriveFinish = 'brick-paving' | 'concrete' | 'tarmac' | 'resin'
export type FenceType = 'panel' | 'feather' | 'composite'
export type FencePostFix = 'concrete' | 'pu-foam'

export interface StructureInputs {
  frame: FrameKind
  innerSkin: InnerSkin
  outerSkin: OuterSkin
  timberOuter: TimberOuter
  renderKind: RenderKind
  renderThicknessMm: number
  cavityMm: number
  blockLengthMm: number
  blockHeightMm: number
  blockWidthMm: number
  brickLengthMm: number
  brickHeightMm: number
  brickWidthMm: number
  mortarJointMm: number
  wallTiesPerM2: number
  wastePct: number
  innerSkinEnabled: boolean
  outerSkinEnabled: boolean
}

export interface JoineryItem {
  id: string
  code: string
  kind: JoineryKind
  storey: JoineryStorey
  photoDataUrl: string | null
  widthMm: number
  heightMm: number
  openings: number
  panes: number
  glazing: GlazingKind
  sillWidthMm: number
  subSillWidthMm: number
}

export interface JoineryInputs {
  items: JoineryItem[]
  extraGfWindows: number
  extraGfDoors: number
  extraFfWindows: number
  extraRooflights: number
}

export interface FoundationsInputs {
  type: FoundationType
  stripWidthMm: number
  stripDepthMm: number
  raftThicknessMm: number
  dpcMaterial: DpcMaterial
  dpcHeightMm: number
  substrate: Substrate
  underpinning: boolean
  workingSpaceMm: number
}

export interface GroundFloorInputs {
  type: GroundFloorType
  slabThicknessMm: number
  insulationMm: number
  dpm: boolean
  ufh: boolean
  radonBarrier: boolean
  edgeInsulationMm: number
  beamCentresMm: number
  joistDepthMm: number
  joistWidthMm: number
  joistCentresMm: number
}

export interface PartitionInputs {
  type: PartitionType
  studWidthMm: number
  studDepthMm: number
  centresMm: number
  blockLengthMm: number
  blockHeightMm: number
  plasterboardLayers: number
  acoustic: boolean
  fireRating: boolean
  serviceVoid: boolean
}

export interface FirstFloorInputs {
  joistDepthMm: number
  joistWidthMm: number
  joistCentresMm: number
  noggins: boolean
  strutting: boolean
  herringbone: boolean
  stairOpeningLengthMm: number
  stairOpeningWidthMm: number
}

export interface StairsInputs {
  plan: StairPlan
  totalRiseOverrideMm: number | null
  goingMm: number
  /** Finished stair width between strings, millimetres. Typical 900. */
  widthMm: number
  stepCountOverride: number | null
  stringThicknessMm: number
  handrail: boolean
  balusterSpacingMm: number
  newels: number
}

export interface ExternalWallInputs {
  cavityMm: number
  insulationMm: number
  innerBlock: InnerSkin
  outerSkin: OuterSkin
  cavityBarriers: boolean
  fireStops: boolean
  lintelBearingMm: number
}

export interface FinishesInputs {
  plasterboard: boolean
  skim: boolean
  paint: boolean
  artex: boolean
  coving: boolean
  paintCoverageM2PerL: number
  paintCoats: number
  paintTinL: number
  pbSheetM2: number
  wastePct: number
}

export interface SkirtingInputs {
  profile: SkirtingProfile
  material: SkirtingMaterial
  depthMm: number
  architraveDepthMm: number
  wastePct: number
}

export interface FloorCoverRoom {
  id: string
  name: string
  /** Net floor area to cover, m². */
  floorM2: number
  /** Optional wall-tile area before opening deductions, m². 0 = no wall tiling. */
  wallTileM2: number
  /** Deduct doors/windows from wall-tile area (not from the floor). */
  deductOpenings: boolean
  doorCount: number
  doorWidthMm: number
  doorHeightMm: number
  windowCount: number
  windowWidthMm: number
  windowHeightMm: number
}

export interface FloorCoverInputs {
  kind: FloorCoverKind
  tileLengthMm: number
  tileWidthMm: number
  groutMm: number
  wastePct: number
  includeWalls: boolean
  wallHeightMm: number
  mode: FloorCoverMode
  rooms: FloorCoverRoom[]
}

export interface MepInputs {
  pipeSystem: PipeSystem
  routingWastePct: number
  wattsPerM2: number
  socketsPerRoom: number
  lightsPerRoom: number
  roomsOverride: number | null
  installedLowGbpPerM2: number
  installedHighGbpPerM2: number
}

export interface PaintingInputs {
  substrate: PaintSubstrate
  woodwork: boolean
  externalJoinery: boolean
  externalFascias: boolean
  coverageM2PerL: number
  tinL: number
}

export interface ExternalsInputs {
  driveFinish: DriveFinish
  driveAreaM2: number
  pathAreaM2: number
  slabPadMm: number
  hardcoreMm: number
  fenceType: FenceType
  fenceLengthM: number
  fenceHeightMm: number
  bayMm: number
  postFix: FencePostFix
  fencePaint: boolean
  soakaway: boolean
  soakawayRegs: boolean
  drainRunM: number
  tieIn: boolean
}

export interface ScaffoldInputs {
  hireWeeks: number
  liftHeightMm: number
  extraLifts: number
}

export const DEFAULT_STRUCTURE: StructureInputs = {
  frame: 'masonry',
  innerSkin: 'lightweight-block',
  outerSkin: 'brick',
  timberOuter: 'cladding',
  renderKind: 'sand-cement',
  renderThicknessMm: 15,
  cavityMm: 100,
  blockLengthMm: 440,
  blockHeightMm: 215,
  blockWidthMm: 100,
  brickLengthMm: 215,
  brickHeightMm: 65,
  brickWidthMm: 102.5,
  mortarJointMm: 10,
  wallTiesPerM2: 2.5,
  wastePct: 5,
  innerSkinEnabled: true,
  outerSkinEnabled: true,
}

export const DEFAULT_JOINERY: JoineryInputs = {
  items: [],
  extraGfWindows: 0,
  extraGfDoors: 0,
  extraFfWindows: 0,
  extraRooflights: 0,
}

export const DEFAULT_FOUNDATIONS: FoundationsInputs = {
  type: 'strip',
  stripWidthMm: 600,
  stripDepthMm: 1000,
  raftThicknessMm: 150,
  dpcMaterial: 'polymeric',
  dpcHeightMm: 150,
  substrate: 'clay',
  underpinning: false,
  workingSpaceMm: 150,
}

export const DEFAULT_GROUND_FLOOR: GroundFloorInputs = {
  type: 'slab',
  slabThicknessMm: 100,
  insulationMm: 150,
  dpm: true,
  ufh: false,
  radonBarrier: false,
  edgeInsulationMm: 25,
  beamCentresMm: 530,
  joistDepthMm: 195,
  joistWidthMm: 47,
  joistCentresMm: 400,
}

export const DEFAULT_PARTITIONS: PartitionInputs = {
  type: 'timber-stud',
  studWidthMm: 38,
  studDepthMm: 89,
  centresMm: 400,
  blockLengthMm: 440,
  blockHeightMm: 215,
  plasterboardLayers: 2,
  acoustic: false,
  fireRating: false,
  serviceVoid: false,
}

export const DEFAULT_FIRST_FLOOR: FirstFloorInputs = {
  joistDepthMm: 220,
  joistWidthMm: 47,
  joistCentresMm: 400,
  noggins: true,
  strutting: true,
  herringbone: false,
  stairOpeningLengthMm: 2500,
  stairOpeningWidthMm: 900,
}

export const DEFAULT_STAIRS: StairsInputs = {
  plan: 'straight',
  totalRiseOverrideMm: null,
  goingMm: 225,
  widthMm: 900,
  stepCountOverride: null,
  stringThicknessMm: 32,
  handrail: true,
  balusterSpacingMm: 99,
  newels: 2,
}

export const DEFAULT_EXTERNAL_WALLS: ExternalWallInputs = {
  cavityMm: 100,
  insulationMm: 150,
  innerBlock: 'lightweight-block',
  outerSkin: 'brick',
  cavityBarriers: true,
  fireStops: true,
  lintelBearingMm: 150,
}

export const DEFAULT_FINISHES: FinishesInputs = {
  plasterboard: true,
  skim: true,
  paint: true,
  artex: false,
  coving: false,
  paintCoverageM2PerL: 12,
  paintCoats: 2,
  paintTinL: 2.5,
  pbSheetM2: 2.88,
  wastePct: 10,
}

export const DEFAULT_SKIRTING: SkirtingInputs = {
  profile: 'chamfer',
  material: 'mdf',
  depthMm: 119,
  architraveDepthMm: 69,
  wastePct: 10,
}

export const DEFAULT_FLOOR_COVER: FloorCoverInputs = {
  kind: 'tile',
  tileLengthMm: 300,
  tileWidthMm: 300,
  groutMm: 3,
  wastePct: 10,
  includeWalls: false,
  wallHeightMm: 2000,
  mode: 'whole-house',
  rooms: [],
}

export const DEFAULT_MEP: MepInputs = {
  pipeSystem: 'copper',
  routingWastePct: 15,
  wattsPerM2: 100,
  socketsPerRoom: 6,
  lightsPerRoom: 4,
  roomsOverride: null,
  installedLowGbpPerM2: 35,
  installedHighGbpPerM2: 85,
}

export const DEFAULT_PAINTING: PaintingInputs = {
  substrate: 'new-plaster',
  woodwork: true,
  externalJoinery: false,
  externalFascias: false,
  coverageM2PerL: 12,
  tinL: 2.5,
}

export const DEFAULT_EXTERNALS: ExternalsInputs = {
  driveFinish: 'brick-paving',
  driveAreaM2: 0,
  pathAreaM2: 0,
  slabPadMm: 50,
  hardcoreMm: 150,
  fenceType: 'panel',
  fenceLengthM: 0,
  fenceHeightMm: 1830,
  bayMm: 1830,
  postFix: 'concrete',
  fencePaint: false,
  soakaway: true,
  soakawayRegs: true,
  drainRunM: 0,
  tieIn: false,
}

export const DEFAULT_SCAFFOLD: ScaffoldInputs = {
  hireWeeks: 6,
  liftHeightMm: 2000,
  extraLifts: 0,
}

export const TYPICAL_FLOOR_ROOMS = ['Hall', 'Lounge', 'Kitchen', 'Bathroom', 'Bedroom 1', 'Bedroom 2'] as const

export function emptyFloorCoverRoom(name = 'Room', floorM2 = 0): FloorCoverRoom {
  const wet = /bath|ensuite|shower|wc|cloak/i.test(name)
  return {
    id: uid(),
    name,
    floorM2,
    wallTileM2: 0,
    deductOpenings: true,
    doorCount: 1,
    doorWidthMm: 826,
    doorHeightMm: 2040,
    windowCount: wet ? 1 : 0,
    windowWidthMm: 600,
    windowHeightMm: 900,
  }
}

export function emptyJoineryItem(kind: JoineryKind, storey: JoineryStorey, code: string): JoineryItem {
  const sizes =
    kind === 'door'
      ? { widthMm: 826, heightMm: 2040, openings: 1, panes: 1, sillWidthMm: 0, subSillWidthMm: 0 }
      : kind === 'rooflight'
        ? { widthMm: 780, heightMm: 1180, openings: 1, panes: 1, sillWidthMm: 0, subSillWidthMm: 0 }
        : { widthMm: 1200, heightMm: 1200, openings: 1, panes: 2, sillWidthMm: 150, subSillWidthMm: 150 }
  return {
    id: uid(),
    code,
    kind,
    storey,
    photoDataUrl: null,
    glazing: 'double',
    ...sizes,
  }
}
