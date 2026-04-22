type MetricCardProps = {
  label: string
  value: string
  accent: string
  tone: string
  suffix?: string
}

export function MetricCard({ label, value, accent, tone, suffix }: Readonly<MetricCardProps>) {
  return (
    <article className={`rounded-3xl border border-white/10 bg-linear-to-br ${tone} p-5 transition duration-300 hover:border-cyan-400/30 hover:-translate-y-1`}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <div className="mt-5 flex items-end gap-1">
        <span className={`text-3xl font-semibold tracking-tight sm:text-4xl ${accent}`}>{value}</span>
        {suffix ? <span className="pb-1 text-sm text-slate-400">{suffix}</span> : null}
      </div>
      <div className="mt-5 h-px w-full bg-linear-to-r from-cyan-400/40 to-transparent" />
    </article>
  )
}
