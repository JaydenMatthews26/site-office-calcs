import {
  describeWallBuildUp,
  externalPatchFromBuildUp,
  structurePatchFromBuildUp,
  wallBuildUpFromExternal,
  wallBuildUpFromStructure,
  wallBuildUpsDiverge,
} from '../../calc/wallBuildUp'
import { useJobStore } from '../../store/useJobStore'

/** Shows the shared masonry build-up, or a sync choice when the two sections disagree. */
export function WallBuildUpNotice() {
  const structure = useJobStore((s) => s.structure)
  const external = useJobStore((s) => s.externalWalls)
  const patchStructure = useJobStore((s) => s.patchStructure)
  const patchExternal = useJobStore((s) => s.patchExternalWalls)
  const fromStructure = wallBuildUpFromStructure(structure)
  const fromExternal = wallBuildUpFromExternal(external)
  const diverge = wallBuildUpsDiverge(fromStructure, fromExternal)

  if (!diverge) {
    return (
      <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink" role="status">
        Shared wall build-up — Building structure and External walls match: {describeWallBuildUp(fromStructure)}.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm" role="status">
      <p className="font-medium text-ink">Building structure and External walls disagree.</p>
      <p className="mt-1 text-ink">Structure: {describeWallBuildUp(fromStructure)}</p>
      <p className="text-ink">External walls: {describeWallBuildUp(fromExternal)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="touch-target rounded-md bg-ink px-3 text-sm font-medium text-paper"
          onClick={() => patchExternal(externalPatchFromBuildUp(fromStructure))}
        >
          Use structure build-up
        </button>
        <button
          type="button"
          className="touch-target rounded-md border border-line bg-paper px-3 text-sm"
          onClick={() => patchStructure(structurePatchFromBuildUp(fromExternal))}
        >
          Use external walls build-up
        </button>
      </div>
    </div>
  )
}
