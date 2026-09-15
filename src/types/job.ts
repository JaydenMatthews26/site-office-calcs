export type WallKind = 'external' | 'partition'
export type OpeningKind = 'door' | 'opening'
export type DrawTool =
  | 'select'
  | 'pan'
  | 'rect'
  | 'external'
  | 'partition'
  | 'door'
  | 'opening'

export type RoofShape = 'gable-gable' | 'gable-hip' | 'hip-hip'
export type CoveringType = 'tile' | 'slate'
export type FeltStyle = 'bitumen' | 'breathable'
export type CarpentryMode = 'cut' | 'truss'
export type TrussType = 'fink' | 'attic' | 'mono-pitch' | 'scissor' | 'raised-tie'

export interface PointMm {
  x: number
  y: number
}

export interface Wall {
  id: string
  kind: WallKind
  x1: number
  y1: number
  x2: number
  y2: number
  /** Finished wall thickness, millimetres. */
  thicknessMm: number
}

export interface Opening {
  id: string
  kind: OpeningKind
  wallId: string
  /** Distance along the wall from (x1, y1) to the start of the opening, mm. */
  offsetMm: number
  widthMm: number
  heightMm: number
}

export interface Plan {
  walls: Wall[]
  openings: Opening[]
  /** Floor-to-ceiling, used for later ceiling take-offs. Default 2400 mm. */
  storeyHeightMm: number
}

export interface CoveringInputs {
  type: CoveringType
  tileLengthMm: number
  tileWidthMm: number
  headlapMm: number
  sidelapMm: number
  felt: FeltStyle
  ridgeTileLengthMm: number
  ridgeTileLapMm: number
  /** Graded batten length as sold, typically 3.6 m. */
  battenLengthM: number
  battensPerBundle: number
  /** Extra valley length not implied by a simple rectangle (L-shape, etc.). */
  extraValleyMm: number
  dormers: number
  rooflights: number
  snowGuards: boolean
}

export interface RoofingInputs {
  coveringsEnabled: boolean
  carpentryEnabled: boolean
  pitchDeg: number
  eavesOverhangMm: number
  rafterSpacingMm: number
  roofShape: RoofShape
  carpentryMode: CarpentryMode
  trussType: TrussType
  /** Optional overrides when the plan bbox is not the structural span. */
  spanOverrideMm: number | null
  lengthOverrideMm: number | null
  wallPlateWidthMm: number
  covering: CoveringInputs
  cutListOptIn: boolean
}

export interface JobState {
  jobName: string
  plan: Plan
  roofing: RoofingInputs
  activeSectionId: string
  /**
   * Per-section include flags for PDF / later whole-job print.
   * Plan is always the source of truth and is not toggleable off.
   */
  sectionEnabled: Record<string, boolean>
}

export const DEFAULT_COVERING: CoveringInputs = {
  type: 'tile',
  // Typical UK concrete interlocking tile (e.g. 420 × 330).
  tileLengthMm: 420,
  tileWidthMm: 330,
  headlapMm: 75,
  sidelapMm: 30,
  felt: 'breathable',
  ridgeTileLengthMm: 450,
  ridgeTileLapMm: 75,
  battenLengthM: 3.6,
  battensPerBundle: 10,
  extraValleyMm: 0,
  dormers: 0,
  rooflights: 0,
  snowGuards: false,
}

export const DEFAULT_ROOFING: RoofingInputs = {
  coveringsEnabled: true,
  carpentryEnabled: true,
  pitchDeg: 35,
  eavesOverhangMm: 450,
  rafterSpacingMm: 400,
  roofShape: 'gable-gable',
  carpentryMode: 'cut',
  trussType: 'fink',
  spanOverrideMm: null,
  lengthOverrideMm: null,
  wallPlateWidthMm: 100,
  covering: DEFAULT_COVERING,
  cutListOptIn: false,
}

export const DEFAULT_PLAN: Plan = {
  walls: [],
  openings: [],
  storeyHeightMm: 2400,
}

export const DEFAULT_JOB: JobState = {
  jobName: 'Untitled job',
  plan: DEFAULT_PLAN,
  roofing: DEFAULT_ROOFING,
  activeSectionId: 'plan',
  sectionEnabled: {
    roofing: true,
  },
}

export const DOOR_WIDTH_MM = 826
export const DOOR_HEIGHT_MM = 2040
export const OPENING_WIDTH_MM = 1200
export const OPENING_HEIGHT_MM = 1200
export const EXTERNAL_THICKNESS_MM = 300
export const PARTITION_THICKNESS_MM = 100
