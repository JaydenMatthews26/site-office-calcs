import type { SectionDef } from './types'

export type { SectionDef } from './types'

/**
 * Modular section registry.
 *
 * Every calculator should:
 *  1. Add a definition here (id, title, status).
 *  2. Read effective geometry (drawn plan or typed measurements).
 *  3. Register a panel in App.tsx.
 *
 * Do not import from My Site Office or any shared package.
 */
export const SECTIONS: SectionDef[] = [
  {
    id: 'plan',
    title: 'Plan / measurements',
    shortTitle: 'Plan',
    status: 'ready',
    summary: 'Draw the building or type sizes.',
    toggleable: false,
  },
  {
    id: 'roofing',
    title: 'Roofing',
    shortTitle: 'Roof',
    status: 'ready',
    summary: 'Dormers, rooflights and snow guards from plan geometry.',
    toggleable: true,
  },
  {
    id: 'fascias',
    title: 'Fascias, soffits & guttering',
    shortTitle: 'Fascias',
    status: 'ready',
    summary: 'Eaves perimeter, timber paint, downpipes.',
    toggleable: true,
  },
  {
    id: 'structure',
    title: 'Building structure',
    shortTitle: 'Structure',
    status: 'ready',
    summary: 'Masonry or timber frame skins from elevations.',
    toggleable: true,
  },
  {
    id: 'windows-doors',
    title: 'Windows & doors',
    shortTitle: 'Joinery',
    status: 'ready',
    summary: 'Numbered schedule, glazing, PDF mock-ups.',
    toggleable: true,
  },
  {
    id: 'foundations',
    title: 'Foundations',
    shortTitle: 'Foundations',
    status: 'ready',
    summary: 'Strip / raft to DPC from external runs.',
    toggleable: true,
  },
  {
    id: 'ground-floor',
    title: 'Ground floor',
    shortTitle: 'GF structure',
    status: 'ready',
    summary: 'Slab, beam & block or joists + Part L.',
    toggleable: true,
  },
  {
    id: 'partitions',
    title: 'Internal walls',
    shortTitle: 'Partitions',
    status: 'ready',
    summary: 'Stud / block, board, door lintels.',
    toggleable: true,
  },
  {
    id: 'first-floor',
    title: 'First floor',
    shortTitle: 'FF structure',
    status: 'ready',
    summary: 'Joists, noggins, trimmers at stairs.',
    toggleable: true,
  },
  {
    id: 'stairs',
    title: 'Stairs',
    shortTitle: 'Stairs',
    status: 'ready',
    summary: 'Rise, going, Part K checks, cut list.',
    toggleable: true,
  },
  {
    id: 'external-walls',
    title: 'External walls',
    shortTitle: 'Walls',
    status: 'ready',
    summary: 'Cavity, lintels, padstones, barriers.',
    toggleable: true,
  },
  {
    id: 'finishes',
    title: 'Internal finishes',
    shortTitle: 'Finishes',
    status: 'ready',
    summary: 'Board, skim, paint from wall areas.',
    toggleable: true,
  },
  {
    id: 'skirting',
    title: 'Skirting & architrave',
    shortTitle: 'Joinery trim',
    status: 'ready',
    summary: 'Profiles, linear metres, finishing PDF.',
    toggleable: true,
  },
  {
    id: 'floor-coverings',
    title: 'Floor coverings',
    shortTitle: 'Flooring',
    status: 'ready',
    summary: 'Whole house or room-by-room tiles, grout, waste.',
    toggleable: true,
  },
  {
    id: 'mep',
    title: 'Plumbing & electrics',
    shortTitle: 'MEP',
    status: 'ready',
    summary: 'Materials guide — not a BS 7671 design.',
    toggleable: true,
  },
  {
    id: 'painting',
    title: 'Painting',
    shortTitle: 'Paint',
    status: 'ready',
    summary: 'Coats by substrate, woodwork, externals.',
    toggleable: true,
  },
  {
    id: 'externals',
    title: 'Externals',
    shortTitle: 'Externals',
    status: 'ready',
    summary: 'Drives, fencing, drainage, soakaway.',
    toggleable: true,
  },
  {
    id: 'scaffolding',
    title: 'Scaffolding',
    shortTitle: 'Scaffold',
    status: 'ready',
    summary: 'Bays, lifts, hire from height & perimeter.',
    toggleable: true,
  },
]

export function sectionById(id: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.id === id)
}
