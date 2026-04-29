"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { logger } from "@/logger"
import api from "@/src/lib/axios"
import { safeFetch } from "@/src/lib/safeFetch"
import { AdminAnalytics } from "@/types/customTypes"
import { AdminAnalyticsHeader } from "./AdminAnalyticsHeader"
import { AdminAnalyticsLoading } from "./AdminAnalyticsLoading"
import { AdminAnalyticsSections } from "./AdminAnalyticsSections"
import { StatusDatum, getStaffChartData, getStatusData } from "./analyticsHelpers"

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await api.get("/admin/analytics/", { signal: controller.signal })
        if (!controller.signal.aborted) {
          setData(res.data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          logger.error("Failed to load analytics", err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [])

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
