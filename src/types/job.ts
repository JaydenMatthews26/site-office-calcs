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
export type FasciaMaterial = 'pvcu' | 'timber'
export type GutterMaterial = 'plastic' | 'metal' | 'aluminium' | 'copper'

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

export interface FasciasInputs {
  material: FasciaMaterial
  /**
   * Override eaves run used for fascia, soffit and (on gables) gutter, millimetres.
   * null = derived from plan / roof shape.
   */
  eavesRunOverrideMm: number | null
  /** Finished fascia board depth (the painted face), millimetres. Typical 175 mm. */
  fasciaDepthMm: number
  /** Soffit width override (mm). null = roofing eaves overhang. */
  soffitWidthOverrideMm: number | null
  /** Cover width of one soffit board as sold, millimetres (typically 300 mm). */
  soffitBoardWidthMm: number
  /** Board length as sold, metres. PVCU ~5.0 m, timber PAR ~5.1 m. */
  boardLengthM: number
  /** Cutting / joint waste on fascia, soffit and barge boards, percent. */
  wastePct: number
  includeBargeboards: boolean
  /** Stock PVCU colour (ignored for timber — timber uses paintColour). */
  pvcuColour: string
  /** Hex paint colour for timber fascia/soffit/barge. */
  paintColour: string
  /** Manufacturer coverage, m² per litre (one coat). Typical exterior wood ~12 m²/L. */
  paintCoverageM2PerL: number
  paintCoats: number
  /** Tin size, litres. Typical 2.5 L. */
  paintTinL: number
  gutterMaterial: GutterMaterial
  /** Street-front / eaves elevation width. null = longer plan dimension. */
  propertyWidthOverrideMm: number | null
  /** Gutter height above ground / drain. null = plan storey height. */
  eavesHeightOverrideMm: number | null
  /** Downpipe count. null = derived from roof shape and ~50 m² per outlet. */
  outletsOverride: number | null
  /** Offset elbows. null = 2 × outlets. */
  elbowsOverride: number | null
  /** Downpipe length per outlet, mm. null = eaves height. */
  downpipeLengthOverrideMm: number | null
  /** Override total gutter run, mm. null = eaves run (gable: 2 × property width). */
  gutterRunOverrideMm: number | null
  gutterPieceLengthM: number
  downpipePieceLengthM: number
  gutterBracketCentresMm: number
}

export interface JobState {
  jobName: string
  plan: Plan
  roofing: RoofingInputs
  fascias: FasciasInputs
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

export const DEFAULT_FASCIAS: FasciasInputs = {
  material: 'pvcu',
  eavesRunOverrideMm: null,
  fasciaDepthMm: 175,
  soffitWidthOverrideMm: null,
  soffitBoardWidthMm: 300,
  boardLengthM: 5,
  wastePct: 10,
  includeBargeboards: true,
  pvcuColour: 'white',
  paintColour: '#f4f1e8',
  paintCoverageM2PerL: 12,
  paintCoats: 2,
  paintTinL: 2.5,
  gutterMaterial: 'plastic',
  propertyWidthOverrideMm: null,
  eavesHeightOverrideMm: null,
  outletsOverride: null,
  elbowsOverride: null,
  downpipeLengthOverrideMm: null,
  gutterRunOverrideMm: null,
  gutterPieceLengthM: 4,
  downpipePieceLengthM: 4,
  gutterBracketCentresMm: 800,
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
  fascias: DEFAULT_FASCIAS,
  activeSectionId: 'plan',
  sectionEnabled: {
    roofing: true,
    fascias: true,
  },
}

export const DOOR_WIDTH_MM = 826
export const DOOR_HEIGHT_MM = 2040
export const OPENING_WIDTH_MM = 1200
export const OPENING_HEIGHT_MM = 1200
export const EXTERNAL_THICKNESS_MM = 300
export const PARTITION_THICKNESS_MM = 100
