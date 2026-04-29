export function AnalyticsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#164e63_0%,#020617_44%,#020617_100%)] px-6">
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-slate-950/70 px-10 py-8 backdrop-blur">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Loading analytics</p>
      </div>
    </div>
  );
}
