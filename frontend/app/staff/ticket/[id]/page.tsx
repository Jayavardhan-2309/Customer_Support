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

    if (id) {
      fetchTicket()
      fetchMessages()
    }
  }, [id])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const markInProgress = async () => {
    try {
      await api.patch(`staff/tickets/${id}/start/`)
      setTicket({ ...ticket, status: "in_progress" })
      alert("Ticket marked as in progress")
    } catch (error) {
      console.error("Failed to update ticket", error)
      alert("Failed to mark as in progress")
    }
  }

  const resolveTicket = async () => {
    try {
      await api.patch(`staff/tickets/${id}/resolve/`, { resolution_note: note })
      alert("Ticket resolved")
      router.push("/staff")
    } catch (error) {
      console.error("Failed to resolve ticket", error)
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

  if (!ticket) return <p style={{ padding: "30px" }}>Loading...</p>

  const priorityColor = (priority: string) => {
    if (priority === "high") return "red"
    if (priority === "normal") return "orange"
    return "gray"
  }


  return (
    <div style={{ padding: "30px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Ticket #{ticket.id}</h1>
        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={() => router.push("/staff")}
            style={{ padding: "6px 12px", cursor: "pointer", background: "#222", color: "white", borderRadius: "6px" }}>
            Dashboard
          </button>
          <button onClick={logout} disabled={isLoggingOut}
            style={{ padding: "6px 12px", cursor: "pointer", background: "#222", color: "red", borderRadius: "6px" }}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>

      <hr style={{ margin: "20px 0" }} />

      {/* Ticket Info */}
      <p><b>Customer:</b> {ticket.customer}</p>
      <p><b>Email:</b> {ticket.customer_email}</p>
      <p><b>Category:</b> {ticket.category}</p>
      <p><b>Message:</b> {ticket.message}</p>
      <p>
        <b>Priority:</b>
        <span style={{ color: priorityColor(ticket.priority), fontWeight: "bold", marginLeft: "6px" }}>
          {ticket.priority}
        </span>
      </p>
      <p><b>Status:</b> {ticket.status}</p>

      {/* Context Summary */}
      {ticket.context && (
        <div style={{
          marginTop: "16px",
          background: "#fffbe6",
          border: "1px solid #ffe58f",
          borderRadius: "8px",
          padding: "12px 16px"
        }}>
          <b style={{ fontSize: "13px", color: "#888" }}>AI Summary</b>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#555" }}>{ticket.context}</p>
        </div>
      )}

      {/* Recent Conversation */}
      <h3 style={{ marginTop: "24px", marginBottom: "8px" }}>Recent Conversation</h3>

      <div style={{
        background: "#f0f0f0",
        borderRadius: "10px",
        padding: "16px",
        height: "280px",
        overflowY: "scroll",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        border: "1px solid #ddd"
      }}>
        {messages.length === 0 ? (
          <p style={{ color: "#999", fontSize: "13px", textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>
            No recent messages found.
          </p>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.sender === "user"
            return (
              <div key={index} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "70%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  background: isUser ? "#3b82f6" : "#ffffff",
                  color: isUser ? "white" : "#1a1a1a",
                  border: isUser ? "none" : "1px solid #ddd",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)"
                }}>
                  <span style={{
                    display: "block",
                    fontSize: "11px",
                    opacity: 0.65,
                    marginBottom: "4px",
                    fontWeight: 600
                  }}>
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

      {/* Resolution Note */}
      <h3 style={{ marginTop: "20px" }}>Resolution Note</h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", height: "120px", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
      />

      <br /><br />

      {/* Actions */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={markInProgress}
          style={{ padding: "6px 12px", marginRight: "10px", cursor: "pointer", background: "#ffaa00", borderRadius: "6px" }}>
          Mark as In Progress
        </button>
        <button onClick={resolveTicket}
          style={{ padding: "8px 16px", cursor: "pointer", background: "green", color: "white", borderRadius: "6px" }}>
          Mark as Resolved
        </button>
      </div>

    </div>
  )
}