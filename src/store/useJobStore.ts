import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_JOB,
  DEFAULT_PLAN,
  type JobState,
  type Opening,
  type Plan,
  type RoofingInputs,
  type Wall,
} from '../types/job'
import { rectangularBuilding } from '../geometry/rect'
import { SECTIONS } from '../sections/registry'

const STORAGE_KEY = 'site-office-calcs-v1'

interface HistorySlice {
  past: Plan[]
  future: Plan[]
}

interface JobStore extends JobState, HistorySlice {
  setJobName: (name: string) => void
  setActiveSection: (id: string) => void
  toggleSection: (id: string, enabled: boolean) => void
  setPlan: (plan: Plan) => void
  replaceWalls: (walls: Wall[], openings?: Opening[]) => void
  addWall: (wall: Wall) => void
  updateWall: (id: string, patch: Partial<Wall>) => void
  deleteWall: (id: string) => void
  addOpening: (opening: Opening) => void
  deleteOpening: (id: string) => void
  setStoreyHeight: (mm: number) => void
  patchRoofing: (patch: Partial<RoofingInputs>) => void
  patchCovering: (patch: Partial<RoofingInputs['covering']>) => void
  insertSampleBuilding: () => void
  clearPlan: () => void
  resetJob: () => void
  undo: () => void
  redo: () => void
}

function pushPlan(past: Plan[], plan: Plan): Plan[] {
  return [...past.slice(-29), structuredClone(plan)]
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
        set((s) => ({ plan: { ...s.plan, storeyHeightMm } })),

      patchRoofing: (patch) => set((s) => ({ roofing: { ...s.roofing, ...patch } })),
      patchCovering: (patch) =>
        set((s) => ({
          roofing: { ...s.roofing, covering: { ...s.roofing.covering, ...patch } },
        })),

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
          plan: { ...DEFAULT_PLAN, storeyHeightMm: s.plan.storeyHeightMm },
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
      version: 1,
      partialize: (s) => ({
        jobName: s.jobName,
        plan: s.plan,
        roofing: s.roofing,
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
          roofing: {
            ...current.roofing,
            ...p.roofing,
            covering: { ...current.roofing.covering, ...p.roofing?.covering },
          },
          sectionEnabled,
        }
      },
    },
  ),
)
