import { useMemo } from 'react'
import { effectiveGeometry } from '../geometry/effective'
import { useJobStore } from '../store/useJobStore'

/** Geometry every calculator should read — drawn plan or typed measurements. */
export function useGeometry() {
  const plan = useJobStore((s) => s.plan)
  const inputMode = useJobStore((s) => s.inputMode)
  const manual = useJobStore((s) => s.manual)
  return useMemo(() => effectiveGeometry(plan, inputMode, manual), [plan, inputMode, manual])
}
