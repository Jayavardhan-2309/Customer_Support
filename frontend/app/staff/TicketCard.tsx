import { Ticket, getPriorityBadge } from "./ticketUtils";

type Props = {
  onOpen: (id: number) => void;
  ticket: Ticket;
};

export function TicketCard({ onOpen, ticket }: Readonly<Props>) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 sm:px-5 py-4 hover:border-slate-600 transition">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 text-sm text-slate-300 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 text-xs">#{ticket.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityBadge(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400">
              {ticket.status}
            </span>
            {ticket.category && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-indigo-800 bg-indigo-900/30 text-indigo-400">
                {ticket.category}
              </span>
            )}
          </div>
          <p className="font-medium text-white">{ticket.customer}</p>
          <p className="text-slate-400 text-sm line-clamp-2">{ticket.message}</p>
          {ticket.description && (
            <p className="text-slate-500 text-xs line-clamp-1">{ticket.description}</p>
          )}
        </div>
        <button
          onClick={() => onOpen(ticket.id)}
          className="self-start sm:self-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Open
        </button>
      </div>
    </div>
  );
}
