import type { ReactNode } from 'react'
import { useJobStore } from '../../store/useJobStore'

export function CalcSection({
  id,
  title,
  blurb,
  exportLabel,
  onExport,
  children,
  footer,
}: {
  id: string
  title: string
  blurb: ReactNode
  exportLabel: string
  onExport: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const included = useJobStore((s) => s.sectionEnabled[id] !== false)
  const toggleSection = useJobStore((s) => s.toggleSection)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="mt-1 max-w-2xl text-sm text-ink-soft">{blurb}</div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={included}
              onChange={(e) => toggleSection(id, e.target.checked)}
            />
            Include in job / PDF
          </label>
        </div>
        <div>
          <button
            type="button"
            disabled={!included}
            onClick={onExport}
            className="touch-target rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {exportLabel}
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}
