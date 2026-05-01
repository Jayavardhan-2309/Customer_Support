import { MouseEvent } from "react";

type Props = {
  isListening: boolean;
  isLoading: boolean;
  onChangeTranscript: (value: string) => void;
  onSend: () => void;
  onStartMic: () => void;
  onStopMic: (event: MouseEvent) => void;
  sendBlocked: boolean;
  transcript: string;
};

export function SupportComposer({
  isListening,
  isLoading,
  onChangeTranscript,
  onSend,
  onStartMic,
  onStopMic,
  sendBlocked,
  transcript,
}: Readonly<Props>) {
  const micButton = isListening ? (
    <button
      type="button"
      onClick={onStopMic}
      className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white animate-pulse"
    >
      Stop
    </button>
  ) : (
    <button
      type="button"
      disabled={isLoading}
      onClick={onStartMic}
      className="w-9 h-9 flex items-center justify-center border border-slate-700 rounded-full text-red-400 hover:bg-slate-800"
    >
      Mic
    </button>
  );

  return (
    <footer className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 py-2.5">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <input
          className="flex-1 min-w-0 border border-slate-700 bg-slate-900 text-white rounded-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          value={transcript}
          placeholder="Type here..."
          onChange={(event) => onChangeTranscript(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (isListening || sendBlocked) return;
              onSend();
            }
          }}
        />

        {micButton}

        <button
          type="button"
          disabled={isListening || isLoading || sendBlocked}
          onClick={onSend}
          className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-full font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </footer>
  );
}
