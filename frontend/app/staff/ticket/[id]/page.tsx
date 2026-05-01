"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { logger } from "@/logger"
import { fetchers } from "@/src/lib/axios"
import { TicketConversation } from "./TicketConversation"
import { TicketDetailHeader } from "./TicketDetailHeader"
import { TicketInfoCard } from "./TicketInfoCard"
import { TicketResolutionCard } from "./TicketResolutionCard"
import { Message, Ticket } from "./types"

export default function TicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState("")

  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchers.get<Ticket>(`staff/tickets/${id}/`),
    enabled: !!id,
  })

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", id],
    queryFn: () => fetchers.get<Message[]>(`staff/tickets/${id}/messages/`),
    enabled: !!id,
  })

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const markInProgressMutation = useMutation({
    mutationFn: () => fetchers.patch(`staff/tickets/${id}/start/`),
    onSuccess: () => {
      queryClient.setQueryData<Ticket>(["ticket", id], (old) =>
        old ? { ...old, status: "in_progress" } : old
      )
    },
    onError: (err) => {
      logger.error("Failed to update ticket", err)
      alert("Failed to mark as in progress")
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => fetchers.patch(`staff/tickets/${id}/resolve/`, { resolution_note: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tickets"] })
      router.push("/staff")
    },
    onError: (err) => logger.error("Failed to resolve ticket", err),
  })

  const logoutMutation = useMutation({
    mutationFn: () => fetchers.post("logout/"),
    onSuccess: () => router.push("/login"),
    onError: (err) => logger.error("Logout failed", err),
  })

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm animate-pulse">Loading ticket...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TicketDetailHeader
        isLoggingOut={logoutMutation.isPending}
        onBack={() => router.push("/staff")}
        onLogout={() => logoutMutation.mutate()}
        ticket={ticket}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        <TicketInfoCard ticket={ticket} />
        <TicketConversation chatBottomRef={chatBottomRef} messages={messages} ticket={ticket} />
        <TicketResolutionCard
          isMarkingInProgress={markInProgressMutation.isPending}
          isResolving={resolveMutation.isPending}
          note={note}
          onMarkInProgress={() => markInProgressMutation.mutate()}
          onNoteChange={setNote}
          onResolve={() => resolveMutation.mutate()}
          ticket={ticket}
        />
      </div>
    </div>
  )
}
