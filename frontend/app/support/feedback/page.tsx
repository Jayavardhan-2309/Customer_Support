"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)

  const labels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Excellent",
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value)
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                transition: "transform 0.15s ease",
                transform: filled ? "scale(1.2)" : "scale(1)",
              }}
              aria-label={`${star} star`}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill={filled ? "#f59e0b" : "none"}
                stroke={filled ? "#f59e0b" : "#d1d5db"}
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
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: hovered || value ? "#f59e0b" : "#9ca3af",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          minHeight: "18px",
          transition: "color 0.15s ease",
        }}
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
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={{ color: "#6b7280", marginTop: 16, fontSize: 14 }}>Loading your tickets…</p>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>All caught up!</h2>
        <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
          No pending feedback. Need help?{" "}
          <span style={{ fontWeight: 600, color: "#374151" }}>admin@gmail.com</span>
        </p>
        <button onClick={() => router.push("/support")} style={styles.btnPrimary}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Feedback</h1>
          <p style={styles.subtitle}>{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} awaiting your review</p>
        </div>
        <button onClick={() => router.push("/support")} style={styles.btnOutline}>
          ← Dashboard
        </button>
      </div>

      {/* Ticket list */}
      <div style={styles.grid}>
        {tickets.map((ticket) => (
          <div key={ticket.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.badge}>Resolved</span>
            </div>
            <h3 style={styles.cardTitle}>{ticket.query}</h3>
            <p style={styles.cardMeta}>Handled by <strong>{ticket.staff_name}</strong></p>
            <div style={styles.resolutionBox}>
              <p style={styles.resolutionLabel}>Resolution</p>
              <p style={styles.resolutionText}>{ticket.resolution_note}</p>
            </div>
            {!ticket.has_feedback && (
              <button onClick={() => openModal(ticket)} style={styles.btnFeedback}>
                ★ Leave Feedback
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && setSelectedTicket(null)}>
          <div style={styles.modal}>
            {submitted ? (
              <div style={styles.successBox}>
                <div style={{ fontSize: 48 }}>✓</div>
                <p style={{ fontWeight: 700, fontSize: 18, color: "#065f46", marginTop: 8 }}>Thank you!</p>
                <p style={{ color: "#6b7280", fontSize: 14 }}>Your feedback has been submitted.</p>
              </div>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Rate your experience</h2>
                  <button onClick={() => setSelectedTicket(null)} style={styles.closeBtn}>✕</button>
                </div>

                <p style={styles.modalTicketLabel}>"{selectedTicket.query}"</p>

                <div style={styles.divider} />

                <p style={styles.sectionLabel}>How would you rate the support?</p>
                <StarRating value={rating} onChange={setRating} />

                <div style={styles.divider} />

                <p style={styles.sectionLabel}>Additional comments <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></p>
                <textarea
                  style={styles.textarea}
                  placeholder="Tell us what went well or what could be improved…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />

                <div style={styles.modalFooter}>
                  <button onClick={() => setSelectedTicket(null)} style={styles.btnCancel}>
                    Cancel
                  </button>
                  <button onClick={submitFeedback} disabled={submitting} style={styles.btnSubmit}>
                    {submitting ? "Submitting…" : "Submit Feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "32px 24px",
    maxWidth: 720,
    margin: "0 auto",
    fontFamily: "'Geist', 'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  cardTop: {
    marginBottom: 10,
  },
  badge: {
    background: "#d1fae5",
    color: "#065f46",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 99,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 6px",
  },
  cardMeta: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 14px",
  },
  resolutionBox: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 16,
  },
  resolutionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: "0 0 4px",
  },
  resolutionText: {
    fontSize: 14,
    color: "#374151",
    margin: 0,
    lineHeight: 1.5,
  },
  btnFeedback: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  btnPrimary: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 20,
  },
  btnOutline: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  centered: {
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 32,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #111827",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 18,
    padding: "28px 28px 24px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  closeBtn: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: 6,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
    color: "#6b7280",
  },
  modalTicketLabel: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 4px",
    fontStyle: "italic",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  divider: {
    height: 1,
    background: "#f3f4f6",
    margin: "16px 0",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 4,
  },
  textarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    color: "#111827",
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
    marginTop: 8,
    background: "#fafafa",
    boxSizing: "border-box",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  btnCancel: {
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSubmit: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    opacity: 1,
  },
  successBox: {
    textAlign: "center",
    padding: "24px 0 12px",
  },
}