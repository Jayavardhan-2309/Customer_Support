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
    if (priority === "high") return "bg-red-100 text-red-700 border-red-200"
    if (priority === "normal") return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-gray-100 text-gray-600 border-gray-200"
  }

  const statusBadge = (status: string) => {
    if (status === "open") return "bg-red-50 text-red-600"
    if (status === "in_progress") return "bg-amber-50 text-amber-600"
    if (status === "resolved") return "bg-green-50 text-green-700"
    return "bg-gray-50 text-gray-600"
  }

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm animate-pulse">Loading ticket...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/staff")}
              className="p-2 rounded-md hover:bg-gray-100 transition text-gray-500 hover:text-gray-800"
              aria-label="Back"
            >
              ←
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900">Ticket #{ticket.id}</h1>
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
            className="px-3 py-1.5 text-xs text-red-500 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition"
          >
            {isLoggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Ticket Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Ticket Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-800">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Customer</p>
              <p className="font-medium">{ticket.customer}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Email</p>
              <p className="font-medium break-all">{ticket.customer_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Category</p>
              <p className="font-medium capitalize">{ticket.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Priority</p>
              <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${priorityBadge(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Message</p>
              <p className="text-gray-700 leading-relaxed">{ticket.message}</p>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {ticket.context && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">🤖 AI Summary</p>
            <p className="text-sm text-amber-900 leading-relaxed">{ticket.context}</p>
          </div>
        )}

        {/* Conversation */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Conversation</h2>
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto flex flex-col gap-3 border border-gray-100">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm text-center m-auto">No messages in this conversation.</p>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.sender === "user"
                return (
                  <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isUser
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      <span className={`block text-xs font-semibold mb-1 ${isUser ? "text-blue-100" : "text-gray-400"}`}>
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resolution Note</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe how this ticket was resolved..."
            className="w-full h-28 sm:h-36 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={markInProgress}
              disabled={markingProgress || ticket.status === "in_progress"}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              {markingProgress ? "Updating..." : "Mark as In Progress"}
            </button>
            <button
              onClick={resolveTicket}
              disabled={resolving}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              {resolving ? "Resolving..." : "Mark as Resolved ✓"}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}