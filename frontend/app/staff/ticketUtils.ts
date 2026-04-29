export type Ticket = {
  id: number;
  priority: string;
  status: string;
  category: string | null;
  customer: string;
  message: string;
  description?: string;
};

export type StaffTicketsResponse = {
  results: Ticket[];
};

export type Me = {
  username: string;
  organization_name?: string;
};

export type IncomingTicket = Partial<Ticket> & {
  id: number;
};

const PRIORITY_ORDER: Record<string, Record<string, number>> = {
  high: { high: 0, normal: 1, low: 2 },
  normal: { normal: 0, high: 1, low: 2 },
  low: { low: 0, normal: 1, high: 2 },
};

export const SELECT_CLASS =
  "w-full px-3 py-2 rounded-md border border-slate-700 text-sm cursor-pointer bg-slate-900 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function normalizeIncomingTicket(incoming: IncomingTicket): Ticket {
  return {
    id: incoming.id,
    priority: (incoming.priority ?? "normal").toLowerCase(),
    status: (incoming.status ?? "open").toLowerCase(),
    category: incoming.category ?? null,
    customer: incoming.customer ?? "Unknown",
    message: incoming.message ?? "",
    description: incoming.description ?? "",
  };
}

export function filterTickets(tickets: Ticket[], filterCategory: string, filterStatus: string) {
  return tickets
    .filter((ticket) => filterCategory === "all" || ticket.category?.toLowerCase() === filterCategory)
    .filter((ticket) => filterStatus === "all" || ticket.status.toLowerCase() === filterStatus);
}

export function sortTicketsByPriority(tickets: Ticket[], sortPriority: string) {
  return [...tickets].sort((a, b) => {
    if (sortPriority === "default") return 0;
    const order = PRIORITY_ORDER[sortPriority];
    return (order[a.priority.toLowerCase()] ?? 99) - (order[b.priority.toLowerCase()] ?? 99);
  });
}

export function getPriorityBadge(priority: string) {
  if (priority === "high" || priority === "High") return "bg-red-900/40 text-red-400 border-red-700";
  if (priority === "normal") return "bg-orange-900/40 text-orange-400 border-orange-700";
  return "bg-slate-800 text-slate-400 border-slate-700";
}
