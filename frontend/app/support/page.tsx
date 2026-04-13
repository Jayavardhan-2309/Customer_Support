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
        const final = finalRef.current.trim();
        setTranscript(final);
        onDone(final); // onDone now only sets the input, never sends
      } else { createAndStart(onDone); }
    };
    r.onerror = (e: any) => { if (e.error !== "no-speech") { setIsListening(false); stoppedRef.current = true; } };
    recognitionRef.current = r; r.start();
  };

  const start = (onDone: (text: string) => void, preservedText = "") => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    finalRef.current = preservedText ? preservedText + " " : "";
    stoppedRef.current = false; startTimeRef.current = Date.now();
    setTranscript(preservedText);
    setInterimTranscript("");
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
  const [orgName, setOrgName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition();
  const chat = useChatHistory();

  useEffect(() => {
  fetch("/api/me", { credentials: "include" })
    .then(async res => {
      if (!res.ok) {
        router.replace("/login");
        return;
      }

      const data = await res.json();

      setOrgName(data.organization_name || "");

      setCheckingAuth(false);
    });
}, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.messages, speech.transcript, speech.interimTranscript]);

  if (checkingAuth) return (
    <div className="h-screen flex items-center justify-center text-slate-400 text-sm bg-slate-950">
      Checking authentication...
    </div>
  );

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

  // Stop mic and just show the text in the input — do NOT send
  const handleStopMic = () => { speech.stop(); };

  return (
    <div className="bg-slate-950 text-white flex flex-col" style={{ height: "100dvh" }}>

      {/* Header */}
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

          <p className="text-slate-500 text-[10px] hidden landscape:block">
            Type or speak to get help.
          </p>

        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/support/feedback")}
            className="text-[11px] text-indigo-400 border border-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900/40"
          >
            Feedback
          </button>

          <button
            disabled={isLogout}
            onClick={logout}
            className="text-[11px] text-red-400 border border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-900/40"
          >
            {isLogout ? "..." : "Logout"}
          </button>
        </div>
      </header>

      {/* Messages */}
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
            <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs
              ${msg.role === "user"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 border border-slate-800 text-slate-200"
              }`}>
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
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 py-2.5">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">

          <input
            className="flex-1 min-w-0 border border-slate-700 bg-slate-900 text-white rounded-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={speech.transcript}
            placeholder="Type here..."
            onChange={e => speech.setTranscript(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !speech.isListening && sendMessage(speech.transcript)}
          />

          {!speech.isListening ? (
            <button
              disabled={isLoading}
              onClick={() => speech.start(text => speech.setTranscript(text), speech.transcript)}
              className="w-9 h-9 flex items-center justify-center border border-slate-700 rounded-full text-red-400 hover:bg-slate-800"
            >
              🎙
            </button>
          ) : (
            <button
              onClick={handleStopMic}
              className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white animate-pulse"
            >
              ⏹
            </button>
          )}

          <button
            disabled={speech.isListening || isLoading}
            onClick={() => sendMessage(speech.transcript)}
            className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-full font-semibold hover:bg-indigo-700"
          >
            Send
          </button>

        </div>
      </footer>
    </div>
  );
}