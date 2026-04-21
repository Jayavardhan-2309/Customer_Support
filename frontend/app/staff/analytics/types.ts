export type WorkloadKey = "assigned" | "open" | "in_progress" | "resolved"
export type PriorityLevel = "high" | "normal" | "low"
export type StatusFilter = "all" | "open" | "in_progress" | "resolved"

export type WorkloadStats = Record<WorkloadKey, number>
export type PriorityDistribution = Record<PriorityLevel, number>

export type TicketTrend = {
  date: string
  created: number
  resolved: number
  open_created?: number
  in_progress_created?: number
}

export type ResolutionPerformance = {
  resolved_today: number
  resolved_this_week: number
  avg_resolution_hours: number
}

export type PriorityByStatus = Partial<Record<WorkloadKey, PriorityDistribution>>

export type AnalyticsResponse = {
  workload: WorkloadStats
  ticket_trends: TicketTrend[]
  category_distribution: Record<string, number>
  category_resolved?: Record<string, number>
  priority_by_status?: PriorityByStatus
  priority_distribution: PriorityDistribution
  resolution_performance: ResolutionPerformance
}

export type ChartDatum = {
  name: string
  value: number
  fill?: string
}

export type CategoryChartDatum = ChartDatum & {
  id: string
}

export type RadarDatum = {
  metric: string
  high: number
  normal: number
  low: number
}

export type CategoryComparisonDatum = {
  name: string
  Created: number
  Resolved: number
}

export type TrendValueDatum = {
  date: string
  value: number
}

export type TrendChartDatum = TicketTrend | TrendValueDatum

export type StatCardConfig = {
  key: WorkloadKey
  label: string
  tone: string
  ring: string
  badge: string
}

export type PerformanceCardConfig = {
  key: keyof ResolutionPerformance
  label: string
  tone: string
  accent: string
  suffix?: string
}
