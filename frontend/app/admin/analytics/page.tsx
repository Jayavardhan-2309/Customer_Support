"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer
} from "recharts"

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/analytics/")
        setData(res.data)
      } catch (err) {
        console.error("Failed to load analytics", err)
      }
    }
    load()
  }, [])

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse">Loading analytics...</p>
    </div>
  )

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
    <div className="min-h-screen bg-gray-50 text-black">

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold">Admin Analytics</h1>
          <button
            onClick={() => router.push("/admin")}
            className="self-start sm:self-auto px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
          >
            ← Admin Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">

        {/* TICKET STATS */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Ticket Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-red-100 rounded-xl">
              <h3 className="text-xs text-red-600 font-medium uppercase tracking-wide">Open</h3>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{ticket_stats.open}</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded-xl">
              <h3 className="text-xs text-yellow-700 font-medium uppercase tracking-wide">In Progress</h3>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{ticket_stats.in_progress}</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-xl">
              <h3 className="text-xs text-blue-600 font-medium uppercase tracking-wide">Resolved</h3>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{ticket_stats.resolved}</p>
            </div>
            <div className="p-4 bg-green-100 rounded-xl">
              <h3 className="text-xs text-green-700 font-medium uppercase tracking-wide">Closed</h3>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{ticket_stats.closed}</p>
            </div>
          </div>
        </div>

        {/* DERIVED METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 bg-orange-100 rounded-xl">
            <h3 className="text-xs text-orange-700 font-medium uppercase tracking-wide">Pending Feedback</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{pendingFeedback}</p>
          </div>
          <div className="p-4 bg-indigo-100 rounded-xl">
            <h3 className="text-xs text-indigo-700 font-medium uppercase tracking-wide">Feedback Rate</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{feedbackRate}%</p>
          </div>
        </div>

        {/* OVERALL METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 bg-gray-100 rounded-xl">
            <h3 className="text-xs text-gray-600 font-medium uppercase tracking-wide">Total Tickets</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{overall_metrics.total_tickets}</p>
          </div>
          <div className="p-4 bg-blue-100 rounded-xl">
            <h3 className="text-xs text-blue-600 font-medium uppercase tracking-wide">Resolved Today</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{overall_metrics.resolved_today}</p>
          </div>
          <div className="p-4 bg-purple-100 rounded-xl">
            <h3 className="text-xs text-purple-700 font-medium uppercase tracking-wide">Resolved This Week</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{overall_metrics.resolved_this_week}</p>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4 text-sm text-gray-700">Ticket Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={85}>
                  <Cell fill="#ef4444"/>
                  <Cell fill="#f59e0b"/>
                  <Cell fill="#3b82f6"/>
                  <Cell fill="#22c55e"/>
                </Pie>
                <Tooltip/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4 text-sm text-gray-700">Staff Ratings</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={staffChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="rating" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STAFF PERFORMANCE */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Staff Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {staff_performance.map((staff: any, index: number) => (
              <div
                key={staff.staff_id}
                onClick={() => router.push(`/admin/staff/${staff.staff_id}`)}
                className="p-4 bg-white shadow-sm rounded-xl border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-800">{staff.name}</h3>
                <p className="text-yellow-500 mt-2 text-lg">⭐ {staff.avg_rating}</p>
                <p className="text-sm text-gray-500">{staff.total_feedbacks} reviews</p>
                <p className="text-xs text-gray-400 mt-2">Rank #{index + 1}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}