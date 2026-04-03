"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "ai"; content: string; }

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
    r.lang = "en-US"; r.continuous = true; r.interimResults = true;
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal ? (finalRef.current += e.results[i][0].transcript + " ") : (interim += e.results[i][0].transcript);
      }
      setTranscript(finalRef.current); setInterimTranscript(interim);
    };
    r.onend = () => {
      setInterimTranscript("");
      if (stoppedRef.current || Date.now() - startTimeRef.current >= MAX_MS) {
        setIsListening(false);
        const final = finalRef.current.trim(); setTranscript(final); onDone(final);
      } else { createAndStart(onDone); }
    };
    r.onerror = (e: any) => { if (e.error !== "no-speech") { setIsListening(false); stoppedRef.current = true; } };
    recognitionRef.current = r; r.start();
  };

  const start = (onDone: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    finalRef.current = ""; stoppedRef.current = false; startTimeRef.current = Date.now();
    setTranscript(""); setInterimTranscript("");
    createAndStart(onDone);
    setTimeout(() => { if (!stoppedRef.current) { stoppedRef.current = true; recognitionRef.current?.stop(); } }, MAX_MS);
  };

  const stop = () => { stoppedRef.current = true; recognitionRef.current?.stop(); };
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
          const data = await res.json();
          setMessages((data ?? []).map((m: any) => ({ role: m.sender as "user" | "ai", content: m.message })));
        }
      } catch { }
      finally { setLoadingHistory(false); }
    };
    load();
  }, []);

  const addMessage = (msg: Message) => setMessages(prev => [...prev, msg]);
  return { messages, loadingHistory, addMessage };
}

export default function Support() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogout, setLoggingOut] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition();
  const chat = useChatHistory();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(res => {
      if (!res.ok) router.replace("/login"); else setCheckingAuth(false);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.messages, speech.transcript, speech.interimTranscript]);

  if (checkingAuth) return <div className="h-screen flex items-center justify-center text-gray-500 text-sm">Checking authentication...</div>;

  const logout = async () => { setLoggingOut(true); await fetch("/api/logout", { method: "POST" }); router.push("/login"); };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim(); if (!trimmed) return;
    chat.addMessage({ role: "user", content: trimmed });
    speech.setTranscript(""); setIsLoading(true);
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed }), credentials: "include" });
    const data = await res.json();
    setIsLoading(false);
    chat.addMessage({ role: "ai", content: data.reply ?? "No response" });
  };

  const handleStopAndSend = () => { speech.stop(); setTimeout(() => sendMessage(speech.transcript), 300); };

  return (
    /*
      Use 100dvh (dynamic viewport height) so the layout fits exactly on iPhone SE and Nest Hub
      without overflowing or leaving a gap. flex-col fills the viewport: header + scrollable main + footer.
    */
    <div className="text-black bg-gray-50 flex flex-col" style={{ height: "100dvh" }}>

      {/* Header — minimal height so Nest Hub (600px) still has usable chat area */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-sm z-10">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-gray-900 leading-none">Support</h1>
          <p className="text-gray-400 text-[10px] mt-0.5 hidden landscape:block">Type or speak to get help.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* "Feedback" text only visible if enough space — icon always shows */}
          <button onClick={() => router.push("/support/feedback")}
            className="text-[11px] text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition font-medium whitespace-nowrap">
            Feedback
          </button>
          <button disabled={isLogout} onClick={logout}
            className="text-[11px] text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition font-medium whitespace-nowrap">
            {isLogout ? "..." : "Logout"}
          </button>
        </div>
      </header>

      {/* Messages — flex-1 + overflow-y-auto fills remaining space between header and footer */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-w-3xl w-full mx-auto">
        {chat.loadingHistory ? (
          <p className="text-center text-xs text-gray-400 animate-pulse mt-6">Loading history...</p>
        ) : chat.messages.length === 0 && !speech.transcript && !speech.interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-8">
            <p className="text-2xl">💬</p>
            <p className="text-xs text-gray-400">Type or record to get help.</p>
          </div>
        ) : null}

        {chat.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed
              ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {(speech.transcript || speech.interimTranscript) && (
          <div className="flex justify-end">
            <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-br-sm bg-blue-500 text-white text-xs opacity-80">
              {speech.transcript}
              {speech.interimTranscript && <span className="opacity-60 italic"> {speech.interimTranscript}</span>}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-sm text-xs text-gray-400 flex items-center gap-1.5">
              <span className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              Processing
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 
        Footer input bar — critical for iPhone SE (375px wide).
        Use fixed min-w-0 on input and fixed small px on buttons.
        No text labels on buttons — icons only — to prevent overflow.
        min-h-0 on the footer keeps it from pushing into safe area.
      */}
      <footer className="shrink-0 bg-white border-t border-gray-200 px-3 py-2.5 shadow-md">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 min-w-0 border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={speech.transcript}
            placeholder="Type here..."
            onChange={e => speech.setTranscript(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !speech.isListening && sendMessage(speech.transcript)}
          />

          {!speech.isListening ? (
            <button disabled={isLoading} onClick={() => speech.start(final => sendMessage(final))}
              className="shrink-0 w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded-full text-red-500 disabled:opacity-50 hover:bg-gray-50 transition text-base">
              🎙
            </button>
          ) : (
            <button onClick={handleStopAndSend}
              className="shrink-0 w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white animate-pulse text-sm font-bold">
              ⏹
            </button>
          )}

          <button disabled={speech.isListening || isLoading} onClick={() => sendMessage(speech.transcript)}
            className="shrink-0 px-3 py-2 bg-blue-600 text-white text-xs rounded-full font-semibold disabled:opacity-50 hover:bg-blue-700 transition whitespace-nowrap">
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}