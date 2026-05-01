import { RefObject, ReactElement } from "react"
import { Message, Ticket, PaginatedMessagesResponse } from "./types"

type Props = {
  readonly chatBottomRef: RefObject<HTMLDivElement | null>
  readonly messages: Message[]
  readonly ticket: Ticket
  readonly pagination?: PaginatedMessagesResponse
  readonly onPageChange?: (page: number) => void
  readonly isLoading?: boolean
}

/**
 * Renders the messages content based on loading state and message count.
 * Extracted as a separate function to avoid nested ternary operations.
 */
function renderMessagesContent(messages: Message[], isLoading: boolean): ReactElement {
  if (isLoading && messages.length === 0) {
    return <p className="text-slate-500 text-sm text-center m-auto">Loading messages...</p>
  }

  if (messages.length === 0) {
    return <p className="text-slate-500 text-sm text-center m-auto">No messages</p>
  }

  return (
    <>
      {messages.map((msg, index) => (
        <ConversationBubble key={`${msg.sender}-${msg.message}-${index}`} message={msg} />
      ))}
    </>
  )
}

export function TicketConversation({
  chatBottomRef,
  messages,
  ticket,
  pagination,
  onPageChange,
  isLoading
}: Props) {
  return (
    <>
      {ticket.context && (
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-400 mb-2">🤖 AI Summary</p>
          <p className="text-sm text-amber-200">{ticket.context}</p>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Conversation</h2>

        {/* Pagination Controls - Top */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs text-slate-500">
              Page {pagination.current_page} of {pagination.total_pages} ({pagination.count} messages)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange && pagination.previous_page && onPageChange(pagination.previous_page)}
                disabled={!pagination.has_previous || isLoading}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => onPageChange && pagination.next_page && onPageChange(pagination.next_page)}
                disabled={!pagination.has_next || isLoading}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-950 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto flex flex-col gap-3 border border-slate-800">
          {renderMessagesContent(messages, isLoading ?? false)}
          <div ref={chatBottomRef} />
        </div>

        {/* Pagination Controls - Bottom */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-xs text-slate-500">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange && pagination.previous_page && onPageChange(pagination.previous_page)}
                disabled={!pagination.has_previous || isLoading}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => onPageChange && pagination.next_page && onPageChange(pagination.next_page)}
                disabled={!pagination.has_next || isLoading}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
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