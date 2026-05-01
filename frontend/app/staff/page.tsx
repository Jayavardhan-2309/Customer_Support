"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { logger } from "@/logger"
import { fetchers } from "@/src/lib/axios"
import { TicketCard } from "./TicketCard"
import { StaffDashboardHeader } from "./StaffDashboardHeader"
import { StaffTicketFilters } from "./StaffTicketFilters"
import {
  IncomingTicket,
  Me,
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
      <StaffDashboardHeader
        isLoggingOut={logoutMutation.isPending}
        onAnalytics={() => router.push("/staff/analytics")}
        onLogout={() => logoutMutation.mutate()}
        orgName={orgName}
        staffName={staffName}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <StaffTicketFilters
          filterCategory={filterCategory}
          filterStatus={filterStatus}
          filtersOpen={filtersOpen}
          onCategoryChange={setFilterCategory}
          onStatusChange={setFilterStatus}
          onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          onSortChange={setSortPriority}
          sortPriority={sortPriority}
          ticketCount={sortedTickets.length}
        />

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
