"use client"

import { useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"
import { logger } from "@/logger"
import LoadingView from "./components/LoadingView"
import EmptyView from "./components/EmptyView"
import Header from "./components/Header"
import TicketList from "./components/TicketList"
import FeedbackModal from "./components/FeedbackModal"
import { ResolvedTicket, useResolvedTickets } from "./useResolvedTickets"

export default function FeedbackPage() {
  const [selectedTicket, setSelectedTicket] = useState<ResolvedTicket | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const { data: loadedTickets, isLoading: loading, setData: setTickets } = useResolvedTickets()
  const tickets = loadedTickets ?? []

  const openModal = (ticket: ResolvedTicket) => {
    setSelectedTicket(ticket)
    setRating(5)
    setComment("")
    setSubmitted(false)
  }

  const sendFeedback = async (ticketId: number, rating: number, comment: string) => {
    return api.post(`/tickets/${ticketId}/feedback/`, { rating, comment })
  }

  const finalizeFeedback = (ticketId: number) => {
    setTickets((prev) => (prev ?? []).filter((t) => t.id !== ticketId))
    setSelectedTicket(null)
    setSubmitting(false)
  }

  const handleSuccess = (ticketId: number) => {
    setSubmitted(true)
    setTimeout(() => finalizeFeedback(ticketId), 1200)
  }

  const submitFeedback = async () => {
    if (!selectedTicket) return
  
    setSubmitting(true)
  
    try {
      await sendFeedback(selectedTicket.id, rating, comment)
      handleSuccess(selectedTicket.id)
    } catch (err) {
      logger.error("Failed to submit feedback", err)
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setSelectedTicket(null)
  }

  if (loading) {
    return <LoadingView />
  }

  if (tickets.length === 0) {
    return <EmptyView router={router} />
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header tickets={tickets} router={router} />
      <TicketList tickets={tickets} onOpenModal={openModal} />
      {selectedTicket && (
        <FeedbackModal
          selectedTicket={selectedTicket}
          submitted={submitted}
          rating={rating}
          onRatingChange={setRating}
          comment={comment}
          onCommentChange={setComment}
          onClose={closeModal}
          onSubmit={submitFeedback}
          submitting={submitting}
        />
      )}
    </div>
  )
}
