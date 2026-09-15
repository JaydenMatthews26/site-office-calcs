import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deriveGeometry } from '../geometry/derive'
import { manualFromGeometry } from '../geometry/effective'
import { rectangularBuilding } from '../geometry/rect'
import { SECTIONS } from '../sections/registry'
import {
  DEFAULT_JOB,
  DEFAULT_PLAN,
  type FasciasInputs,
  type InputMode,
  type JobState,
  type JoineryInputs,
  type ManualTakeoff,
  type Opening,
  type Plan,
  type RoofingInputs,
  type Wall,
} from '../types/job'
import type { JoineryItem } from '../types/modules'

const STORAGE_KEY = 'site-office-calcs-v1'

interface HistorySlice {
  past: Plan[]
  future: Plan[]
}

interface JobStore extends JobState, HistorySlice {
  setJobName: (name: string) => void
  setActiveSection: (id: string) => void
  toggleSection: (id: string, enabled: boolean) => void
  setInputMode: (mode: InputMode) => boolean
  patchManual: (patch: Partial<ManualTakeoff>) => void
  copyManualFromPlan: () => void
  setPlan: (plan: Plan) => void
  replaceWalls: (walls: Wall[], openings?: Opening[]) => void
  addWall: (wall: Wall) => void
  updateWall: (id: string, patch: Partial<Wall>) => void
  deleteWall: (id: string) => void
  addOpening: (opening: Opening) => void
  deleteOpening: (id: string) => void
  setStoreyHeight: (mm: number) => void
  setStoreys: (n: number) => void
  patchRoofing: (patch: Partial<RoofingInputs>) => void
  patchCovering: (patch: Partial<RoofingInputs['covering']>) => void
  patchFascias: (patch: Partial<FasciasInputs>) => void
  patchStructure: (patch: Partial<JobState['structure']>) => void
  patchJoinery: (patch: Partial<JoineryInputs>) => void
  setJoineryItems: (items: JoineryItem[]) => void
  patchJoineryItem: (id: string, patch: Partial<JoineryItem>) => void
  addJoineryItem: (item: JoineryItem) => void
  removeJoineryItem: (id: string) => void
  patchFoundations: (patch: Partial<JobState['foundations']>) => void
  patchGroundFloor: (patch: Partial<JobState['groundFloor']>) => void
  patchPartitions: (patch: Partial<JobState['partitions']>) => void
  patchFirstFloor: (patch: Partial<JobState['firstFloor']>) => void
  patchStairs: (patch: Partial<JobState['stairs']>) => void
  patchExternalWalls: (patch: Partial<JobState['externalWalls']>) => void
  patchFinishes: (patch: Partial<JobState['finishes']>) => void
  patchSkirting: (patch: Partial<JobState['skirting']>) => void
  patchFloorCover: (patch: Partial<JobState['floorCover']>) => void
  patchMep: (patch: Partial<JobState['mep']>) => void
  patchPainting: (patch: Partial<JobState['painting']>) => void
  patchExternals: (patch: Partial<JobState['externals']>) => void
  patchScaffold: (patch: Partial<JobState['scaffold']>) => void
  insertSampleBuilding: () => void
  clearPlan: () => void
  resetJob: () => void
  undo: () => void
  redo: () => void
}

function pushPlan(past: Plan[], plan: Plan): Plan[] {
  return [...past.slice(-29), structuredClone(plan)]
}

