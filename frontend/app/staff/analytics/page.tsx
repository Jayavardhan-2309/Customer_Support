"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logger } from "@/logger"
import api from "@/src/lib/axios"
import { useAbortableApiData } from "@/src/lib/useAbortableApiData"
import { AnalyticsLoading } from "./AnalyticsLoading"
import { deriveMetrics, getCategoryData, getPriorityData, getStatusData, getTrendState } from "./analyticsData"
import { StaffAnalyticsCharts } from "./StaffAnalyticsCharts"
import { StaffAnalyticsHeader } from "./StaffAnalyticsHeader"
import { StaffAnalyticsOverview } from "./StaffAnalyticsOverview"
import { StaffAnalyticsTrendSection } from "./StaffAnalyticsTrendSection"
import { AnalyticsResponse, StatusFilter } from "./types"

export default function AnalyticsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [daysFilter, setDaysFilter] = useState(7)
  const router = useRouter()
  const { data: analytics, isLoading } = useAbortableApiData<AnalyticsResponse>({
    load: async (signal) => {
      const response = await api.get<AnalyticsResponse>("staff/analytics/", { signal })
      return response.data
    },
    onError: (error) => logger.error("Failed to load staff analytics", error),
  })

  if (isLoading) {
    return <AnalyticsLoading />
  }

  if (!analytics) {
    return <div className="min-h-screen bg-slate-950 px-4 py-10 text-center text-slate-300">Unable to load analytics.</div>
  }

  const statusData = getStatusData(analytics.workload)
  const priorityData = getPriorityData(analytics.priority_distribution)
  const categoryData = getCategoryData(analytics.category_distribution)
  const metrics = deriveMetrics(analytics)
  const trendState = getTrendState(analytics.ticket_trends, statusFilter, daysFilter)
  const handleRangeFilterChange = (value: string) => {
    const selectedDays = Number(value)
    if (Number.isFinite(selectedDays)) {
      setDaysFilter(selectedDays)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f766e_0%,#082f49_24%,#020617_62%,#020617_100%)] text-slate-100">
      <StaffAnalyticsHeader onBackClick={() => router.push("/staff")} />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-10 lg:px-8 lg:py-10">
        <StaffAnalyticsOverview analytics={analytics} resolutionRate={metrics.resolutionRate} total={metrics.total} />
        <StaffAnalyticsCharts
          backlogPressure={metrics.backlogPressure}
          categoryComparison={metrics.categoryComparison}
          categoryData={categoryData}
          cumulativeData={metrics.cumulativeData}
          efficiencyData={metrics.efficiencyData}
          priorityData={priorityData}
          radarData={metrics.radarData}
          statusData={statusData}
        />
        <StaffAnalyticsTrendSection
          daysFilter={daysFilter}
          lineLabel={trendState.lineLabel}
          onRangeFilterChange={handleRangeFilterChange}
          onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
          singleSeries={trendState.singleSeries}
          statusFilter={statusFilter}
          trendData={trendState.chartData}
        />
      </main>
    </div>
  )
}
