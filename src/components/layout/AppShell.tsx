import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SECTIONS, sectionById } from '../../sections/registry'
import { useJobStore } from '../../store/useJobStore'
import { IncludeToggle } from '../ui/Fields'
import { JobInputModeToggle } from './JobInputModeToggle'
import { WholeJobExportButton } from './WholeJobExportButton'

const MD_QUERY = '(min-width: 768px)'

export function AppShell({ children }: { children: ReactNode }) {
  const jobName = useJobStore((s) => s.jobName)
  const setJobName = useJobStore((s) => s.setJobName)
  const active = useJobStore((s) => s.activeSectionId)
  const resetJob = useJobStore((s) => s.resetJob)
  const [navOpen, setNavOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerTitleId = useId()
  const activeSection = sectionById(active)

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY)
    const onChange = () => {
      if (mq.matches) setNavOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div
      className="flex h-full min-h-0 bg-paper text-ink"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <aside className="no-print hidden w-[272px] shrink-0 flex-col border-r border-line bg-ink text-paper md:flex">
        <BrandBlock />
        <SectionNav />
        <LocalNote />
      </aside>

      {navOpen ? (
        <div className="no-print md:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close section menu"
            className="fixed inset-0 z-40 bg-ink/50"
            onClick={() => setNavOpen(false)}
          />
          <aside
            id="mobile-section-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-ink text-paper shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div>
                <p id={drawerTitleId} className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  Sections
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight">Site Office Calcs</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setNavOpen(false)}
                className="touch-target rounded-md border border-white/20 px-3 text-sm text-paper"
              >
                Close
              </button>
            </div>
            <div className="border-b border-white/10 px-4 py-3">
              <JobInputModeToggle variant="sidebar" />
            </div>
            <SectionNav onNavigate={() => setNavOpen(false)} />
            <LocalNote />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="no-print flex flex-col gap-2 border-b border-line bg-card px-3 py-2 md:flex-row md:flex-wrap md:items-end md:gap-3 md:px-5 md:py-3"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <button
              type="button"
              className="touch-target inline-flex shrink-0 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-medium"
              aria-expanded={navOpen}
              aria-controls="mobile-section-nav"
              onClick={() => setNavOpen(true)}
            >
              <span className="flex w-4 flex-col gap-1" aria-hidden>
                <span className="block h-0.5 w-full bg-ink" />
                <span className="block h-0.5 w-full bg-ink" />
                <span className="block h-0.5 w-full bg-ink" />
              </span>
              Menu
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-base font-semibold"
              onClick={() => setNavOpen(true)}
            >
              {activeSection?.title ?? 'Site Office Calcs'}
            </button>
          </div>

          <label className="flex min-w-0 flex-1 flex-col gap-1 md:min-w-[200px]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Job name</span>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="touch-target rounded-md border border-line bg-paper px-3 text-base font-medium outline-none focus:border-accent"
            />
          </label>
          <JobInputModeToggle variant="header" />
          <p className="hidden max-w-sm pb-1 text-xs leading-relaxed text-ink-soft lg:block">
            One take-off model. Every calculator reads span, length, footprint, eaves and openings from it.
          </p>
          <div className="flex w-full gap-2 md:w-auto md:contents">
            <WholeJobExportButton className="min-w-0 flex-1 md:flex-none" />
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset this job? Local data for Site Office Calcs will be cleared.')) {
                  resetJob()
                }
              }}
              className="touch-target shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent"
            >
              Reset job
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function BrandBlock() {
  return (
    <div className="border-b border-white/10 px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">Local take-off</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Site Office Calcs</h1>
      <p className="mt-2 text-xs leading-relaxed text-white/65">
        Independent of My Site Office. Plans and figures stay on this device.
      </p>
      <JobInputModeToggle variant="sidebar" />
    </div>
  )
}

function LocalNote() {
  return (
    <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/45">
      Saved in this browser only. No cloud, no account.
    </div>
  )
}

function SectionNav({ onNavigate }: { onNavigate?: () => void }) {
  const active = useJobStore((s) => s.activeSectionId)
  const setActive = useJobStore((s) => s.setActiveSection)
  const enabled = useJobStore((s) => s.sectionEnabled)
  const toggleSection = useJobStore((s) => s.toggleSection)

  return (
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
              onClick={() => {
                setActive(section.id)
                onNavigate?.()
              }}
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
              <IncludeToggle
                compact
                tone="dark"
                label={`Include ${section.title}`}
                checked={on}
                onChange={(v) => toggleSection(section.id, v)}
              />
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
