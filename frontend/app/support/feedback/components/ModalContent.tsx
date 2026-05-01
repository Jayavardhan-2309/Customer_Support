import StarRating from "./StarRating"

type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
}

type ModalContentProps = {
  readonly submitted: boolean
  readonly selectedTicket: ResolvedTicket | null
  readonly rating: number
  readonly onRatingChange: (rating: number) => void
  readonly comment: string
  readonly onCommentChange: (comment: string) => void
  readonly onClose: () => void
  readonly onSubmit: () => void
  readonly submitting: boolean
}

const ModalContent = ({
  submitted,
  selectedTicket,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  onClose,
  onSubmit,
  submitting
}: ModalContentProps) => {
  if (submitted) {
    return (
      <div className="text-center py-6 sm:py-8 space-y-2">
        <div aria-hidden="true" className="text-4xl font-black text-green-400">Done</div>
        <p className="font-bold text-lg text-green-400 mt-2">Thank you!</p>
        <p className="text-slate-400 text-sm">Your feedback has been submitted.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-base sm:text-lg font-extrabold text-white tracking-tight"
          id="feedback-dialog-title"
        >
          Rate your experience
        </h2>
        <button
          aria-label="Close feedback dialog"
          className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 text-xs transition"
          onClick={onClose}
          type="button"
        >
          &times;
        </button>
      </div>

      <p className="text-xs text-slate-500 italic truncate mb-1">&quot;{selectedTicket?.query}&quot;</p>

      <div className="h-px bg-slate-800 my-4" />

      <p className="text-sm font-bold text-slate-300 mb-1">How would you rate the support?</p>
      <StarRating value={rating} onChange={onRatingChange} />

      <div className="h-px bg-slate-800 my-4" />

      <p className="text-sm font-bold text-slate-300 mb-1">
        Additional comments{" "}
        <span className="text-slate-500 font-normal">(optional)</span>
      </p>

      <textarea
        className="w-full mt-2 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white bg-slate-950 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Tell us what went well or what could be improved..."
        rows={3}
        value={comment}
      />

      <div className="flex justify-end gap-2.5 mt-5">
        <button
          className="bg-slate-800 text-slate-300 border-none rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 transition cursor-pointer"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer"
          disabled={submitting}
          onClick={onSubmit}
          type="button"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </>
  )
}

export default ModalContent
