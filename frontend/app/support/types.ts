export type Message = { id: string; role: "user" | "ai"; content: string };

export type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionErrorEventLike = {
  error: string;
};

export type SpeechRecognitionInstanceLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: null | (() => void);
  onresult: null | ((event: SpeechRecognitionEventLike) => void);
  onend: null | (() => void);
  onerror: null | ((event: SpeechRecognitionErrorEventLike) => void);
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

export type ChatHistoryMessage = {
  sender: "user" | "ai";
  message: string;
};

export type MeResponse = {
  organization_name?: string;
};
