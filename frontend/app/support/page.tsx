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

  return { transcript, interimTranscript, isListening, setTranscript, start, stop }; // these are destructured while used, this is object destructuring
}

// Chat History Hook
function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([]); // array destructuring, since useState returns an array format
  const [loadingHistory, setLoadingHistory] = useState(true); // array destructuring, since useState returns an array format

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/history", { credentials: "include" }); // runs only once on render for the first time
        if (res.ok) {
          const data = await res.json();
          // Expects: [{ role: "user"|"ai", content: string }]
          const mapped = (data ?? []).map((msg: any) => ({
            role: msg.sender as "user" | "ai",
            content: msg.message,
            }));
            setMessages(mapped);
        }
      } catch {
        // silently fail — history is non-critical
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
  const [isLoading, setIsLoading] = useState(false); // for disabling submit button and other buttons, when clicked send message or submit button, this is activated
  const [isLogout, setLoggingOut]= useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition(); // function is called and the result is stored, here the result is an object literal
  const chat = useChatHistory(); // function is called and the result is stored

  // Auth check
  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then((res) => {
      if (!res.ok) router.replace("/login");
      else setCheckingAuth(false);
    });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); // scrollIntoView is a dom element function given for almost all dom elements
  }, [chat.messages, speech.transcript, speech.interimTranscript]);

  if (checkingAuth) { // default auth check screen for users to wait while authentication of the user is verified
    return <div className="h-screen flex items-center justify-center text-gray-500">Checking authentication...</div>;
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
    // onDone callback will not fire here since we're manually stopping;
    // use transcript that is already accumulated
    setTimeout(() => sendMessage(speech.transcript), 300);
  };

  return (
    <div className="text-black bg-gray-50 min-h-screen flex flex-col" style={{ padding: "0" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-gray-500 text-sm">Speak or type your issue and get help.</p>
        </div>
        <div className="flex items-center gap-2">

          <button
            onClick={() => router.push("/support/feedback")}
            className="text-sm text-blue-600 border px-4 py-2 rounded hover:bg-blue-50 cursor-pointer"
          >
            Feedback
          </button>

          <button
            disabled={isLogout}
            onClick={logout}
            className="text-sm text-red-500 border px-4 py-2 rounded hover:bg-red-50 cursor-pointer"
          >
            {isLogout ? "Logging out" : "Logout"}
          </button>

        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {chat.loadingHistory ? (
          <p className="text-center text-sm text-gray-400 animate-pulse">Loading conversation history...</p>
        ) : chat.messages.length === 0 && !speech.transcript && !speech.interimTranscript ? (
          <p className="text-center text-sm text-gray-400">Start typing or speak to get help.</p>
        ) : null}

        {/* Historical + new messages */}
        {chat.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live transcription preview */}
        {(speech.transcript || speech.interimTranscript) && (
          <div className="flex justify-end">
            <div className="max-w-[75%] px-4 py-2 rounded-2xl rounded-br-sm bg-blue-500 text-white text-sm opacity-80">
              {speech.transcript}
              {speech.interimTranscript && ( // this is for checking whether interimTranscript is set or not, this is boolean condition
                <span className="opacity-60 italic"> {speech.interimTranscript}</span>
              )}
            </div>
          </div>
        )}

        {/* AI proccessing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400 animate-pulse">
              Processing...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Footer Input */}
      <footer className="sticky bottom-0 bg-white border-t px-4 py-3 shadow-md">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={speech.transcript}
            placeholder="Type or record..."
            onChange={(e) => speech.setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !speech.isListening && sendMessage(speech.transcript)}
          />

          {!speech.isListening ? (
            <button
              disabled={isLoading}
              onClick={() => speech.start((final) => sendMessage(final))}
              className="text-red-400 bg-white border border-black rounded px-3 py-1.5 text-sm cursor-pointer disabled:opacity-50"
            >
              Record
            </button>
          ) : (
            <button
              onClick={handleStopAndSend}
              className="text-white bg-red-500 border border-red-500 rounded px-3 py-1.5 text-sm cursor-pointer animate-pulse"
            >
              Stop
            </button>
          )}

          <button
            disabled={speech.isListening || isLoading}
            onClick={() => sendMessage(speech.transcript)}
            className="text-green-600 bg-amber-50 border border-black rounded px-3 py-1.5 text-sm cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "Submitted..." : "Submit"}
          </button>
        </div>
      </footer>
    </div>
  );
}
