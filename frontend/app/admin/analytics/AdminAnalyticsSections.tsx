import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AdminAnalytics, StaffPerformance } from "@/types/customTypes"
import { StatusDatum } from "./analyticsHelpers"

type Props = {
  readonly data: AdminAnalytics
  readonly feedbackRate: string | number
  readonly pendingFeedback: number
  readonly staffChartData: { name: string; rating: number }[]
  readonly statusData: StatusDatum[]
  readonly onStaffSelect: (staffId: number) => void
}

function MetricCard({ label, value, className = "" }: Readonly<{ label: string; value: number | string; className?: string }>) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
      <p className="text-xs sm:text-sm text-slate-400">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${className}`}>{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
      <h3 className="font-semibold mb-4 text-slate-300 text-sm sm:text-base">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>
    </div>
  )
}

function StaffPerformanceGrid({
  staffPerformance,
  onStaffSelect,
}: Readonly<{ staffPerformance: StaffPerformance[]; onStaffSelect: (staffId: number) => void }>) {
  return (
    <section>
      <h2 className="text-base sm:text-lg font-semibold mb-4">Staff Performance</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {staffPerformance.map((staff, index) => (
          <button
            key={staff.staff_id}
            type="button"
            onClick={() => onStaffSelect(staff.staff_id)}
            className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl text-left cursor-pointer sm:hover:border-indigo-500 sm:hover:scale-[1.02] transition"
          >
            <h3 className="font-semibold text-white text-sm sm:text-base">{staff.name}</h3>
            <p className="text-yellow-400 mt-2 text-base sm:text-lg">⭐ {staff.avg_rating}</p>
            <p className="text-xs sm:text-sm text-slate-400">{staff.total_feedbacks} reviews</p>
            <p className="text-xs text-slate-500 mt-2">Rank #{index + 1}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

export function AdminAnalyticsSections({
  data,
  feedbackRate,
  pendingFeedback,
  staffChartData,
  statusData,
  onStaffSelect,
}: Props) {
  const { ticket_stats, overall_metrics, staff_performance } = data

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Ticket Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard label="Open" value={ticket_stats.open} className="text-red-400" />
          <MetricCard label="In Progress" value={ticket_stats.in_progress} className="text-yellow-400" />
          <MetricCard label="Resolved" value={ticket_stats.resolved} className="text-blue-400" />
          <MetricCard label="Closed" value={ticket_stats.closed} className="text-green-400" />
        </div>
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <MetricCard label="Pending Feedback" value={pendingFeedback} className="text-orange-400" />
        <MetricCard label="Feedback Rate" value={`${feedbackRate}%`} className="text-indigo-400" />
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Total Tickets" value={overall_metrics.total_tickets} />
        <MetricCard label="Resolved Today" value={overall_metrics.resolved_today} className="text-blue-400" />
        <MetricCard label="Resolved This Week" value={overall_metrics.resolved_this_week} className="text-purple-400" />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Ticket Distribution">
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} />
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>
        <ChartCard title="Staff Ratings">
          <BarChart data={staffChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="rating" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </section>
      <StaffPerformanceGrid staffPerformance={staff_performance} onStaffSelect={onStaffSelect} />
    </main>
  )
}
