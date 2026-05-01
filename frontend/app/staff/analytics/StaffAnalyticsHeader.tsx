type Props = {
  readonly onBackClick: () => void
}

export function StaffAnalyticsHeader({ onBackClick }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Staff Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">Support analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            A cleaner, responsive view of workload, flow, and ticket momentum
            without changing the underlying analytics logic.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackClick}
          className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white sm:w-auto"
        >
          Back to dashboard
        </button>
      </div>
    </header>
  )
}
