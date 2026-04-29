import { Ticket } from "./types"
import { priorityBadge } from "./ticketDisplay"

type Props = {
  readonly ticket: Ticket
}

export function TicketInfoCard({ ticket }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Ticket Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Customer</p>
          <p className="font-medium">{ticket.customer}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Email</p>
          <p className="font-medium break-all">{ticket.customer_email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Category</p>
          <p className="font-medium capitalize">{ticket.category}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Priority</p>
          <span className={`text-xs px-2 py-1 rounded-full border ${priorityBadge(ticket.priority)}`}>
            {ticket.priority}
          </span>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-500">Message</p>
          <p className="text-slate-300">{ticket.message}</p>
        </div>
      </div>
    </div>
  )
}
