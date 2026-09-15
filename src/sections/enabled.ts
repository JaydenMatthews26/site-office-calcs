import { SECTIONS, type SectionDef } from './registry'

/**
 * Toggleable calculators currently included in the job / whole-job PDF.
 *
 * Plan / measurements is never toggleable — it is always the front-matter snapshot.
 * Missing keys are treated as on, matching the sidebar and section checkboxes
 * (`sectionEnabled[id] !== false`).
 */
export function enabledCalculatorSections(
  sectionEnabled: Record<string, boolean>,
  sections: readonly SectionDef[] = SECTIONS,
): SectionDef[] {
  return sections.filter((section) => section.toggleable && sectionEnabled[section.id] !== false)
}

export function enabledCalculatorSectionIds(
  sectionEnabled: Record<string, boolean>,
  sections: readonly SectionDef[] = SECTIONS,
): string[] {
  return enabledCalculatorSections(sectionEnabled, sections).map((section) => section.id)
}
