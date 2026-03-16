"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, BarChart, Bar, CartesianGrid,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, ReferenceLine,
} from "recharts"

// Visual constants (styling only, no data)
const STAT_CARDS = [
  { key: "assigned",    label: "Assigned",    color: "from-slate-700 to-slate-600",     border: "border-slate-500",   text: "text-slate-200",   icon: "📋" },
  { key: "open",        label: "Open",        color: "from-rose-900 to-rose-800",       border: "border-rose-600",    text: "text-rose-200",    icon: "🔴" },
  { key: "in_progress", label: "In Progress", color: "from-amber-900 to-amber-800",     border: "border-amber-500",   text: "text-amber-200",   icon: "🟡" },
  { key: "resolved",    label: "Resolved",    color: "from-emerald-900 to-emerald-800", border: "border-emerald-500", text: "text-emerald-200", icon: "✅" },
]

const PERF_CARDS = [
  { key: "resolved_today",       label: "Resolved Today",      accent: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800" },
  { key: "resolved_this_week",   label: "This Week",            accent: "text-sky-400",     bg: "bg-sky-950/40 border-sky-800" },
  { key: "avg_resolution_hours", label: "Avg Resolution Time",  accent: "text-violet-400",  bg: "bg-violet-950/40 border-violet-800" },
]

const STATUS_PIE_COLORS   = ["#f43f5e", "#f59e0b", "#22c55e"]
const PRIORITY_PIE_COLORS = ["#ef4444", "#f97316", "#86efac"]
const CATEGORY_COLORS     = ["#6366f1", "#3b82f6", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"]

const axisStyle = { tick: { fill: "#94a3b8", fontSize: 12 }, axisLine: false as const, tickLine: false as const }
const gridStyle = { strokeDasharray: "3 3", stroke: "#1e293b" }

// Shared tooltip

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1f2e] border border-slate-700 rounded-lg px-4 py-2 shadow-xl text-sm">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="font-semibold">
          {entry.name}: {entry.value ?? "—"}
        </p>
      ))}
    </div>
  )
}

// Reusable card

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-[#161b27] border border-slate-800 rounded-2xl p-6">
    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-1">{title}</h2>
    {subtitle ? <p className="text-xs text-slate-500 mb-4">{subtitle}</p> : <div className="mb-4" />}
    {children}
  </div>
)

// Empty state

const EmptyChart = ({ message = "No data available" }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-45">
    <p className="text-slate-600 text-sm italic">{message}</p>
  </div>
)

// Pure derivation from real API fields — zero fabrication

function deriveMetrics(a: any) {
  const { workload, ticket_trends, category_distribution, category_resolved, priority_by_status } = a

  // Resolution rate: workload counts come directly from backend
  const total          = (workload.open || 0) + (workload.in_progress || 0) + (workload.resolved || 0)
  const resolutionRate = total > 0 ? Math.round((workload.resolved / total) * 100) : 0

  // Backlog pressure: derived from real workload counts
  const backlogPressure = [
    { name: "Active (open + in-progress)", value: (workload.open || 0) + (workload.in_progress || 0) },
    { name: "Resolved",                    value: workload.resolved || 0 },
  ]

  // Radar: built entirely from priority_by_status returned by the backend.
  // Shape from backend: { open: {high,normal,low}, in_progress: {...}, resolved: {...}, assigned: {...} }
  // Returns null → chart is hidden rather than shown with fake data.
  const RADAR_STATUS_KEYS: Record<string, string> = {
    open: "Open", in_progress: "In Progress", resolved: "Resolved", assigned: "Assigned",
  }
  let radarData: any[] | null = null
  if (priority_by_status && Object.keys(priority_by_status).length > 0) {
    const rows = Object.entries(RADAR_STATUS_KEYS)
      .filter(([key]) => priority_by_status[key])
      .map(([key, label]) => ({
        metric: label,
        high:   priority_by_status[key]?.high   ?? 0,
        normal: priority_by_status[key]?.normal ?? 0,
        low:    priority_by_status[key]?.low    ?? 0,
      }))
    radarData = rows.length > 0 ? rows : null
  }

  // Resolution efficiency: resolved ÷ created each day — both from ticket_trends
  const efficiencyData = (ticket_trends || []).slice(-14).map((d: any) => ({
    date:       d.date,
    efficiency: d.created > 0 ? Math.round((d.resolved / d.created) * 100) : 0,
  }))

  // Cumulative flow: running totals built from ticket_trends
  let cumOpen = 0; let cumResolved = 0
  const cumulativeData = (ticket_trends || []).slice(-14).map((d: any) => {
    cumOpen     += d.open_created || d.created || 0
    cumResolved += d.resolved || 0
    return { date: d.date, "Cumulative Opened": cumOpen, "Cumulative Resolved": cumResolved }
  })

  // Category created vs resolved: category_distribution = created, category_resolved = resolved.
  // Both are real backend fields. Returns null → chart hidden if category_resolved is absent.
  let categoryComposed: any[] | null = null
  if (category_resolved && Object.keys(category_resolved).length > 0) {
    categoryComposed = Object.entries(category_distribution as Record<string, number>).map(([name, created]) => ({
      name,
      Created:  created,
      Resolved: category_resolved[name] ?? 0,
    }))
  }

  return { resolutionRate, backlogPressure, radarData, efficiencyData, cumulativeData, categoryComposed, total }
}

