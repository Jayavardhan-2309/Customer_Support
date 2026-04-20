const LoadingView = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 bg-slate-950">
    <div className="w-8 h-8 border-[3px] border-slate-700 border-t-white rounded-full animate-spin" />
    <p className="text-slate-400 text-sm">Loading your tickets…</p>
  </div>
)

export default LoadingView