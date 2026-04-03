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
    if (priority === "high" || priority === "High") return "text-red-500"
    if (priority === "normal") return "text-orange-400"
    return "text-gray-400"
  }

  const priorityBadge = (priority: string) => {
    if (priority === "high" || priority === "High") return "bg-red-50 text-red-600 border-red-200"
    if (priority === "normal") return "bg-orange-50 text-orange-600 border-orange-200"
    return "bg-gray-50 text-gray-500 border-gray-200"
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

  const selectClass = "w-full px-3 py-2 rounded-md border border-gray-200 text-sm cursor-pointer bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Staff Dashboard</h1>
            {staffName && (
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                Welcome, <b className="text-gray-700">{staffName}</b>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/staff/analytics")}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 transition"
            >
              Analytics
            </button>
            <button
              onClick={logout}
              disabled={isLoggingOut}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-500 border border-red-300 rounded-md cursor-pointer hover:bg-red-50 disabled:opacity-50 transition"
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
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Assigned Tickets
              <span className="ml-2 text-xs font-normal text-gray-400">({sortedTickets.length})</span>
            </h2>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="sm:hidden px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-600"
            >
              {filtersOpen ? "Hide Filters" : "Filters ▾"}
            </button>
          </div>

          {/* Filter controls — always visible on sm+, collapsible on mobile */}
          <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-gray-200`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Category:</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
                <option value="all">All</option>
                <option value="authentication">Authentication</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="hidden sm:block w-px h-5 bg-gray-200" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            <div className="hidden sm:block w-px h-5 bg-gray-200" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Sort by Priority:</label>
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
          <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl bg-white">
            No tickets assigned yet
          </div>
        )}
        {sortedTickets.length === 0 && tickets.length > 0 && (
          <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl bg-white">
            No tickets match the selected filters
          </div>
        )}

        {/* Ticket List */}
        <div className="flex flex-col gap-3">
          {sortedTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1 text-sm text-gray-800 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-500 text-xs">#{ticket.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                      {ticket.status}
                    </span>
                    {ticket.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                        {ticket.category}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">{ticket.customer}</p>
                  <p className="text-gray-600 text-sm line-clamp-2">{ticket.message}</p>
                  {ticket.description && (
                    <p className="text-gray-400 text-xs line-clamp-1">{ticket.description}</p>
                  )}
                </div>
                <button
                  onClick={() => openTicket(ticket.id)}
                  className="self-start sm:self-center shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700 transition font-medium"
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