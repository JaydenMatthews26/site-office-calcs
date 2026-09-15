import { describe, expect, it } from 'vitest'
import { deriveGeometry } from '../geometry/derive'
import { enabledCalculatorSections } from '../sections/enabled'
import { DEFAULT_JOB, DEFAULT_PLAN, type Wall } from '../types/job'
import { buildWholeJobPdf } from './exportWholeJob'

function boxPlan(w: number, d: number) {
  const walls: Wall[] = [
    { id: 'n', kind: 'external', x1: 0, y1: 0, x2: w, y2: 0, thicknessMm: 300 },
    { id: 'e', kind: 'external', x1: w, y1: 0, x2: w, y2: d, thicknessMm: 300 },
    { id: 's', kind: 'external', x1: w, y1: d, x2: 0, y2: d, thicknessMm: 300 },
    { id: 'w', kind: 'external', x1: 0, y1: d, x2: 0, y2: 0, thicknessMm: 300 },
  ]
  return deriveGeometry({ ...DEFAULT_PLAN, walls, storeyHeightMm: 2400, storeys: 1 })
}

describe('buildWholeJobPdf', () => {
  it('starts with a snapshot page then one page per enabled calculator', () => {
    const g = boxPlan(8000, 6000)
    const included = enabledCalculatorSections({})
    const doc = buildWholeJobPdf({ ...DEFAULT_JOB, sectionEnabled: {} }, g)
    expect(included.length).toBeGreaterThan(1)
    expect(doc.getNumberOfPages()).toBe(1 + included.length)
  })

  it('drops pages for calculators toggled off', () => {
    const g = boxPlan(8000, 6000)
    const all = buildWholeJobPdf({ ...DEFAULT_JOB, sectionEnabled: {} }, g)
    const withoutRoofing = buildWholeJobPdf(
      { ...DEFAULT_JOB, sectionEnabled: { roofing: false } },
      g,
    )
    expect(withoutRoofing.getNumberOfPages()).toBe(all.getNumberOfPages() - 1)
  })

  it('still builds a snapshot-only PDF when every calculator is off', () => {
    const g = boxPlan(8000, 6000)
    const off = Object.fromEntries(enabledCalculatorSections({}).map((s) => [s.id, false]))
    const doc = buildWholeJobPdf({ ...DEFAULT_JOB, sectionEnabled: off }, g)
    expect(doc.getNumberOfPages()).toBe(1)
  })
})