// Page

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [daysFilter,   setDaysFilter]   = useState(7)
  const router = useRouter()

  useEffect(() => {
    api.get("/staff/analytics/").then(r => setAnalytics(r.data)).catch(console.error)
  }, [])

  if (!analytics)
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 tracking-widest uppercase text-xs">Loading analytics…</p>
        </div>
      </div>
    )

  // All chart data prepared from API response

  const statusData = [
    { name: "Open",        value: analytics.workload.open },
    { name: "In Progress", value: analytics.workload.in_progress },
    { name: "Resolved",    value: analytics.workload.resolved },
  ]

  const priorityData = [
    { name: "High",   value: analytics.priority_distribution.high   || 0 },
    { name: "Normal", value: analytics.priority_distribution.normal || 0 },
    { name: "Low",    value: analytics.priority_distribution.low    || 0 },
  ]

  const categoryData: { name: string; value: number }[] = Object.entries(
    analytics.category_distribution as Record<string, number>
  ).map(([name, value]) => ({ name, value }))

  // Trend filtering — purely slicing real backend data
  let filteredTrendData = [...(analytics.ticket_trends || [])]
  filteredTrendData = daysFilter === 7 ? filteredTrendData.slice(-7) : filteredTrendData.slice(-3)

  let lineKey = "created"; let lineLabel = "Created"
  if (statusFilter === "open")        { lineKey = "open_created";         lineLabel = "Open Tickets Created" }
  if (statusFilter === "in_progress") { lineKey = "in_progress_created";  lineLabel = "In Progress Tickets Created" }
  if (statusFilter === "resolved")    { lineKey = "resolved";             lineLabel = "Resolved" }

  if (statusFilter !== "all") {
    filteredTrendData = filteredTrendData.map((item: any) => ({
      date:  item.date,
      value: item[lineKey] ?? 0,
    }))
  }

  const {
    resolutionRate, backlogPressure, radarData,
    efficiencyData, cumulativeData, categoryComposed, total,
  } = deriveMetrics(analytics)

  // Render

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d1117]/80 backdrop-blur border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 rounded-full bg-linear-to-b from-violet-500 to-indigo-500" />
          <h1 className="text-xl font-bold tracking-tight">Support Analytics</h1>
        </div>
        <button
          onClick={() => router.push("/staff")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-300 hover:text-white transition-all duration-200"
        >
          ← Dashboard
        </button>
      </header>

      <main className="px-6 md:px-10 py-8 max-w-7xl mx-auto space-y-10">

        {/* 1 Workload KPI */}
        <section>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">Workload Overview</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ key, label, color, border, text, icon }) => (
              <div key={key} className={`relative overflow-hidden rounded-2xl border ${border} bg-linear-to-br ${color} p-5 flex flex-col gap-2`}>
                <div className="absolute -top-4 -right-4 text-5xl opacity-10 select-none">{icon}</div>
                <span className={`text-xs uppercase tracking-wider font-semibold ${text} opacity-70`}>{label}</span>
                <span className={`text-4xl font-extrabold ${text} leading-none`}>{analytics.workload[key] ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 2 Performance + Resolution Rate */}
        <section>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">Resolution Performance</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PERF_CARDS.map(({ key, label, accent, bg }) => (
              <div key={key} className={`rounded-2xl border ${bg} p-6 flex flex-col gap-1`}>
                <span className="text-xs text-slate-400 uppercase tracking-widest">{label}</span>
                <span className={`text-3xl font-bold ${accent}`}>{analytics.resolution_performance[key] ?? "—"}</span>
              </div>
            ))}

            {/* Resolution rate — computed from real workload counts */}
            <div className="rounded-2xl border border-indigo-800 bg-indigo-950/40 p-6 flex flex-col gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-widest">Resolution Rate</span>
              <span className="text-3xl font-bold text-indigo-400">{resolutionRate}%</span>
              <div className="w-full h-2 rounded-full bg-slate-700 mt-1">
                <div
                  className="h-2 rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{analytics.workload.resolved} of {total} tickets</span>
            </div>
          </div>
        </section>

        {/* 3 Distribution pies */}
        <section>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">Distributions</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Status">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                    {statusData.map((_, i) => <Cell key={i} fill={STATUS_PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Priority">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                    {priorityData.map((_, i) => <Cell key={i} fill={PRIORITY_PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Category">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                      {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </Card>
          </div>
        </section>

        {/* 4 Backlog pressure + Radar */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backlog: derived from real workload.open + workload.in_progress + workload.resolved */}
          <Card title="Backlog Pressure" subtitle="Active (open + in-progress) vs resolved tickets">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={backlogPressure} dataKey="value" nameKey="name" outerRadius={90} innerRadius={55}>
                  <Cell fill="#f43f5e" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/*
            Radar: shown only when priority_by_status is present in the API response.
            That field is now returned by get_priority_by_status() in analytics_service.py.
            If it's missing for any reason, shows a clear empty state — no fake data.
          */}
          <Card title="Priority × Status Radar" subtitle="How each priority level spreads across ticket states">
            {radarData ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: "#475569", fontSize: 10 }} />
                  <Radar name="High"   dataKey="high"   stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
                  <Radar name="Normal" dataKey="normal" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  <Radar name="Low"    dataKey="low"    stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No priority breakdown data available" />
            )}
          </Card>
        </section>

        {/* 5 Category volume + Created vs Resolved */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Category Volume" subtitle="Ticket count per category">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid {...gridStyle} horizontal={false} />
                  <XAxis type="number" {...axisStyle} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </Card>

          {/*
            Created vs Resolved: shown only when category_resolved is in the API response.
            That field is now returned by get_category_resolved() in analytics_service.py.
            "Created" = category_distribution value (existing field).
            "Resolved" = category_resolved value (new field).
            Zero multipliers — both numbers come straight from the DB.
          */}
          <Card title="Category: Created vs Resolved" subtitle="Side-by-side volume per category">
            {categoryComposed ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryComposed} barCategoryGap="20%" barGap={4}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis {...axisStyle} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                  <Bar dataKey="Created"  fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No category resolution data available" />
            )}
          </Card>
        </section>

        {/* 6 Resolution efficiency + Cumulative flow */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Efficiency: resolved ÷ created per day — both fields from ticket_trends */}
          <Card title="Daily Resolution Efficiency" subtitle="Resolved ÷ Created each day (%) — 100% = fully keeping up">
            {efficiencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={efficiencyData}>
                  <defs>
                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" {...axisStyle} />
                  <YAxis unit="%" {...axisStyle} domain={[0, 150]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 3"
                    label={{ value: "100%", fill: "#f59e0b", fontSize: 11, position: "insideTopRight" }} />
                  <Area type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#effGrad)" name="Efficiency %" dot={{ r: 3, fill: "#8b5cf6" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </Card>

          {/* Cumulative: running sum of open_created and resolved from ticket_trends */}
          <Card title="Cumulative Ticket Flow" subtitle="Running total of opened vs resolved — last 14 days">
            {cumulativeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" {...axisStyle} />
                  <YAxis {...axisStyle} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                  <Area type="monotone" dataKey="Cumulative Opened"   stroke="#f43f5e" strokeWidth={2} fill="url(#openGrad)" />
                  <Area type="monotone" dataKey="Cumulative Resolved" stroke="#22c55e" strokeWidth={2} fill="url(#resGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </Card>
        </section>

        {/* 7 Ticket Trends */}
        <section className="bg-[#161b27] border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Ticket Trends</h2>
              <p className="text-xs text-slate-500 mt-1">Daily created and resolved counts</p>
            </div>
            <div className="flex gap-3">
              <select
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Tickets</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                value={daysFilter}
                onChange={e => setDaysFilter(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={3}>Last 3 Days</option>
              </select>
            </div>
          </div>

          {filteredTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filteredTrendData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" {...axisStyle} />
                <YAxis {...axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                {statusFilter === "all" ? (
                  <>
                    <Line type="monotone" dataKey="created"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="Created" />
                    <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} name="Resolved" />
                  </>
                ) : (
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} name={lineLabel} />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No trend data for the selected range" />}
        </section>

      </main>
    </div>
  )
}