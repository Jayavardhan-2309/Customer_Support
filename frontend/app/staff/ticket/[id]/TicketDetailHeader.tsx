import { Ticket } from "./types"
import { statusBadge } from "./ticketDisplay"

type Props = {
  readonly isLoggingOut: boolean
  readonly onBack: () => void
  readonly onLogout: () => void
  readonly ticket: Ticket
}

export function TicketDetailHeader({ isLoggingOut, onBack, onLogout, ticket }: Props) {
  return (
    <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onBack} className="p-2 rounded-md hover:bg-slate-800 transition text-slate-400 hover:text-white">
            â†
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-bold">Ticket #{ticket.id}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(ticket.status)}`}>
                {ticket.status?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onLogout} disabled={isLoggingOut} className="px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-md hover:bg-red-900/40">
          {isLoggingOut ? "..." : "Logout"}
        </button>
      </div>
    </div>
  )
}
