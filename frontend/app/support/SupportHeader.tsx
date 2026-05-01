type Props = {
  readonly isLoggingOut: boolean
  readonly onFeedback: () => void
  readonly onLogout: () => void
  readonly orgName: string
}

export function SupportHeader({ isLoggingOut, onFeedback, onLogout, orgName }: Props) {
  return (
    <header className="shrink-0 bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center flex-wrap gap-2">
          <h1 className="text-sm font-bold">Support</h1>
          {orgName && (
            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
              {orgName}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-[10px] hidden landscape:block">Type or speak to get help.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onFeedback}
          className="text-[11px] text-indigo-400 border border-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900/40"
        >
          Feedback
        </button>
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={onLogout}
          className="text-[11px] text-red-400 border border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-900/40"
        >
          {isLoggingOut ? "..." : "Logout"}
        </button>
      </div>
    </header>
  )
}
