import type { ReactNode } from 'react'
import { SECTIONS } from '../../sections/registry'
import { useJobStore } from '../../store/useJobStore'

export function AppShell({ children }: { children: ReactNode }) {
  const jobName = useJobStore((s) => s.jobName)
  const setJobName = useJobStore((s) => s.setJobName)
  const active = useJobStore((s) => s.activeSectionId)
  const setActive = useJobStore((s) => s.setActiveSection)
  const enabled = useJobStore((s) => s.sectionEnabled)
  const toggleSection = useJobStore((s) => s.toggleSection)
  const resetJob = useJobStore((s) => s.resetJob)

  return (
    <div className="flex h-full min-h-0 bg-paper text-ink">
      <aside className="no-print flex w-[272px] shrink-0 flex-col border-r border-line bg-ink text-paper">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Local take-off
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Site Office Calcs</h1>
          <p className="mt-2 text-xs leading-relaxed text-white/65">
            Independent of My Site Office. Plans and figures stay on this device.
          </p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Calculator sections">
          {SECTIONS.map((section) => {
            const isActive = section.id === active
            const on = !section.toggleable || enabled[section.id] !== false
            return (
              <div
                key={section.id}
                className={`mb-1 flex items-center gap-1 rounded-lg ${isActive ? 'bg-white/10' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setActive(section.id)}
                  className="touch-target flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      section.status === 'ready' ? 'bg-emerald-400' : 'bg-white/25'
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{section.title}</span>
                    <span className="block truncate text-[11px] text-white/50">{section.summary}</span>
                  </span>
                </button>
                {section.toggleable ? (
                  <label className="mr-2 flex cursor-pointer items-center" title="Include in job / PDF">
                    <span className="sr-only">Include {section.title}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={on}
                      onChange={(e) => toggleSection(section.id, e.target.checked)}
                    />
                  </label>
                ) : null}
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/45">
          Saved in this browser only. No cloud, no account.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex flex-wrap items-center gap-3 border-b border-line bg-card px-5 py-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Job name</span>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="touch-target rounded-md border border-line bg-paper px-3 text-sm font-medium outline-none focus:border-accent"
            />
          </label>
          <p className="max-w-md text-xs leading-relaxed text-ink-soft">
            Draw once on the plan. Roofing (and every later section) reads wall lengths, areas and openings
            from that geometry.
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset this job? Local data for Site Office Calcs will be cleared.')) {
                resetJob()
              }
            }}
            className="touch-target rounded-md border border-line px-3 text-sm text-ink-soft hover:border-accent hover:text-accent"
          >
            Reset job
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
