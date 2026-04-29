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
    globalThis.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      globalThis.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <dialog
      aria-labelledby="feedback-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex h-full max-h-none w-full max-w-none items-center justify-center bg-transparent px-4 py-6"
      open
    >
      <button
        aria-label="Close feedback dialog"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section
        className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 px-5 py-6 shadow-2xl shadow-black/40 sm:px-7 sm:py-7"
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
    </dialog>
  )
}

export default FeedbackModal
