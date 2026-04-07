"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/src/lib/axios"

export default function StaffPage() {
  const router = useRouter()

  const [tickets, setTickets] = useState<any[]>([])
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [sortPriority, setPriority] = useState<string>("default")
  const [staffName, setStaffName] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [orgName, setOrgName] = useState<string>("")

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get("staff/tickets/")
        setTickets(res.data.results)
      } catch (error) {
        console.error("Failed to load tickets", error)
      }
    }

    const fetchMe = async () => {
      try {
        const res = await api.get("me/")
        setStaffName(res.data.username)
        setOrgName(res.data.organization_name || "")
      } catch (error) {
        console.error("Failed to load user", error)
      }
    }

    fetchTickets()
    fetchMe()
  }, [])

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post("logout/")
      router.push("/login")
    } catch (error) {
      console.error("Logout failed", error)
      setIsLoggingOut(false)
    }
  }

  const openTicket = (id: number) => router.push(`/staff/ticket/${id}`)

  const priorityColor = (priority: string) => {
    if (priority === "high" || priority === "High") return "text-red-400"
    if (priority === "normal") return "text-orange-400"
    return "text-slate-400"
  }

  const priorityBadge = (priority: string) => {
    if (priority === "high" || priority === "High") return "bg-red-900/40 text-red-400 border-red-700"
    if (priority === "normal") return "bg-orange-900/40 text-orange-400 border-orange-700"
    return "bg-slate-800 text-slate-400 border-slate-700"
  }

  const priorityOrder: Record<string, Record<string, number>> = {
    high:   { high: 0, normal: 1, low: 2 },
    normal: { normal: 0, high: 1, low: 2 },
    low:    { low: 0, normal: 1, high: 2 },
  }

  const filteredTickets = tickets
    .filter((t) => filterCategory === "all" || t.category?.toLowerCase() === filterCategory)
    .filter((t) => filterStatus === "all" || t.status?.toLowerCase() === filterStatus)

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortPriority === "default") return 0
    const order = priorityOrder[sortPriority]
    const aVal = order[a.priority?.toLowerCase()] ?? 99
    const bVal = order[b.priority?.toLowerCase()] ?? 99
    return aVal - bVal
  })

  const selectClass =
    "w-full px-3 py-2 rounded-md border border-slate-700 text-sm cursor-pointer bg-slate-900 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex flex-col gap-1">

            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                Staff Dashboard
              </h1>

              {orgName && (
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                  {orgName}
                </span>
              )}
            </div>

            {staffName && (
              <p className="text-xs sm:text-sm text-slate-400">
                Welcome, <b className="text-white">{staffName}</b>
              </p>
            )}

          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/staff/analytics")}
              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-700 transition"
            >
              Analytics
            </button>
            <button
              onClick={logout}
              disabled={isLoggingOut}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 border border-red-800 rounded-md hover:bg-red-900/40 disabled:opacity-50 transition"
            >
              {isLoggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">

        {/* Filters */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Assigned Tickets
              <span className="ml-2 text-xs font-normal text-slate-500">({sortedTickets.length})</span>
            </h2>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="sm:hidden px-3 py-1.5 text-xs border border-slate-700 rounded-md bg-slate-900 text-slate-400"
            >
              {filtersOpen ? "Hide Filters" : "Filters ▾"}
            </button>
          </div>

          <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap bg-slate-900 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-800`}>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-slate-400 whitespace-nowrap">Category:</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
                <option value="all">All</option>
                <option value="authentication">Authentication</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="hidden sm:block w-px h-5 bg-slate-700" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-slate-400 whitespace-nowrap">Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            <div className="hidden sm:block w-px h-5 bg-slate-700" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-slate-400 whitespace-nowrap">Sort by Priority:</label>
              <select value={sortPriority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                <option value="default">Default</option>
                <option value="high">High first</option>
                <option value="normal">Normal first</option>
                <option value="low">Low first</option>
              </select>
            </div>

          </div>
        </div>

        {/* Empty states */}
        {tickets.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-900">
            No tickets assigned yet
          </div>
        )}
        {sortedTickets.length === 0 && tickets.length > 0 && (
          <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-900">
            No tickets match the selected filters
          </div>
        )}

        {/* Ticket List */}
        <div className="flex flex-col gap-3">
          {sortedTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 sm:px-5 py-4 hover:border-slate-600 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                <div className="space-y-1 text-sm text-slate-300 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-500 text-xs">#{ticket.id}</span>

                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400">
                      {ticket.status}
                    </span>

                    {ticket.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-indigo-800 bg-indigo-900/30 text-indigo-400">
                        {ticket.category}
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-white">{ticket.customer}</p>

                  <p className="text-slate-400 text-sm line-clamp-2">{ticket.message}</p>

                  {ticket.description && (
                    <p className="text-slate-500 text-xs line-clamp-1">{ticket.description}</p>
                  )}
                </div>

                <button
                  onClick={() => openTicket(ticket.id)}
                  className="self-start sm:self-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Open →
                </button>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}