"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/src/lib/axios"
import { logger } from "@/logger"
import { PERFORMANCE_CARDS, STAT_CARDS, deriveMetrics, formatPerformanceValue, getCategoryData, getPriorityData, getStatusData, getTrendState } from "./analyticsData"
import { Card } from "./Card"
import { FilterSelect } from "./FilterSelect"
import { MetricCard } from "./MetricCard"
import { StatCard } from "./StatCard"
import { AreaMetricChart } from "./charts/AreaMetricChart"
import { BarMetricChart } from "./charts/BarMetricChart"
import { DonutChart } from "./charts/DonutChart"
import { RadarMetricChart } from "./charts/RadarMetricChart"
import { TrendLineChart } from "./charts/TrendLineChart"
import { AnalyticsResponse, StatusFilter } from "./types"

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [daysFilter, setDaysFilter] = useState(7)
  const router = useRouter()

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsResponse>("staff/analytics/")
        setAnalytics(response.data)
      } catch (error) {
        logger.error("Failed to load staff analytics", error)
      }
    }

    void loadAnalytics()
  }, [])

  if (!analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#164e63_0%,#020617_44%,#020617_100%)] px-6">
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-slate-950/70 px-10 py-8 backdrop-blur">
          <div className="h-12 w-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Loading analytics</p>
        </div>
      </div>
    )
  }

  const statusData = getStatusData(analytics.workload)
  const priorityData = getPriorityData(analytics.priority_distribution)
  const categoryData = getCategoryData(analytics.category_distribution)
  const { resolutionRate, backlogPressure, radarData, efficiencyData, cumulativeData, categoryComparison, total } = deriveMetrics(analytics)
  const trendState = getTrendState(analytics.ticket_trends, statusFilter, daysFilter)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f766e_0%,#082f49_24%,#020617_62%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Staff Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Support analytics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A cleaner, responsive view of workload, flow, and ticket momentum without changing the underlying analytics logic.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/staff")}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
          >
            Back to dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <StatCard key={card.key} label={card.label} value={analytics.workload[card.key]} badge={card.badge} tone={card.tone} ring={card.ring} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {PERFORMANCE_CARDS.map((card) => (
            <MetricCard key={card.key} label={card.label} value={formatPerformanceValue(card.key, analytics.resolution_performance[card.key])} accent={card.accent} tone={card.tone} suffix={card.suffix} />
          ))}
          <Card title="Resolution rate" subtitle="Resolved tickets across the active workload snapshot">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-cyan-400/10 bg-cyan-400/5 p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Current pace</p>
                  <p className="mt-4 text-4xl font-semibold text-cyan-300">{resolutionRate}%</p>
                </div>
                <p className="text-sm text-slate-400">{analytics.workload.resolved} resolved</p>
              </div>
              <div className="mt-6">
                <div className="h-3 overflow-hidden rounded-full bg-slate-900/80">
                  <div className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-700" style={{ width: `${resolutionRate}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{total} tickets contribute to this rate.</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title="Status split" subtitle="Open, in progress, and resolved ticket mix">
            <DonutChart data={statusData} emptyMessage="Status data is not available yet" />
          </Card>
          <Card title="Priority split" subtitle="How urgency is distributed across your workload">
            <DonutChart data={priorityData} emptyMessage="Priority data is not available yet" />
          </Card>
          <Card title="Category split" subtitle="Where ticket volume is concentrated">
            <DonutChart data={categoryData} emptyMessage="Category data is not available yet" />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Backlog pressure" subtitle="Active tickets versus resolved tickets">
            <DonutChart data={backlogPressure} emptyMessage="Backlog comparison is not available yet" />
          </Card>
          <Card title="Priority and status" subtitle="Priority spread across each ticket state">
            <RadarMetricChart data={radarData} />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Category volume" subtitle="Ticket count by category">
            <BarMetricChart data={categoryData} bars={[{ dataKey: "value", color: "#38bdf8" }]} emptyMessage="Category volume data is not available yet" />
          </Card>
          <Card title="Created versus resolved" subtitle="Category-by-category output comparison">
            <BarMetricChart data={categoryComparison} bars={[{ dataKey: "Created", color: "#38bdf8" }, { dataKey: "Resolved", color: "#34d399" }]} emptyMessage="Category comparison data is not available yet" />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Daily efficiency" subtitle="Resolved percentage against created tickets over the last 14 days">
            <AreaMetricChart data={efficiencyData} areas={[{ dataKey: "efficiency", stroke: "#22d3ee", fill: "#22d3ee" }]} emptyMessage="Efficiency data is not available yet" />
          </Card>
          <Card title="Cumulative flow" subtitle="Running total of opened versus resolved tickets">
            <AreaMetricChart data={cumulativeData} areas={[{ dataKey: "Opened", stroke: "#38bdf8", fill: "#38bdf8" }, { dataKey: "Resolved", stroke: "#34d399", fill: "#34d399" }]} emptyMessage="Cumulative flow data is not available yet" />
          </Card>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_-48px_rgba(34,211,238,0.4)] backdrop-blur sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Ticket trends</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Momentum view</h2>
              <p className="mt-2 text-sm text-slate-400">Filter the same ticket-trend data by status and time window.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { label: "All tickets", value: "all" },
                  { label: "Open", value: "open" },
                  { label: "In progress", value: "in_progress" },
                  { label: "Resolved", value: "resolved" },
                ]}
              />
              <FilterSelect
                label="Range"
                value={daysFilter}
                onChange={(value) => setDaysFilter(Number(value))}
                options={[
                  { label: "Last 7 days", value: 7 },
                  { label: "Last 3 days", value: 3 },
                ]}
              />
            </div>
          </div>
          <TrendLineChart data={trendState.chartData} lineLabel={trendState.lineLabel} singleSeries={trendState.singleSeries} />
        </section>
      </main>
    </div>
  )
}
