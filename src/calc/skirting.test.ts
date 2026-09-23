import { describe, expect, it } from 'vitest'
import { DEFAULT_SKIRTING } from '../types/modules'
import { isCustomDepth, profileDepthLabel, SKIRTING_PROFILES } from './skirting'

describe('skirting profiles', () => {
  it('includes bullnose and arch / bullnose shapes', () => {
    const ids = SKIRTING_PROFILES.map((p) => p.id)
    expect(ids).toContain('bullnose')
    expect(ids).toContain('arch-bullnose')
    expect(SKIRTING_PROFILES.find((p) => p.id === 'bullnose')?.typicalDepthMm).toBe(120)
    expect(SKIRTING_PROFILES.find((p) => p.id === 'arch-bullnose')?.typicalDepthMm).toBe(75)
  })

  it('labels the depth in use and clears custom when it matches the shape', () => {
    expect(profileDepthLabel('pencil-round', 120, true)).toEqual({
      mm: 120,
      custom: true,
      text: '120 mm · custom depth',
    })
    expect(profileDepthLabel('pencil-round', 94, false).text).toBe('94 mm')
    expect(isCustomDepth('pencil-round', 120)).toBe(true)
    expect(isCustomDepth('pencil-round', 94)).toBe(false)
    expect(profileDepthLabel('bullnose', 120, true)).toEqual({ mm: 120, custom: false, text: '120 mm' })
    expect(profileDepthLabel('arch-bullnose', 75, true).custom).toBe(false)
    expect(isCustomDepth('arch-bullnose', 69)).toBe(true)
    expect(DEFAULT_SKIRTING.architraveProfile).toBe('chamfer')
  })
})
