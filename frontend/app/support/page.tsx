"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "ai";
  content: string;
}

// Speech Hook
function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const stoppedRef = useRef(false);
  const startTimeRef = useRef(0);
  const MAX_MS = 60000;

  const createAndStart = (onDone: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal
          ? (finalRef.current += e.results[i][0].transcript + " ")
          : (interim += e.results[i][0].transcript);
      }
      setTranscript(finalRef.current);
      setInterimTranscript(interim);
    };
    r.onend = () => {
      setInterimTranscript("");
      if (stoppedRef.current || Date.now() - startTimeRef.current >= MAX_MS) {
        setIsListening(false);
        const final = finalRef.current.trim();
        setTranscript(final);
        onDone(final);
      } else {
        createAndStart(onDone);
      }
    };
    r.onerror = (e: any) => {
      if (e.error !== "no-speech") { setIsListening(false); stoppedRef.current = true; }
    };
    recognitionRef.current = r;
    r.start();
  };

  const start = (onDone: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    finalRef.current = ""; stoppedRef.current = false;
    startTimeRef.current = Date.now();
    setTranscript(""); setInterimTranscript("");
    createAndStart(onDone);
    setTimeout(() => { if (!stoppedRef.current) { stoppedRef.current = true; recognitionRef.current?.stop(); } }, MAX_MS);
  };

  const stop = () => { stoppedRef.current = true; recognitionRef.current?.stop(); };

  return { transcript, interimTranscript, isListening, setTranscript, start, stop };
}

// Chat History Hook
function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/history", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const mapped = (data ?? []).map((msg: any) => ({
            role: msg.sender as "user" | "ai",
            content: msg.message,
          }));
          setMessages(mapped);
        }
      } catch {
        // silently fail
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, []);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);

  return { messages, loadingHistory, addMessage };
}

// Page
export default function Support() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogout, setLoggingOut] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition();
  const chat = useChatHistory();

  // Auth check
  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then((res) => {
      if (!res.ok) router.replace("/login");
      else setCheckingAuth(false);
    });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, speech.transcript, speech.interimTranscript]);

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 text-sm animate-pulse">
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
    if (!trimmed) return;

    chat.addMessage({ role: "user", content: trimmed });
    speech.setTranscript("");
    setIsLoading(true);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
      credentials: "include",
    });
    const data = await res.json();
    setIsLoading(false);
    chat.addMessage({ role: "ai", content: data.reply ?? "No response" });
  };

  const handleStopAndSend = () => {
    speech.stop();
    setTimeout(() => sendMessage(speech.transcript), 300);
  };

  return (
    <div className="text-black bg-gray-50 min-h-screen flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Support</h1>
          <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Speak or type your issue and get help.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/support/feedback")}
            className="text-xs sm:text-sm text-blue-600 border border-blue-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-50 cursor-pointer transition font-medium"
          >
            Feedback
          </button>
          <button
            disabled={isLogout}
            onClick={logout}
            className="text-xs sm:text-sm text-red-500 border border-red-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50 transition font-medium"
          >
            {isLogout ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 max-w-3xl w-full mx-auto">
        {chat.loadingHistory ? (
          <p className="text-center text-sm text-gray-400 animate-pulse mt-8">Loading conversation history...</p>
        ) : chat.messages.length === 0 && !speech.transcript && !speech.interimTranscript ? (
          <div className="flex flex-col items-center justify-center mt-12 sm:mt-20 gap-3 text-center px-4">
            <div className="text-4xl">💬</div>
            <p className="text-sm text-gray-400">Start typing or speak to get help.</p>
          </div>
        ) : null}

        {/* Messages */}
        {chat.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live transcription preview */}
        {(speech.transcript || speech.interimTranscript) && (
          <div className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 rounded-2xl rounded-br-sm bg-blue-500 text-white text-sm opacity-80">
              {speech.transcript}
              {speech.interimTranscript && (
                <span className="opacity-60 italic"> {speech.interimTranscript}</span>
              )}
            </div>
          </div>
        )}

        {/* AI processing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm text-gray-400 shadow-sm flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              Processing
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Footer Input */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-3 shadow-md">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 min-w-0 border border-gray-300 rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={speech.transcript}
            placeholder="Type or record..."
            onChange={(e) => speech.setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !speech.isListening && sendMessage(speech.transcript)}
          />

          {!speech.isListening ? (
            <button
              disabled={isLoading}
              onClick={() => speech.start((final) => sendMessage(final))}
              className="shrink-0 text-red-500 bg-white border border-gray-300 rounded-lg px-2.5 sm:px-3 py-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 hover:bg-gray-50 transition font-medium flex items-center gap-1"
            >
              <span>🎙</span>
              <span className="hidden sm:inline">Record</span>
            </button>
          ) : (
            <button
              onClick={handleStopAndSend}
              className="shrink-0 text-white bg-red-500 border border-red-500 rounded-lg px-2.5 sm:px-3 py-2 text-xs sm:text-sm cursor-pointer animate-pulse font-medium flex items-center gap-1"
            >
              <span>⏹</span>
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          <button
            disabled={speech.isListening || isLoading}
            onClick={() => sendMessage(speech.transcript)}
            className="shrink-0 text-green-700 bg-green-50 border border-green-300 rounded-lg px-2.5 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 hover:bg-green-100 transition font-medium"
          >
            {isLoading ? <span className="hidden sm:inline">Sending...</span> : <span>Send</span>}
          </button>
        </div>
      </footer>
    </div>
  );
}