"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
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

  if (!data) return <p className="p-6">Loading...</p>

  const { ticket_stats, overall_metrics, staff_performance } = data

  // 🔥 Derived metrics
  const pendingFeedback = ticket_stats.resolved - ticket_stats.closed

  const feedbackRate = ticket_stats.resolved
    ? ((ticket_stats.closed / ticket_stats.resolved) * 100).toFixed(1)
    : 0

  // 📊 Chart data
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
    <div className="p-6 text-black space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Analytics</h1>

        <div className="flex gap-3">

          {/* Go to Admin Dashboard */}
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Admin Dashboard
          </button>          

        </div>
    </div>

      {/* 🔹 TICKET STATS */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-red-100 rounded">
          <h3>Open</h3>
          <p className="text-xl font-bold">{ticket_stats.open}</p>
        </div>

        <div className="p-4 bg-yellow-100 rounded">
          <h3>In Progress</h3>
          <p className="text-xl font-bold">{ticket_stats.in_progress}</p>
        </div>

        <div className="p-4 bg-blue-100 rounded">
          <h3>Resolved</h3>
          <p className="text-xl font-bold">{ticket_stats.resolved}</p>
        </div>

        <div className="p-4 bg-green-100 rounded">
          <h3>Closed</h3>
          <p className="text-xl font-bold">{ticket_stats.closed}</p>
        </div>
      </div>

      {/* 🔥 DERIVED METRICS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-orange-100 rounded">
          <h3>Pending Feedback</h3>
          <p className="text-xl font-bold">{pendingFeedback}</p>
        </div>

        <div className="p-4 bg-indigo-100 rounded">
          <h3>Feedback Rate</h3>
          <p className="text-xl font-bold">{feedbackRate}%</p>
        </div>
      </div>

      {/* 🔹 OVERALL METRICS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3>Total Tickets</h3>
          <p className="text-xl font-bold">{overall_metrics.total_tickets}</p>
        </div>

        <div className="p-4 bg-blue-100 rounded">
          <h3>Resolved Today</h3>
          <p className="text-xl font-bold">{overall_metrics.resolved_today}</p>
        </div>

        <div className="p-4 bg-purple-100 rounded">
          <h3>Resolved This Week</h3>
          <p className="text-xl font-bold">{overall_metrics.resolved_this_week}</p>
        </div>
      </div>

      {/* 📊 CHARTS */}
      <div className="grid grid-cols-2 gap-6">

        {/* Pie Chart */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Ticket Distribution</h3>
          <PieChart width={300} height={250}>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
              <Cell fill="#ef4444"/>
              <Cell fill="#f59e0b"/>
              <Cell fill="#3b82f6"/>
              <Cell fill="#22c55e"/>
            </Pie>
            <Tooltip/>
            <Legend/>
          </PieChart>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Staff Ratings</h3>
          <BarChart width={350} height={250} data={staffChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="rating" fill="#6366f1" />
          </BarChart>
        </div>

      </div>

      {/* 🔹 STAFF PERFORMANCE */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Staff Performance</h2>

        <div className="grid grid-cols-3 gap-4">
          {staff_performance.map((staff: any, index: number) => (
            <div
              key={staff.staff_id}
              onClick={() => router.push(`/admin/staff/${staff.staff_id}`)}
              className="p-4 bg-white shadow rounded cursor-pointer hover:shadow-lg transition"
            >
              <h3 className="font-semibold">{staff.name}</h3>

              <p className="text-yellow-500 mt-2">
                ⭐ {staff.avg_rating}
              </p>

              <p className="text-sm text-gray-600">
                {staff.total_feedbacks} reviews
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Rank #{index + 1}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}