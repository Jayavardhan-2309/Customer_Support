import StarRating from "./StarRating"

type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
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
}: {
  submitted: boolean
  selectedTicket: ResolvedTicket | null
  rating: number
  onRatingChange: (rating: number) => void
  comment: string
  onCommentChange: (comment: string) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) => {
  if (submitted) {
    return (
      <div className="text-center py-6 sm:py-8 space-y-2">
        <div className="text-5xl">✓</div>
        <p className="font-bold text-lg text-green-400 mt-2">Thank you!</p>
        <p className="text-slate-400 text-sm">Your feedback has been submitted.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Rate your experience</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 text-xs transition"
        >
          ✕
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
        placeholder="Tell us what went well or what could be improved…"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        rows={3}
      />

      <div className="flex justify-end gap-2.5 mt-5">
        <button
          onClick={onClose}
          className="bg-slate-800 text-slate-300 border-none rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer"
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </div>
    </>
  )
}

export default ModalContent