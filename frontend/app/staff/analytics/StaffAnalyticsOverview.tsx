import { PERFORMANCE_CARDS, STAT_CARDS, formatPerformanceValue } from "./analyticsData"
import { Card } from "./Card"
import { MetricCard } from "./MetricCard"
import { StatCard } from "./StatCard"
import { AnalyticsResponse } from "./types"

type Props = {
  readonly analytics: AnalyticsResponse
  readonly resolutionRate: number
  readonly total: number
}

export function StaffAnalyticsOverview({ analytics, resolutionRate, total }: Props) {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={analytics.workload[card.key]}
            badge={card.badge}
            tone={card.tone}
            ring={card.ring}
          />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {PERFORMANCE_CARDS.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            value={formatPerformanceValue(card.key, analytics.resolution_performance[card.key])}
            accent={card.accent}
            tone={card.tone}
            suffix={card.suffix}
          />
        ))}
        <Card title="Resolution rate" subtitle="Resolved tickets across the active workload snapshot">
          <div className="flex h-full flex-col justify-between rounded-3xl border border-cyan-400/10 bg-cyan-400/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Current pace</p>
                <p className="mt-4 text-4xl font-semibold text-cyan-300">{resolutionRate}%</p>
              </div>
              <p className="text-sm text-slate-400">{analytics.workload.resolved} resolved</p>
            </div>
            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-slate-900/80">
                <div
                  className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-700"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">{total} tickets contribute to this rate.</p>
            </div>
          </div>
        </Card>
      </section>
    </>
  )
}
