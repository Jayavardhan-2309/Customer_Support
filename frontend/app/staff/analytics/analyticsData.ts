import {
  AnalyticsResponse,
  CategoryChartDatum,
  CategoryComparisonDatum,
  ChartDatum,
  PerformanceCardConfig,
  PriorityDistribution,
  RadarDatum,
  ResolutionPerformance,
  StatCardConfig,
  StatusFilter,
  TicketTrend,
  TrendChartDatum,
} from "./types"

const STATUS_PIE_COLORS = ["#f97316", "#facc15", "#22c55e"]
const PRIORITY_PIE_COLORS = ["#fb7185", "#60a5fa", "#34d399"]
const CATEGORY_COLORS = ["#38bdf8", "#818cf8", "#f472b6", "#fb923c", "#4ade80", "#facc15"]

export const STAT_CARDS: StatCardConfig[] = [
  { key: "assigned", label: "Assigned", tone: "from-slate-900 via-slate-800 to-slate-900", ring: "ring-slate-700/70", badge: "ASG" },
  { key: "open", label: "Open", tone: "from-orange-950 via-orange-900 to-rose-950", ring: "ring-orange-700/60", badge: "OPN" },
  { key: "in_progress", label: "In Progress", tone: "from-amber-950 via-yellow-900 to-amber-950", ring: "ring-yellow-700/60", badge: "WIP" },
  { key: "resolved", label: "Resolved", tone: "from-emerald-950 via-emerald-900 to-teal-950", ring: "ring-emerald-700/60", badge: "RSL" },
]

export const PERFORMANCE_CARDS: PerformanceCardConfig[] = [
  { key: "resolved_today", label: "Resolved Today", tone: "from-emerald-950/80 to-slate-950", accent: "text-emerald-300" },
  { key: "resolved_this_week", label: "This Week", tone: "from-sky-950/80 to-slate-950", accent: "text-sky-300" },
  { key: "avg_resolution_hours", label: "Avg Resolution Time", tone: "from-indigo-950/80 to-slate-950", accent: "text-indigo-300", suffix: "h" },
]

export function getStatusData(workload: AnalyticsResponse["workload"]): ChartDatum[] {
  return [
    { name: "Open", value: workload.open ?? 0, fill: STATUS_PIE_COLORS[0] },
    { name: "In Progress", value: workload.in_progress ?? 0, fill: STATUS_PIE_COLORS[1] },
    { name: "Resolved", value: workload.resolved ?? 0, fill: STATUS_PIE_COLORS[2] },
  ]
}

export function getPriorityData(priorityDistribution: PriorityDistribution): ChartDatum[] {
  return [
    { name: "High", value: priorityDistribution.high ?? 0, fill: PRIORITY_PIE_COLORS[0] },
    { name: "Normal", value: priorityDistribution.normal ?? 0, fill: PRIORITY_PIE_COLORS[1] },
    { name: "Low", value: priorityDistribution.low ?? 0, fill: PRIORITY_PIE_COLORS[2] },
  ]
}

export function getCategoryData(categoryDistribution: Record<string, number>): CategoryChartDatum[] {
  return Object.entries(categoryDistribution).map(([name, value], index) => ({
    id: name.toLowerCase().replaceAll(/\s+/g, "-"),
    name,
    value,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }))
}

export function deriveMetrics(analytics: AnalyticsResponse) {
  const { workload, ticket_trends, category_distribution, category_resolved, priority_by_status } = analytics
  const total = (workload.open ?? 0) + (workload.in_progress ?? 0) + (workload.resolved ?? 0)
  const resolutionRate = total > 0 ? Math.round(((workload.resolved ?? 0) / total) * 100) : 0

  const backlogPressure: ChartDatum[] = [
    { name: "Active", value: (workload.open ?? 0) + (workload.in_progress ?? 0), fill: "#f97316" },
    { name: "Resolved", value: workload.resolved ?? 0, fill: "#22c55e" },
  ]

  const labels = { assigned: "Assigned", open: "Open", in_progress: "In Progress", resolved: "Resolved" } as const
  const radarData: RadarDatum[] | null = priority_by_status
    ? (Object.entries(labels) as Array<[keyof typeof labels, string]>)
        .filter(([key]) => priority_by_status[key])
        .map(([key, metric]) => ({
          metric,
          high: priority_by_status[key]?.high ?? 0,
          normal: priority_by_status[key]?.normal ?? 0,
          low: priority_by_status[key]?.low ?? 0,
        }))
    : null

  let cumulativeOpened = 0
  let cumulativeResolved = 0

  return {
    total,
    resolutionRate,
    backlogPressure,
    radarData: radarData?.length ? radarData : null,
    efficiencyData: ticket_trends.slice(-14).map((trend) => ({
      date: trend.date,
      efficiency: trend.created > 0 ? Math.round((trend.resolved / trend.created) * 100) : 0,
    })),
    cumulativeData: ticket_trends.slice(-14).map((trend) => {
      cumulativeOpened += trend.open_created ?? trend.created ?? 0
      cumulativeResolved += trend.resolved ?? 0

      return {
        date: trend.date,
        Opened: cumulativeOpened,
        Resolved: cumulativeResolved,
      }
    }),
    categoryComparison: category_resolved
      ? Object.entries(category_distribution).map(([name, created]) => ({
          name,
          Created: created,
          Resolved: category_resolved[name] ?? 0,
        }))
      : null as CategoryComparisonDatum[] | null,
  }
}

export function getTrendState(ticketTrends: TicketTrend[], statusFilter: StatusFilter, daysFilter: number) {
  const trimmed = daysFilter === 7 ? ticketTrends.slice(-7) : ticketTrends.slice(-3)

  if (statusFilter === "all") {
    return {
      lineLabel: "Created vs Resolved",
      chartData: trimmed as TrendChartDatum[],
      singleSeries: false,
    }
  }


  const statusMap: Record<Exclude<StatusFilter, "all">, keyof TicketTrend> = {
    resolved: "resolved",
    open: "open_created",
    in_progress: "in_progress_created",
  };
  
  const key = statusMap[statusFilter];

  return {
    lineLabel: statusFilter === "resolved" ? "Resolved" : `${statusFilter.replace("_", " ")} created`,
    chartData: trimmed.map((trend) => ({
      date: trend.date,
      value: trend[key] ?? 0,
    })) as TrendChartDatum[],
    singleSeries: true,
  }
}

export function formatPerformanceValue(key: keyof ResolutionPerformance, value: number) {
  return key === "avg_resolution_hours" ? value.toFixed(1) : String(value)
}
