type Props = {
  readonly isLoggingOut: boolean
  readonly orgName: string
  readonly onAnalytics?: () => void
  readonly onKnowledgeBase?: () => void
  readonly onLogout: () => void
  readonly onStaff?: () => void
  readonly subtitle: string
  readonly title: string
}

export function AdminHeader({
  isLoggingOut,
  orgName,
  onAnalytics,
  onKnowledgeBase,
  onLogout,
  onStaff,
  subtitle,
  title,
}: Props) {
  return (
    <header className="border-b border-slate-800 px-4 sm:px-8 py-4 sm:py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">{title}</h1>
            {orgName && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">{orgName}</span>}
          </div>
          <p className="text-slate-400 text-xs">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onKnowledgeBase && <button onClick={onKnowledgeBase} className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all">Knowledge Base</button>}
          {onStaff && <button onClick={onStaff} className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all">Staff</button>}
          {onAnalytics && <button onClick={onAnalytics} className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all">Analytics</button>}
          <button onClick={onLogout} disabled={isLoggingOut} className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-2 rounded transition-all disabled:opacity-50">
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  )
}
