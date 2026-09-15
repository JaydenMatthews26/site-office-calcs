import { describe, expect, it } from 'vitest'
import { enabledCalculatorSectionIds, enabledCalculatorSections } from './enabled'
import { SECTIONS } from './registry'
import type { SectionDef } from './types'

const mini: SectionDef[] = [
  { id: 'plan', title: 'Plan', shortTitle: 'Plan', status: 'ready', summary: '', toggleable: false },
  { id: 'roofing', title: 'Roofing', shortTitle: 'Roof', status: 'ready', summary: '', toggleable: true },
  { id: 'fascias', title: 'Fascias', shortTitle: 'Fascias', status: 'ready', summary: '', toggleable: true },
  { id: 'scaffolding', title: 'Scaffolding', shortTitle: 'Scaffold', status: 'ready', summary: '', toggleable: true },
]

describe('enabledCalculatorSections', () => {
  it('skips plan and keeps registry order when flags are missing (treated as on)', () => {
    const ids = enabledCalculatorSectionIds({}, mini)
    expect(ids).toEqual(['roofing', 'fascias', 'scaffolding'])
  })

  it('omits calculators toggled off', () => {
    const ids = enabledCalculatorSectionIds({ roofing: false, fascias: true }, mini)
    expect(ids).toEqual(['fascias', 'scaffolding'])
  })

  it('includes a section only when explicitly on after others are off', () => {
    const ids = enabledCalculatorSectionIds(
      { roofing: false, fascias: false, scaffolding: true },
      mini,
    )
    expect(ids).toEqual(['scaffolding'])
  })

  it('follows the live registry: roofing first, scaffolding last, no plan', () => {
    const sections = enabledCalculatorSections({})
    expect(sections[0]?.id).toBe('roofing')
    expect(sections.at(-1)?.id).toBe('scaffolding')
    expect(sections.some((s) => s.id === 'plan')).toBe(false)
    expect(sections.map((s) => s.id)).toEqual(
      SECTIONS.filter((s) => s.toggleable).map((s) => s.id),
    )
  })
})
