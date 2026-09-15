import { sectionById } from '../../sections/registry'
import { useJobStore } from '../../store/useJobStore'

export function StubSection({ sectionId }: { sectionId: string }) {
  const section = sectionById(sectionId)
  const setActive = useJobStore((s) => s.setActiveSection)

  if (!section) {
    return <p className="p-6 text-sm">Unknown section.</p>
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">Coming later</p>
      <h2 className="mt-2 text-2xl font-semibold">{section.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {section.summary} This module is a placeholder so future calculators can plug into the same job. It will
        read wall lengths, footprint, ceiling area and opening counts from the floor plan — no double entry.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        POC scope is floor plan + roofing only. Other sections are listed in the README roadmap.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActive('plan')}
          className="touch-target rounded-md bg-ink px-4 text-sm font-medium text-paper"
        >
          Back to plan
        </button>
        <button
          type="button"
          onClick={() => setActive('roofing')}
          className="touch-target rounded-md border border-line px-4 text-sm"
        >
          Open roofing
        </button>
      </div>
    </div>
  )
}
