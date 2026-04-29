import { RefObject } from "react"
import { SupportComposer } from "./SupportComposer"
import { SupportMessages } from "./SupportMessages"
import { Message } from "./types"

type Props = {
  readonly bottomRef: RefObject<HTMLDivElement | null>
  readonly interimTranscript: string
  readonly isListening: boolean
  readonly isLoading: boolean
  readonly loadingHistory: boolean
  readonly messages: Message[]
  readonly onChangeTranscript: (value: string) => void
  readonly onSend: () => void
  readonly onStartMic: () => void
  readonly onStopMic: (event: React.MouseEvent) => void
  readonly sendBlocked: boolean
  readonly transcript: string
}

export function SupportChatSurface({
  bottomRef,
  interimTranscript,
  isListening,
  isLoading,
  loadingHistory,
  messages,
  onChangeTranscript,
  onSend,
  onStartMic,
  onStopMic,
  sendBlocked,
  transcript,
}: Props) {
  return (
    <>
      <SupportMessages
        bottomRef={bottomRef}
        interimTranscript={interimTranscript}
        isLoading={isLoading}
        loadingHistory={loadingHistory}
        messages={messages}
        transcript={transcript}
      />
      <SupportComposer
        isListening={isListening}
        isLoading={isLoading}
        onChangeTranscript={onChangeTranscript}
        onSend={onSend}
        onStartMic={onStartMic}
        onStopMic={onStopMic}
        sendBlocked={sendBlocked}
        transcript={transcript}
      />
    </>
  )
}
