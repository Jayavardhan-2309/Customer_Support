"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)

  const labels: Record<number, string> = {
    1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent",
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value)
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="bg-transparent border-none cursor-pointer p-0.5 transition-transform"
              style={{ transform: filled ? "scale(1.2)" : "scale(1)" }}
              aria-label={`${star} star`}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill={filled ? "#f59e0b" : "none"}
                stroke={filled ? "#f59e0b" : "#475569"}
                strokeWidth="1.5"
                style={{
                  filter: filled ? "drop-shadow(0 0 6px rgba(245,158,11,0.5))" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )
        })}
      </div>
      <span
        className="text-xs font-semibold uppercase tracking-widest transition-colors min-h-4.5"
        style={{ color: hovered || value ? "#f59e0b" : "#64748b" }}
      >
        {labels[hovered || value] ?? ""}
      </span>
    </div>
  )
}

export default function FeedbackPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/user/resolved-tickets/")
        setTickets(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openModal = (ticket: any) => {
    setSelectedTicket(ticket)
    setRating(5)
    setComment("")
    setSubmitted(false)
  }

  const submitFeedback = async () => {
    setSubmitting(true)
    try {
      await api.post(`/tickets/${selectedTicket.id}/feedback/`, { rating, comment })
      setSubmitted(true)
      setTimeout(() => {
        setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id))
        setSelectedTicket(null)
        setSubmitting(false)
      }, 1200)
    } catch {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 bg-slate-950">
        <div className="w-8 h-8 border-[3px] border-slate-700 border-t-white rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading your tickets…</p>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 gap-3 bg-slate-950">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-white">All caught up!</h2>
        <p className="text-slate-400 text-sm">
          No pending feedback. Need help?{" "}
          <span className="font-semibold text-slate-300">admin@gmail.com</span>
        </p>
        <button
          onClick={() => router.push("/support")}
          className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Feedback</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} awaiting your review
            </p>
          </div>
          <button
            onClick={() => router.push("/support")}
            className="bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold hover:border-slate-500 transition"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Ticket list */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl px-4 sm:px-6 py-5 shadow-sm"
          >
            <div className="mb-3">
              <span className="bg-green-900/40 text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                Resolved
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white mb-1">{ticket.query}</h3>

            <p className="text-xs sm:text-sm text-slate-400 mb-3">
              Handled by <strong className="text-slate-200">{ticket.staff_name}</strong>
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 sm:px-4 py-3 mb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resolution</p>
              <p className="text-sm text-slate-300 leading-relaxed">{ticket.resolution_note}</p>
            </div>

            {!ticket.has_feedback && (
              <button
                onClick={() => openModal(ticket)}
                className="bg-indigo-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
              >
                ★ Leave Feedback
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedTicket(null)}
        >
          <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl px-5 sm:px-7 pt-6 pb-8 sm:py-7 shadow-2xl">

            {/* Mobile drag handle */}
            <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />

            {submitted ? (
              <div className="text-center py-6 sm:py-8 space-y-2">
                <div className="text-5xl">✓</div>
                <p className="font-bold text-lg text-green-400 mt-2">Thank you!</p>
                <p className="text-slate-400 text-sm">Your feedback has been submitted.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Rate your experience</h2>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 text-xs transition"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-500 italic truncate mb-1">"{selectedTicket.query}"</p>

                <div className="h-px bg-slate-800 my-4" />

                <p className="text-sm font-bold text-slate-300 mb-1">How would you rate the support?</p>
                <StarRating value={rating} onChange={setRating} />

                <div className="h-px bg-slate-800 my-4" />

                <p className="text-sm font-bold text-slate-300 mb-1">
                  Additional comments{" "}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </p>

                <textarea
                  className="w-full mt-2 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white bg-slate-950 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  placeholder="Tell us what went well or what could be improved…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />

                <div className="flex justify-end gap-2.5 mt-5">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="bg-slate-800 text-slate-300 border-none rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    disabled={submitting}
                    className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer"
                  >
                    {submitting ? "Submitting…" : "Submit Feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}