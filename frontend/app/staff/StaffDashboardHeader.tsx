type Props = {
  readonly isLoggingOut: boolean
  readonly onAnalytics: () => void
  readonly onLogout: () => void
  readonly orgName: string
  readonly staffName: string
}

export function StaffDashboardHeader({ isLoggingOut, onAnalytics, onLogout, orgName, staffName }: Props) {
  return (
    <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex flex-col gap-1">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-white">Staff Dashboard</h1>
            {orgName && (
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                {orgName}
              </span>
            )}
          </div>
          {staffName && <p className="text-xs sm:text-sm text-slate-400">Welcome, <b className="text-white">{staffName}</b></p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAnalytics}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-700 transition"
          >
            Analytics
          </button>
          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 border border-red-800 rounded-md hover:bg-red-900/40 disabled:opacity-50 transition"
          >
            {isLoggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  )
}
