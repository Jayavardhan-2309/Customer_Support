"use client"

import { useEffect } from "react"
import ModalContent from "./ModalContent"

type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
}

const FeedbackModal = ({
  selectedTicket,
  submitted,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  onClose,
  onSubmit,
  submitting
}: {
  readonly selectedTicket: ResolvedTicket | null
  readonly submitted: boolean
  readonly rating: number
  readonly onRatingChange: (rating: number) => void
  readonly comment: string
  readonly onCommentChange: (comment: string) => void
  readonly onClose: () => void
  readonly onSubmit: () => void
  readonly submitting: boolean
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="feedback-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 px-5 py-6 shadow-2xl shadow-black/40 sm:px-7 sm:py-7"
        role="dialog"
      >
      <ModalContent
        submitted={submitted}
        selectedTicket={selectedTicket}
        rating={rating}
        onRatingChange={onRatingChange}
        comment={comment}
        onCommentChange={onCommentChange}
        onClose={onClose}
        onSubmit={onSubmit}
        submitting={submitting}
      />
      </section>
    </div>
  )
}

export default FeedbackModal
