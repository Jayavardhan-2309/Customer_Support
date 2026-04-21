import { ReactNode } from "react"

type CardProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function Card({ title, subtitle, children }: Readonly<CardProps>) {
  return (
    <section className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_-48px_rgba(14,165,233,0.65)] transition duration-300 hover:border-cyan-400/30 hover:shadow-[0_28px_90px_-46px_rgba(56,189,248,0.5)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 transition duration-300 group-hover:scale-105 group-hover:border-cyan-300/30" />
      </div>
      <div className="min-h-[260px]">{children}</div>
    </section>
  )
}
