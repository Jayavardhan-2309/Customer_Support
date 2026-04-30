"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logger } from "@/logger"
import { safeFetch } from "@/src/lib/safeFetch"
import { useAbortableApiData } from "@/src/lib/useAbortableApiData"
import { AdminAnalytics } from "@/types/customTypes"
import { AdminAnalyticsHeader } from "./AdminAnalyticsHeader"
import { AdminAnalyticsLoading } from "./AdminAnalyticsLoading"
import { AdminAnalyticsSections } from "./AdminAnalyticsSections"
import { StatusDatum, getStaffChartData, getStatusData } from "./analyticsHelpers"

export default function AdminAnalyticsPage() {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const { data, isLoading } = useAbortableApiData<AdminAnalytics>("/admin/analytics/", {
    onError: (err) => logger.error("Failed to load analytics", err),
  })

  const logout = async () => {
    setLoggingOut(true)
    await safeFetch("/api/logout", { method: "POST" })
    router.push("/login")
  }

  if (isLoading) {
    return <AdminAnalyticsLoading />
  }

  if (!data) {
    return <div className="min-h-screen bg-slate-950 px-4 py-10 text-center text-slate-300">Unable to load analytics.</div>
  }

  const { ticket_stats, staff_performance } = data
  const pendingFeedback = ticket_stats.resolved - ticket_stats.closed
  const feedbackRate = ticket_stats.resolved ? ((ticket_stats.closed / ticket_stats.resolved) * 100).toFixed(1) : 0
  const statusData: StatusDatum[] = getStatusData(ticket_stats)
  const staffChartData = getStaffChartData(staff_performance)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminAnalyticsHeader loggingOut={loggingOut} onBack={() => router.push("/admin")} onLogout={logout} />
      <AdminAnalyticsSections
        data={data}
        feedbackRate={feedbackRate}
        pendingFeedback={pendingFeedback}
        staffChartData={staffChartData}
        statusData={statusData}
        onStaffSelect={(staffId) => router.push(`/admin/analytics/staff/${staffId}`)}
      />
    </div>
  )
}
