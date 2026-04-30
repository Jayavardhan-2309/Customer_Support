type Props = {
  readonly loggingOut: boolean
  readonly onBack: () => void
  readonly onLogout: () => void
}

export function AdminAnalyticsHeader({ loggingOut, onBack, onLogout }: Props) {
  return (
    <header className="border-b border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-10 bg-slate-950">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Admin Analytics</h1>
          <p className="text-slate-400 text-xs sm:text-sm">System Insights & Performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-slate-700 rounded text-slate-300 hover:border-slate-500"
          >
            ← Dashboard
          </button>
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-red-800 text-red-400 rounded hover:bg-red-900/40 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  )
}
