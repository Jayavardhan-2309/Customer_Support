type StatCardProps = {
  label: string
  value: number
  badge: string
  tone: string
  ring: string
}

export function StatCard({ label, value, badge, tone, ring }: StatCardProps) {
  return (
    <article className={`group rounded-[26px] bg-gradient-to-br ${tone} p-[1px] shadow-[0_20px_60px_-40px_rgba(56,189,248,0.7)] transition duration-300 hover:-translate-y-1`}>
      <div className={`rounded-[25px] bg-slate-950/95 p-5 ring-1 ${ring}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{value}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.32em] text-slate-300">
            {badge}
          </span>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition duration-500 group-hover:w-full" />
        </div>
      </div>
    </article>
  )
}
