"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer
} from "recharts"
import { logger } from "@/logger"

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/analytics/")
        setData(res.data)
      } catch (err) {
        logger.error("Failed to load analytics", err)
      }
    }
    load()
  }, [])

  const logout = async () => {
    setLoggingOut(true)
    await fetch("/api/logout", { method: "POST" })
    router.push("/login")
  }

  if (!data) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400 animate-pulse px-4 text-center">
        Loading analytics...
      </div>
    )
  }

  const { ticket_stats, overall_metrics, staff_performance } = data

  const pendingFeedback = ticket_stats.resolved - ticket_stats.closed
  const feedbackRate = ticket_stats.resolved
    ? ((ticket_stats.closed / ticket_stats.resolved) * 100).toFixed(1)
    : 0

  const statusData = [
    { name: "Open", value: ticket_stats.open },
    { name: "In Progress", value: ticket_stats.in_progress },
    { name: "Resolved", value: ticket_stats.resolved },
    { name: "Closed", value: ticket_stats.closed },
  ]

  const staffChartData = staff_performance.map((s: any) => ({
    name: s.name,
    rating: s.avg_rating
  }))

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-10 bg-slate-950">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 max-w-7xl mx-auto">

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Admin Analytics
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              System Insights & Performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/admin")}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-slate-700 rounded text-slate-300 hover:border-slate-500"
            >
              ← Dashboard
            </button>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-red-800 text-red-400 rounded hover:bg-red-900/40 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* TICKET STATS */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
            Ticket Status
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
              <p className="text-xs sm:text-sm text-slate-400">Open</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 text-red-400">
                {ticket_stats.open}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
              <p className="text-xs sm:text-sm text-slate-400">In Progress</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 text-yellow-400">
                {ticket_stats.in_progress}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
              <p className="text-xs sm:text-sm text-slate-400">Resolved</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 text-blue-400">
                {ticket_stats.resolved}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
              <p className="text-xs sm:text-sm text-slate-400">Closed</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 text-green-400">
                {ticket_stats.closed}
              </p>
            </div>
          </div>
        </section>

        {/* DERIVED METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Pending Feedback</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-orange-400">
              {pendingFeedback}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Feedback Rate</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-indigo-400">
              {feedbackRate}%
            </p>
          </div>
        </section>

        {/* OVERALL METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Total Tickets</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {overall_metrics.total_tickets}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Resolved Today</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-blue-400">
              {overall_metrics.resolved_today}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Resolved This Week</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-purple-400">
              {overall_metrics.resolved_this_week}
            </p>
          </div>
        </section>

        {/* CHARTS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <h3 className="font-semibold mb-4 text-slate-300 text-sm sm:text-base">
              Ticket Distribution
            </h3>

            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80}>
                  <Cell fill="#ef4444"/>
                  <Cell fill="#f59e0b"/>
                  <Cell fill="#3b82f6"/>
                  <Cell fill="#22c55e"/>
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <h3 className="font-semibold mb-4 text-slate-300 text-sm sm:text-base">
              Staff Ratings
            </h3>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={staffChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="rating" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </section>

        {/* STAFF PERFORMANCE */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold mb-4">
            Staff Performance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {staff_performance.map((staff: any, index: number) => (
              <div
                key={staff.staff_id}
                onClick={() => router.push(`/admin/analytics/staff/${staff.staff_id}`)}
                className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl cursor-pointer sm:hover:border-indigo-500 sm:hover:scale-[1.02] transition"
              >
                <h3 className="font-semibold text-white text-sm sm:text-base">
                  {staff.name}
                </h3>

                <p className="text-yellow-400 mt-2 text-base sm:text-lg">
                  ⭐ {staff.avg_rating}
                </p>

                <p className="text-xs sm:text-sm text-slate-400">
                  {staff.total_feedbacks} reviews
                </p>

                <p className="text-xs text-slate-500 mt-2">
                  Rank #{index + 1}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}