import { Ticket } from "./types"

type Props = {
  readonly isMarkingInProgress: boolean
  readonly isResolving: boolean
  readonly note: string
  readonly onMarkInProgress: () => void
  readonly onNoteChange: (note: string) => void
  readonly onResolve: () => void
  readonly ticket: Ticket
}

export function TicketResolutionCard({
  isMarkingInProgress,
  isResolving,
  note,
  onMarkInProgress,
  onNoteChange,
  onResolve,
  ticket,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase mb-3">Resolution Note</h2>
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Describe how this ticket was resolved..."
        className="w-full h-28 sm:h-36 px-4 py-3 border border-slate-700 bg-slate-950 text-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={onMarkInProgress}
          disabled={isMarkingInProgress || ticket.status === "in_progress"}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg"
        >
          {isMarkingInProgress ? "Updating..." : "Mark as In Progress"}
        </button>
        <button
          onClick={onResolve}
          disabled={isResolving}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
        >
          {isResolving ? "Resolving..." : "Mark as Resolved âœ“"}
        </button>
      </div>
    </div>
  )
}
