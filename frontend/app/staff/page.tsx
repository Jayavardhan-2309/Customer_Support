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
  const [filterStatus, setFilterStatus]= useState<string>("all")

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

  const openTicket = (id: number) => {
    router.push(`/staff/ticket/${id}`)
  }

  const priorityColor = (priority: string) => {
    if (priority === "high" || priority === "High") return "text-red-500"
    if (priority === "normal") return "text-orange-400"
    return "text-gray-400"
  }

  const priorityOrder: Record<string, Record<string, number>> = {
    high:   { high: 0, normal: 1, low: 2 },
    normal: { normal: 0, high: 1, low: 2 },
    low:    { low: 0, normal: 1, high: 2 },
  }

  const filteredTickets = tickets
  .filter((t)=> filterCategory==="all" || t.category?.toLowerCase()===filterCategory)
  .filter((t)=> filterStatus==="all"||t.status?.toLowerCase()===filterStatus)

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortPriority === "default") return 0
    const order = priorityOrder[sortPriority]
    const aVal = order[a.priority?.toLowerCase()] ?? 99
    const bVal = order[b.priority?.toLowerCase()] ?? 99
    return aVal - bVal
  })

  const selectClass = "px-3 py-1.5 rounded-md border border-gray-300 text-sm cursor-pointer text-red-500 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"

  return (
    <div className="p-8 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
          {staffName && (
            <p className="mt-1 text-sm text-white">
              Welcome, <b>{staffName}</b>
            </p>
          )}
        </div>

        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="px-3 py-1.5 text-sm text-red-500 border border-red-500 rounded-md cursor-pointer hover:bg-red-50 disabled:opacity-50"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      {/* Tickets Header + Controls */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Assigned Tickets</h2>

        {/* Filter + Sort grouped together */}
        <div className="flex items-center gap-3">

          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-500 whitespace-nowrap">Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={selectClass}
            >
              <option value="all">All</option>
              <option value="authentication">Authentication</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="w-px h-5 bg-gray-300" /> {/* divider */}

          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-500 whitespace-nowrap">Status:</label>
            <select
              value={filterStatus}
              onChange={(e)=> setFilterStatus(e.target.value)}
              className={selectClass}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
            </select>
          </div>

          <div className="w-px h-5 bg-gray-300"></div>

          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-500 whitespace-nowrap">Sort by Priority:</label>
            <select
              value={sortPriority}
              onChange={(e) => setPriority(e.target.value)}
              className={selectClass}
            >
              <option value="default">Default</option>
              <option value="high">High first</option>
              <option value="normal">Normal first</option>
              <option value="low">Low first</option>
            </select>
          </div>

        </div>
      </div>

      {tickets.length === 0 && (
        <p className="text-gray-400 text-sm">No tickets assigned</p>
      )}

      {sortedTickets.length === 0 && tickets.length > 0 && (
        <p className="text-gray-400 text-sm">No tickets match the selected filter</p>
      )}

      {/* Ticket List */}
      <div className="flex flex-col gap-3">
        {sortedTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-0.5 text-sm text-black">
              <p><b>Ticket ID:</b> #{ticket.id}</p>
              <p><b>Customer:</b> {ticket.customer}</p>
              <p><b>Message:</b> {ticket.message}</p>
              <p><b>Category:</b> {ticket.category}</p>
              <p>
                <b>Priority:</b>
                <span className={`font-bold ml-1.5 ${priorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </p>
              <p><b>Status:</b> {ticket.status}</p>
              <p className="text-gray-500 mt-1">{ticket.description}</p>
            </div>

            <button
              onClick={() => openTicket(ticket.id)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md cursor-pointer hover:bg-blue-700"
            >
              Open
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}