function hasManualData(m: ManualTakeoff): boolean {
  return m.spanMm > 0 || m.lengthMm > 0 || m.footprintM2 > 0 || m.externalLengthMm > 0
}

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_JOB,
      past: [],
      future: [],

      setJobName: (jobName) => set({ jobName }),
      setActiveSection: (activeSectionId) => set({ activeSectionId }),
      toggleSection: (id, enabled) =>
        set({ sectionEnabled: { ...get().sectionEnabled, [id]: enabled } }),

      setInputMode: (mode) => {
        const { inputMode, plan, manual } = get()
        if (mode === inputMode) return true
        if (mode === 'manual') {
          const fromPlan = plan.walls.length > 0
          if (fromPlan && hasManualData(manual)) {
            const copy = window.confirm(
              'Copy the drawn plan into typed fields? This replaces current manual sizes. Cancel keeps your typed figures. The canvas is not deleted.',
            )
            set({
              inputMode: 'manual',
              manual: copy ? manualFromGeometry(deriveGeometry(plan), plan) : manual,
            })
            return true
          }
          set({
            inputMode: 'manual',
            manual: fromPlan ? manualFromGeometry(deriveGeometry(plan), plan) : manual,
          })
          return true
        }
        const emptyCanvas = plan.walls.length === 0
        if (emptyCanvas && hasManualData(manual)) {
          const ok = window.confirm(
            'Switch to draw plan? The canvas is empty, so calculators will have no geometry until you draw. Typed measurements stay saved if you switch back.',
          )
          if (!ok) return false
        }
        set({ inputMode: 'draw' })
        return true
      },

      patchManual: (patch) => set((s) => ({ manual: { ...s.manual, ...patch } })),

      copyManualFromPlan: () => {
        const { plan, manual } = get()
        if (plan.walls.length === 0) return
        if (hasManualData(manual)) {
          const ok = window.confirm(
            'Replace typed sizes with the drawn plan? Roof pitch and eaves overhang stay on the roofing section.',
          )
          if (!ok) return
        }
        set({ manual: manualFromGeometry(deriveGeometry(plan), plan) })
      },

      setPlan: (plan) =>
        set((s) => ({ plan, past: pushPlan(s.past, s.plan), future: [] })),

      replaceWalls: (walls, openings) =>
        set((s) => ({
          plan: { ...s.plan, walls, openings: openings ?? s.plan.openings },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      addWall: (wall) =>
        set((s) => ({
          plan: { ...s.plan, walls: [...s.plan.walls, wall] },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      updateWall: (id, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
          },
        })),

      deleteWall: (id) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.filter((w) => w.id !== id),
            openings: s.plan.openings.filter((o) => o.wallId !== id),
          },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      addOpening: (opening) =>
        set((s) => ({
          plan: { ...s.plan, openings: [...s.plan.openings, opening] },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      deleteOpening: (id) =>
        set((s) => ({
          plan: { ...s.plan, openings: s.plan.openings.filter((o) => o.id !== id) },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      setStoreyHeight: (storeyHeightMm) =>
        set((s) => ({
          plan: { ...s.plan, storeyHeightMm },
          manual: { ...s.manual, storeyHeightMm },
        })),
      setStoreys: (storeys) =>
        set((s) => ({
          plan: { ...s.plan, storeys: Math.max(1, Math.min(3, Math.round(storeys))) },
          manual: { ...s.manual, storeys: Math.max(1, Math.min(3, Math.round(storeys))) },
        })),

      patchRoofing: (patch) => set((s) => ({ roofing: { ...s.roofing, ...patch } })),
      patchCovering: (patch) =>
        set((s) => ({
          roofing: { ...s.roofing, covering: { ...s.roofing.covering, ...patch } },
        })),
      patchFascias: (patch) => set((s) => ({ fascias: { ...s.fascias, ...patch } })),
      patchStructure: (patch) => set((s) => ({ structure: { ...s.structure, ...patch } })),
      patchJoinery: (patch) => set((s) => ({ joinery: { ...s.joinery, ...patch } })),
      setJoineryItems: (items) => set((s) => ({ joinery: { ...s.joinery, items } })),
      patchJoineryItem: (id, patch) =>
        set((s) => ({
          joinery: {
            ...s.joinery,
            items: s.joinery.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
          },
        })),
      addJoineryItem: (item) =>
        set((s) => ({ joinery: { ...s.joinery, items: [...s.joinery.items, item] } })),
      removeJoineryItem: (id) =>
        set((s) => ({
          joinery: { ...s.joinery, items: s.joinery.items.filter((it) => it.id !== id) },
        })),
      patchFoundations: (patch) => set((s) => ({ foundations: { ...s.foundations, ...patch } })),
      patchGroundFloor: (patch) => set((s) => ({ groundFloor: { ...s.groundFloor, ...patch } })),
      patchPartitions: (patch) => set((s) => ({ partitions: { ...s.partitions, ...patch } })),
      patchFirstFloor: (patch) => set((s) => ({ firstFloor: { ...s.firstFloor, ...patch } })),
      patchStairs: (patch) => set((s) => ({ stairs: { ...s.stairs, ...patch } })),
      patchExternalWalls: (patch) =>
        set((s) => ({ externalWalls: { ...s.externalWalls, ...patch } })),
      patchFinishes: (patch) => set((s) => ({ finishes: { ...s.finishes, ...patch } })),
      patchSkirting: (patch) => set((s) => ({ skirting: { ...s.skirting, ...patch } })),
      patchFloorCover: (patch) => set((s) => ({ floorCover: { ...s.floorCover, ...patch } })),
      patchMep: (patch) => set((s) => ({ mep: { ...s.mep, ...patch } })),
      patchPainting: (patch) => set((s) => ({ painting: { ...s.painting, ...patch } })),
      patchExternals: (patch) => set((s) => ({ externals: { ...s.externals, ...patch } })),
      patchScaffold: (patch) => set((s) => ({ scaffold: { ...s.scaffold, ...patch } })),

      insertSampleBuilding: () => {
        const { walls, openings } = rectangularBuilding(8000, 6000)
        set((s) => ({
          plan: { ...s.plan, walls, openings },
          past: pushPlan(s.past, s.plan),
          future: [],
        }))
      },

      clearPlan: () =>
        set((s) => ({
          plan: {
            ...DEFAULT_PLAN,
            storeyHeightMm: s.plan.storeyHeightMm,
            storeys: s.plan.storeys,
          },
          past: pushPlan(s.past, s.plan),
          future: [],
        })),

      resetJob: () => set({ ...DEFAULT_JOB, past: [], future: [] }),

      undo: () => {
        const { past, plan, future } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        set({
          plan: previous,
          past: past.slice(0, -1),
          future: [plan, ...future],
        })
      },

      redo: () => {
        const { past, plan, future } = get()
        if (future.length === 0) return
        const next = future[0]
        set({
          plan: next,
          past: pushPlan(past, plan),
          future: future.slice(1),
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      partialize: (s) => ({
        jobName: s.jobName,
        inputMode: s.inputMode,
        manual: s.manual,
        plan: s.plan,
        roofing: s.roofing,
        fascias: s.fascias,
        structure: s.structure,
        joinery: s.joinery,
        foundations: s.foundations,
        groundFloor: s.groundFloor,
        partitions: s.partitions,
        firstFloor: s.firstFloor,
        stairs: s.stairs,
        externalWalls: s.externalWalls,
        finishes: s.finishes,
        skirting: s.skirting,
        floorCover: s.floorCover,
        mep: s.mep,
        painting: s.painting,
        externals: s.externals,
        scaffold: s.scaffold,
        activeSectionId: s.activeSectionId,
        sectionEnabled: s.sectionEnabled,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<JobState>
        const sectionEnabled = { ...current.sectionEnabled, ...p.sectionEnabled }
        for (const sec of SECTIONS) {
          if (sec.toggleable && sectionEnabled[sec.id] === undefined) {
            sectionEnabled[sec.id] = sec.status === 'ready'
          }
        }
        return {
          ...current,
          ...p,
          plan: { ...current.plan, ...p.plan },
          manual: { ...current.manual, ...p.manual },
          roofing: {
            ...current.roofing,
            ...p.roofing,
            covering: { ...current.roofing.covering, ...p.roofing?.covering },
          },
          fascias: { ...current.fascias, ...p.fascias },
          structure: { ...current.structure, ...p.structure },
          joinery: {
            ...current.joinery,
            ...p.joinery,
            items: p.joinery?.items ?? current.joinery.items,
          },
          foundations: { ...current.foundations, ...p.foundations },
          groundFloor: { ...current.groundFloor, ...p.groundFloor },
          partitions: { ...current.partitions, ...p.partitions },
          firstFloor: { ...current.firstFloor, ...p.firstFloor },
          stairs: { ...current.stairs, ...p.stairs },
          externalWalls: { ...current.externalWalls, ...p.externalWalls },
          finishes: { ...current.finishes, ...p.finishes },
          skirting: { ...current.skirting, ...p.skirting },
          floorCover: { ...current.floorCover, ...p.floorCover },
          mep: { ...current.mep, ...p.mep },
          painting: { ...current.painting, ...p.painting },
          externals: { ...current.externals, ...p.externals },
          scaffold: { ...current.scaffold, ...p.scaffold },
          sectionEnabled,
        }
      },
    },
  ),
)
