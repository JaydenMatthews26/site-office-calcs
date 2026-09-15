import type { DerivedGeometry } from '../geometry/derive'
import type { StairsInputs } from '../types/modules'
import { degToRad, hypot, mmToM, radToDeg } from './units'

/** Brief / tight private-stair check (Part K private max rise is 220 mm). */
export const MAX_RISE_MM = 200
export const MIN_GOING_MM = 220
export const MAX_PITCH_DEG = 42
/** Part K 100 mm sphere — balusters at ≤ 99 mm clear. */
export const MAX_BALUSTER_GAP_MM = 99

export interface StairsResult {
  totalRiseMm: number
  risers: number
  riseMm: number
  goingMm: number
  treads: number
  totalGoingMm: number
  pitchDeg: number
  twoRplusG: number
  passRise: boolean
  passGoing: boolean
  passPitch: boolean
  pass: boolean
  suggestion: string | null
  stringLengthMm: number
  strings: number
  balusters: number
  newels: number
  handrailM: number
  notes: string[]
}

/**
 * Stairs versus Part K-style checks (brief):
 *   max rise 200 mm, min going 220 mm, pitch < 42°.
 *   2R + G should sit 550–700 mm (AD K private).
 *
 * Risers = override ?? ceil(totalRise / 200).
 * Actual rise = totalRise / risers.
 * Treads (straight) = risers − 1.
 * Pitch = atan(rise / going).
 * Fail → suggest quarter-turn (inserts a landing, shortens each flight) or a longer run
 *   (increase going until pitch ≤ 42°).
 *
 * String length ≈ hypot(total rise, total going) for a straight flight; + landing for others.
 * Balusters along the going at ≤ 99 mm centres; newels from input (2 straight, 3 quarter, 4 half/dogleg).
 */
export function calcStairs(g: DerivedGeometry, input: StairsInputs): StairsResult {
  const totalRiseMm = input.totalRiseOverrideMm ?? g.storeyHeightMm
  const risers =
    input.stepCountOverride && input.stepCountOverride > 1
      ? input.stepCountOverride
      : Math.max(2, Math.ceil(totalRiseMm / MAX_RISE_MM))
  const riseMm = totalRiseMm / risers
  const goingMm = input.goingMm
  const landingTreads =
    input.plan === 'straight' ? 0 : input.plan === 'quarter-landing' ? 0 : input.plan === 'half-landing' ? 0 : 0
  const treads = Math.max(1, risers - 1)
  const totalGoingMm = treads * goingMm
  const pitchDeg = radToDeg(Math.atan(riseMm / Math.max(goingMm, 1)))
  const twoRplusG = 2 * riseMm + goingMm
  const passRise = riseMm <= MAX_RISE_MM + 0.05
  const passGoing = goingMm >= MIN_GOING_MM - 0.05
  const passPitch = pitchDeg < MAX_PITCH_DEG
  const pass = passRise && passGoing && passPitch && twoRplusG >= 550 && twoRplusG <= 700

  let suggestion: string | null = null
  if (!pass) {
    const goingForPitch = riseMm / Math.tan(degToRad(MAX_PITCH_DEG - 0.1))
    if (!passPitch || !passGoing) {
      suggestion = `Lengthen the run: going ≈ ${Math.ceil(Math.max(MIN_GOING_MM, goingForPitch))} mm, or switch to a quarter-turn / half-landing to split the flight.`
    } else if (!passRise) {
      suggestion = `Add risers (try ${risers + 1}) or a quarter-turn to keep each rise ≤ ${MAX_RISE_MM} mm.`
    } else {
      suggestion = 'Adjust rise/going so 2R+G sits between 550 and 700 mm (Approved Document K).'
    }
  }

  const extra =
    input.plan === 'quarter-landing' ? 1000 : input.plan === 'half-landing' ? 1800 : input.plan === 'dogleg' ? 1200 : 0
  const stringLengthMm = hypot(totalRiseMm, totalGoingMm) + extra
  const strings = 2
  const defaultNewels =
    input.plan === 'straight' ? 2 : input.plan === 'quarter-landing' ? 3 : 4
  const newels = input.newels || defaultNewels
  const handrailM = input.handrail ? mmToM(totalGoingMm + extra) : 0
  const balusters = input.handrail
    ? Math.ceil(totalGoingMm / Math.max(40, input.balusterSpacingMm)) * 2
    : 0

  const notes = [
    `Checks use brief limits: rise ≤ ${MAX_RISE_MM} mm, going ≥ ${MIN_GOING_MM} mm, pitch < ${MAX_PITCH_DEG}° (AD K private max rise is 220 mm).`,
    'Not a substitute for Approved Document K or a staircase manufacturer’s design.',
  ]
  void landingTreads

  return {
    totalRiseMm,
    risers,
    riseMm,
    goingMm,
    treads,
    totalGoingMm,
    pitchDeg,
    twoRplusG,
    passRise,
    passGoing,
    passPitch,
    pass,
    suggestion,
    stringLengthMm,
    strings,
    balusters,
    newels,
    handrailM,
    notes,
  }
}
