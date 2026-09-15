export type SectionStatus = 'ready' | 'stub'

export interface SectionDef {
  id: string
  title: string
  shortTitle: string
  status: SectionStatus
  summary: string
  toggleable: boolean
}
