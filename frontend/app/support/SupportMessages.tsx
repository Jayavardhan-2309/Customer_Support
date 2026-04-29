import { RefObject } from "react";
import { Message } from "./types";

type Props = {
  bottomRef: RefObject<HTMLDivElement | null>;
  interimTranscript: string;
  isLoading: boolean;
  loadingHistory: boolean;
  messages: Message[];
  transcript: string;
};

export function SupportMessages({
  bottomRef,
  interimTranscript,
  isLoading,
  loadingHistory,
  messages,
  transcript,
}: Readonly<Props>) {
  const shouldShowEmptyState = !loadingHistory && messages.length === 0 && !transcript && !interimTranscript;

  return (
    <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-w-3xl w-full mx-auto">
      {loadingHistory && (
        <p className="text-center text-xs text-slate-500 animate-pulse mt-6">Loading history...</p>
      )}

      {shouldShowEmptyState && (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-8">
          <p className="text-2xl">...</p>
          <p className="text-xs text-slate-500">Type or record to get help.</p>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs ${
              msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-200"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {(transcript || interimTranscript) && (
        <div className="flex justify-end">
          <div className="max-w-[88%] px-3 py-2 rounded-2xl bg-indigo-500 text-white text-xs opacity-80">
            {transcript}
            {interimTranscript && <span className="opacity-60 italic"> {interimTranscript}</span>}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl text-xs text-slate-400 flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </main>
  );
}
