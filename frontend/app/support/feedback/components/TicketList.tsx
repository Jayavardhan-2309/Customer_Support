import TicketItem from "./TicketItem"

type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
}

const TicketList = ({ tickets, onOpenModal }: { tickets: ResolvedTicket[], onOpenModal: (ticket: ResolvedTicket) => void }) => (
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
    {tickets.map((ticket) => (
      <TicketItem key={ticket.id} ticket={ticket} onOpenModal={onOpenModal} />
    ))}
  </div>
)

export default TicketList