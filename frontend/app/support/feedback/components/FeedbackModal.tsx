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
  selectedTicket: ResolvedTicket | null
  submitted: boolean
  rating: number
  onRatingChange: (rating: number) => void
  comment: string
  onCommentChange: (comment: string) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) => (
  <button
    className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 border-none cursor-default"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        onClose()
      }
    }}
    style={{ all: 'unset', display: 'flex' }}
  >
    <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl px-5 sm:px-7 pt-6 pb-8 sm:py-7 shadow-2xl">
      <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
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
    </div>
  </button>
)

export default FeedbackModal