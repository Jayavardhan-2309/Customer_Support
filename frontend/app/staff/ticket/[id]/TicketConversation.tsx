import { RefObject } from "react"
import { Message, Ticket } from "./types"

type Props = {
  readonly chatBottomRef: RefObject<HTMLDivElement | null>
  readonly messages: Message[]
  readonly ticket: Ticket
}

export function TicketConversation({ chatBottomRef, messages, ticket }: Props) {
  return (
    <>
      {ticket.context && (
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-400 mb-2">ðŸ¤– AI Summary</p>
          <p className="text-sm text-amber-200">{ticket.context}</p>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Conversation</h2>
        <div className="bg-slate-950 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto flex flex-col gap-3 border border-slate-800">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center m-auto">No messages</p>
          ) : (
            messages.map((msg, index) => <ConversationBubble key={`${msg.sender}-${msg.message}-${index}`} message={msg} />)
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>
    </>
  )
}

function ConversationBubble({ message }: Readonly<{ message: Message }>) {
  const isUser = message.sender === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm ${isUser ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-700"}`}>
        <span className="block text-xs mb-1 text-slate-400">{isUser ? "User" : "AI"}</span>
        {message.message}
      </div>
    </div>
  )
}
