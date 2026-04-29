"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { logger } from "@/logger"
import { fetchers } from "@/src/lib/axios"
import { TicketCard } from "./TicketCard"
import {
  IncomingTicket,
  Me,
  SELECT_CLASS,
  StaffTicketsResponse,
  Ticket,
  filterTickets,
  normalizeIncomingTicket,
  sortTicketsByPriority,
} from "./ticketUtils"

export default function StaffPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sortPriority, setSortPriority] = useState("default")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: ticketsData } = useQuery({
    queryKey: ["staff-tickets"],
    queryFn: () => fetchers.get<StaffTicketsResponse>("staff/tickets/"),
  })
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchers.get<Me>("me/"),
  })

  const logoutMutation = useMutation({
    mutationFn: () => fetchers.post("logout/"),
    onSuccess: () => router.push("/login"),
    onError: (err) => logger.error("Logout failed", err),
  })

  const updateTicketCache = useCallback((normalized: Ticket) => {
    queryClient.setQueryData<StaffTicketsResponse>(["staff-tickets"], (oldData) => {
      if (!oldData) return { results: [normalized] }
      const exists = oldData.results.find((ticket) => ticket.id === normalized.id)
      if (exists) {
        return {
          ...oldData,
          results: oldData.results.map((ticket) => (
            ticket.id === normalized.id ? { ...ticket, ...normalized } : ticket
          )),
        }
      }
      return { ...oldData, results: [normalized, ...oldData.results] }
    })
  }, [queryClient])

  useEffect(() => {
    const socket = new WebSocket("wss://customer-support-2.onrender.com/ws/tickets/")
    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data) as IncomingTicket
      updateTicketCache(normalizeIncomingTicket(incoming))
    }
    socket.onerror = (err) => logger.error("WebSocket error", err)
    socket.onclose = () => logger.info("WebSocket disconnected")
    return () => socket.close()
  }, [queryClient, updateTicketCache])

  const tickets = ticketsData?.results ?? []
  const staffName = me?.username ?? ""
  const orgName = me?.organization_name ?? ""
  const filteredTickets = filterTickets(tickets, filterCategory, filterStatus)
  const sortedTickets = sortTicketsByPriority(filteredTickets, sortPriority)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-white">Staff Dashboard</h1>
              {orgName && (
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                  {orgName}
                </span>
              )}
            </div>
            {staffName && <p className="text-xs sm:text-sm text-slate-400">Welcome, <b className="text-white">{staffName}</b></p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/staff/analytics")}
              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-700 transition"
            >
              Analytics
            </button>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 border border-red-800 rounded-md hover:bg-red-900/40 disabled:opacity-50 transition"
            >
              {logoutMutation.isPending ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Assigned Tickets <span className="ml-2 text-xs font-normal text-slate-500">({sortedTickets.length})</span>
            </h2>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="sm:hidden px-3 py-1.5 text-xs border border-slate-700 rounded-md bg-slate-900 text-slate-400"
            >
              {filtersOpen ? "Hide Filters" : "Filters"}
            </button>
          </div>

          <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap bg-slate-900 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-800`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label htmlFor="ticket-category" className="text-xs text-slate-400 whitespace-nowrap">Category:</label>
              <select id="ticket-category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="authentication">Authentication</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="hidden sm:block w-px h-5 bg-slate-700" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label htmlFor="ticket-status" className="text-xs text-slate-400 whitespace-nowrap">Status:</label>
              <select id="ticket-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
            <div className="hidden sm:block w-px h-5 bg-slate-700" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <label htmlFor="ticket-priority" className="text-xs text-slate-400 whitespace-nowrap">Sort by Priority:</label>
              <select id="ticket-priority" value={sortPriority} onChange={(e) => setSortPriority(e.target.value)} className={SELECT_CLASS}>
                <option value="default">Default</option>
                <option value="high">High first</option>
                <option value="normal">Normal first</option>
                <option value="low">Low first</option>
              </select>
            </div>
          </div>
        </div>

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

        <div className="flex flex-col gap-3">
          {sortedTickets.map((ticket) => (
            <TicketCard key={ticket.id} onOpen={(ticketId) => router.push(`/staff/ticket/${ticketId}`)} ticket={ticket} />
          ))}
        </div>
      </div>
    </div>
  )
}
