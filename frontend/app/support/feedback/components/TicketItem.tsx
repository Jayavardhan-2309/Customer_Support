type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
}

const TicketItem = ({ ticket, onOpenModal }: { ticket: ResolvedTicket, onOpenModal: (ticket: ResolvedTicket) => void }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 sm:px-6 py-5 shadow-sm">
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
        onClick={() => onOpenModal(ticket)}
        className="bg-indigo-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
      >
        ★ Leave Feedback
      </button>
    )}
  </div>
)

export default TicketItem