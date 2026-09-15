import type { SectionDef } from './types'

export type { SectionDef } from './types'

/**
 * Modular section registry.
 *
 * Roofing is implemented. Every later calculator should:
 *  1. Add a definition here (id, title, status).
 *  2. Read derived geometry from the floor plan — never re-ask for wall lengths / areas.
 *  3. Register a panel component in App.tsx (or a section router).
 *
 * Do not import from My Site Office or any shared package.
 */
export const SECTIONS: SectionDef[] = [
  {
    id: 'plan',
    title: 'Floor plan',
    shortTitle: 'Plan',
    status: 'ready',
    summary: 'Source of truth — walls, rooms, openings.',
    toggleable: false,
  },
  {
    id: 'roofing',
    title: 'Roofing',
    shortTitle: 'Roof',
    status: 'ready',
    summary: 'Coverings + carpentry from plan geometry.',
    toggleable: true,
  },
  {
    id: 'fascias',
    title: 'Fascias, soffits & guttering',
    shortTitle: 'Fascias',
    status: 'stub',
    summary: 'Eaves perimeter, verge, downpipes.',
    toggleable: true,
  },
  {
    id: 'structure',
    title: 'Building structure',
    shortTitle: 'Structure',
    status: 'stub',
    summary: 'Masonry, timber frame, lintels, wall ties.',
    toggleable: true,
  },
  {
    id: 'windows-doors',
    title: 'Windows & doors',
    shortTitle: 'Joinery',
    status: 'stub',
    summary: 'Opening schedule from the plan.',
    toggleable: true,
  },
  {
    id: 'foundations',
    title: 'Foundations',
    shortTitle: 'Foundations',
    status: 'stub',
    summary: 'Strip / trench fill from external walls.',
    toggleable: true,
  },
  {
    id: 'floors',
    title: 'Floors',
    shortTitle: 'Floors',
    status: 'stub',
    summary: 'Joists, insulation, screed from footprint.',
    toggleable: true,
  },
  {
    id: 'stairs',
    title: 'Stairs',
    shortTitle: 'Stairs',
    status: 'stub',
    summary: 'Going, rise, headroom (Part K).',
    toggleable: true,
  },
  {
    id: 'finishes',
    title: 'Finishes',
    shortTitle: 'Finishes',
    status: 'stub',
    summary: 'Plaster, flooring, ceilings from room areas.',
    toggleable: true,
  },
  {
    id: 'mep',
    title: 'Plumbing & electrics',
    shortTitle: 'MEP',
    status: 'stub',
    summary: 'First-fix take-off (BS 7671 / water calcs later).',
    toggleable: true,
  },
  {
    id: 'painting',
    title: 'Painting',
    shortTitle: 'Paint',
    status: 'stub',
    summary: 'Wall and ceiling areas minus openings.',
    toggleable: true,
  },
  {
    id: 'externals',
    title: 'Externals',
    shortTitle: 'Externals',
    status: 'stub',
    summary: 'Drives, paths, fencing, drainage.',
    toggleable: true,
  },
  {
    id: 'scaffolding',
    title: 'Scaffolding',
    shortTitle: 'Scaffold',
    status: 'stub',
    summary: 'Elevation area and hire duration.',
    toggleable: true,
  },
]

export function sectionById(id: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.id === id)
}
