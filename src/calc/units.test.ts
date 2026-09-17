import { describe, expect, it } from 'vitest'
import { formatLengthHud, parseLengthMm } from './units'

describe('parseLengthMm', () => {
  it('reads millimetres', () => {
    expect(parseLengthMm('2400')).toBe(2400)
    expect(parseLengthMm('2400mm')).toBe(2400)
    expect(parseLengthMm('900 mm')).toBe(900)
  })

  it('reads metres', () => {
    expect(parseLengthMm('2.4')).toBe(2400)
    expect(parseLengthMm('2.4m')).toBe(2400)
    expect(parseLengthMm('8 m')).toBe(8000)
  })

  it('rejects empty or non-positive', () => {
    expect(parseLengthMm('')).toBeNull()
    expect(parseLengthMm('abc')).toBeNull()
    expect(parseLengthMm('0')).toBeNull()
    expect(parseLengthMm('-2')).toBeNull()
  })
})

describe('formatLengthHud', () => {
  it('shows metres and millimetres', () => {
    expect(formatLengthHud(2400)).toEqual({ metres: '2.40 m', millimetres: '2400 mm' })
  })
})
