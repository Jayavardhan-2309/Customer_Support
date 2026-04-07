"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/src/lib/axios"

export default function TicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [note, setNote] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [markingProgress, setMarkingProgress] = useState(false)
  const [resolving, setResolving] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`staff/tickets/${id}/`)
        setTicket(res.data)
      } catch (error) {
        console.error("Failed to load ticket", error)
      }
    }

    const fetchMessages = async () => {
      try {
        const res = await api.get(`staff/tickets/${id}/messages/`)
        setMessages(res.data)
      } catch (error) {
        console.error("Failed to load messages", error)
      }
    }

    if (id) { fetchTicket(); fetchMessages() }
  }, [id])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const markInProgress = async () => {
    setMarkingProgress(true)
    try {
      await api.patch(`staff/tickets/${id}/start/`)
      setTicket({ ...ticket, status: "in_progress" })
    } catch (error) {
      console.error("Failed to update ticket", error)
      alert("Failed to mark as in progress")
    } finally {
      setMarkingProgress(false)
    }
  }

  const resolveTicket = async () => {
    setResolving(true)
    try {
      await api.patch(`staff/tickets/${id}/resolve/`, { resolution_note: note })
      router.push("/staff")
    } catch (error) {
      console.error("Failed to resolve ticket", error)
      setResolving(false)
    }
  }

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

  const priorityBadge = (priority: string) => {
    if (priority === "high") return "bg-red-900/40 text-red-400 border-red-700"
    if (priority === "normal") return "bg-orange-900/40 text-orange-400 border-orange-700"
    return "bg-slate-800 text-slate-400 border-slate-700"
  }

  const statusBadge = (status: string) => {
    if (status === "open") return "bg-red-900/40 text-red-400"
    if (status === "in_progress") return "bg-amber-900/40 text-amber-400"
    if (status === "resolved") return "bg-green-900/40 text-green-400"
    return "bg-slate-800 text-slate-400"
  }

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-slate-400 text-sm animate-pulse">Loading ticket...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/staff")}
              className="p-2 rounded-md hover:bg-slate-800 transition text-slate-400 hover:text-white"
            >
              ←
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold">Ticket #{ticket.id}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(ticket.status)}`}>
                  {ticket.status?.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            disabled={isLoggingOut}
            className="px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-md hover:bg-red-900/40"
          >
            {isLoggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Ticket Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Ticket Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">

            <div>
              <p className="text-xs text-slate-500">Customer</p>
              <p className="font-medium">{ticket.customer}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium break-all">{ticket.customer_email}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-medium capitalize">{ticket.category}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Priority</p>
              <span className={`text-xs px-2 py-1 rounded-full border ${priorityBadge(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Message</p>
              <p className="text-slate-300">{ticket.message}</p>
            </div>

          </div>
        </div>

        {/* AI Summary */}
        {ticket.context && (
          <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-400 mb-2">🤖 AI Summary</p>
            <p className="text-sm text-amber-200">{ticket.context}</p>
          </div>
        )}

        {/* Conversation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Conversation</h2>

          <div className="bg-slate-950 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto flex flex-col gap-3 border border-slate-800">

            {messages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center m-auto">No messages</p>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.sender === "user"
                return (
                  <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm
                      ${isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                      }`}>
                      <span className="block text-xs mb-1 text-slate-400">
                        {isUser ? "User" : "AI"}
                      </span>
                      {msg.message}
                    </div>
                  </div>
                )
              })
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Resolution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase mb-3">Resolution Note</h2>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe how this ticket was resolved..."
            className="w-full h-28 sm:h-36 px-4 py-3 border border-slate-700 bg-slate-950 text-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-4">

            <button
              onClick={markInProgress}
              disabled={markingProgress || ticket.status === "in_progress"}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
            >
              {markingProgress ? "Updating..." : "Mark as In Progress"}
            </button>

            <button
              onClick={resolveTicket}
              disabled={resolving}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              {resolving ? "Resolving..." : "Mark as Resolved ✓"}
            </button>

          </div>
        </div>

      </div>
    </div>
  )
}