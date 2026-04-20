"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "ai"; content: string };

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionInstanceLike = {
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

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

type ChatHistoryMessage = {
  sender: "user" | "ai";
  message: string;
};

type MeResponse = {
  organization_name?: string;
};

function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const finalRef = useRef("");
  const stoppedRef = useRef(false);
  const startTimeRef = useRef(0);
  const MAX_MS = 60000;

  const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructorLike | null => {
    if (typeof window === "undefined") return null;
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructorLike;
      webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    };
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  };

  const createAndStart = () => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalRef.current += `${event.results[i][0].transcript} `;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalRef.current);
      setInterimTranscript(interim);
    };
    recognition.onend = () => {
      setInterimTranscript("");
      if (stoppedRef.current || Date.now() - startTimeRef.current >= MAX_MS) {
        setIsListening(false);
        setTranscript(finalRef.current.trim());
      } else {
        createAndStart();
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setIsListening(false);
        stoppedRef.current = true;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const start = (preservedText = "") => {
    if (!getSpeechRecognitionConstructor()) return;
    finalRef.current = preservedText ? `${preservedText} ` : "";
    stoppedRef.current = false;
    startTimeRef.current = Date.now();
    setTranscript(preservedText);
    setInterimTranscript("");
    createAndStart();
    setTimeout(() => {
      if (!stoppedRef.current) {
        stoppedRef.current = true;
        recognitionRef.current?.stop();
      }
    }, MAX_MS);
  };

  const stop = () => {
    stoppedRef.current = true;
    recognitionRef.current?.stop();
  };

  return { transcript, interimTranscript, isListening, setTranscript, start, stop };
}

function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/history", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as ChatHistoryMessage[];
          setMessages((data ?? []).map((message) => ({ role: message.sender, content: message.message })));
        }
      } catch {
      } finally {
        setLoadingHistory(false);
      }
    };

    load();
  }, []);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
  return { messages, loadingHistory, addMessage };
}

export default function Support() {
  const hasSentSpeechRef = useRef(false);
  const isSendingRef = useRef(false);
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogout, setLoggingOut] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [sendBlocked, setSendBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition();
  const chat = useChatHistory();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(async (res) => {
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as MeResponse;
      setOrgName(data.organization_name || "");
      setCheckingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, speech.transcript, speech.interimTranscript]);

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400 text-sm bg-slate-950">
        Checking authentication...
      </div>
    );
  }

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || hasSentSpeechRef.current || isSendingRef.current) return;

    hasSentSpeechRef.current = true;
    isSendingRef.current = true;

    try {
      chat.addMessage({ role: "user", content: trimmed });
      speech.setTranscript("");
      setIsLoading(true);

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        credentials: "include",
      });

      const data = (await res.json()) as { reply?: string };
      chat.addMessage({ role: "ai", content: data.reply ?? "No response" });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isSendingRef.current = false;
      }, 300);
    }
  };

  const handleStopMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    speech.stop();
    setSendBlocked(true);
    setTimeout(() => setSendBlocked(false), 800);
  };

  return (
    <div className="bg-slate-950 text-white flex flex-col" style={{ height: "100dvh" }}>
      <header className="shrink-0 bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-sm font-bold">Support</h1>
            {orgName && (
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                {orgName}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-[10px] hidden landscape:block">Type or speak to get help.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/support/feedback")}
            className="text-[11px] text-indigo-400 border border-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900/40"
          >
            Feedback
          </button>

          <button
            type="button"
            disabled={isLogout}
            onClick={logout}
            className="text-[11px] text-red-400 border border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-900/40"
          >
            {isLogout ? "..." : "Logout"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-w-3xl w-full mx-auto">
        {chat.loadingHistory ? (
          <p className="text-center text-xs text-slate-500 animate-pulse mt-6">Loading history...</p>
        ) : chat.messages.length === 0 && !speech.transcript && !speech.interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-8">
            <p className="text-2xl">💬</p>
            <p className="text-xs text-slate-500">Type or record to get help.</p>
          </div>
        ) : null}

        {chat.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs ${
                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {(speech.transcript || speech.interimTranscript) && (
          <div className="flex justify-end">
            <div className="max-w-[88%] px-3 py-2 rounded-2xl bg-indigo-500 text-white text-xs opacity-80">
              {speech.transcript}
              {speech.interimTranscript && <span className="opacity-60 italic"> {speech.interimTranscript}</span>}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl text-xs text-slate-400 flex gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 py-2.5">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 min-w-0 border border-slate-700 bg-slate-900 text-white rounded-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={speech.transcript}
            placeholder="Type here..."
            onChange={(e) => {
              hasSentSpeechRef.current = false;
              speech.setTranscript(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (speech.isListening || sendBlocked || isSendingRef.current) return;
                sendMessage(speech.transcript);
              }
            }}
          />

          {!speech.isListening ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                hasSentSpeechRef.current = false;
                speech.start(speech.transcript);
              }}
              className="w-9 h-9 flex items-center justify-center border border-slate-700 rounded-full text-red-400 hover:bg-slate-800"
            >
              🎙
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopMic}
              className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white animate-pulse"
            >
              ⏹
            </button>
          )}

          <button
            type="button"
            disabled={speech.isListening || isLoading || sendBlocked}
            onClick={() => sendMessage(speech.transcript)}
            className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-full font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
