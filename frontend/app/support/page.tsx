"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/src/lib/safeFetch";
import { SupportComposer } from "./SupportComposer";
import { SupportMessages } from "./SupportMessages";
import { createMessage } from "./messageUtils";
import { MeResponse } from "./types";
import { useChatHistory } from "./useChatHistory";
import { useSpeechRecognition } from "./useSpeechRecognition";

export default function Support() {
  const hasSentSpeechRef = useRef(false);
  const isSendingRef = useRef(false);
  const sendResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRequestRef = useRef<AbortController | null>(null);
  const sendBlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [sendBlocked, setSendBlocked] = useState(false);
  const speech = useSpeechRecognition();
  const chat = useChatHistory();

  useEffect(() => {
    const controller = new AbortController();
    void safeFetch("/api/me", { credentials: "include", signal: controller.signal }).then(async (res) => {
      if (controller.signal.aborted) {
        return;
      }
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as MeResponse;
      setOrgName(data.organization_name || "");
      setCheckingAuth(false);
    });

    return () => {
      controller.abort();
    };
  }, [router]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      sendRequestRef.current?.abort();
      if (sendResetTimeoutRef.current) {
        clearTimeout(sendResetTimeoutRef.current);
      }
      if (sendBlockTimeoutRef.current) {
        clearTimeout(sendBlockTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, speech.transcript, speech.interimTranscript]);

  const logout = async () => {
    setIsLoggingOut(true);
    await safeFetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || hasSentSpeechRef.current || isSendingRef.current) return;

    hasSentSpeechRef.current = true;
    isSendingRef.current = true;
    try {
      chat.addMessage(createMessage("user", trimmed));
      speech.setTranscript("");
      setIsLoading(true);
      sendRequestRef.current?.abort();
      const controller = new AbortController();
      sendRequestRef.current = controller;
      const res = await safeFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        credentials: "include",
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }
      const data = (await res.json()) as { reply?: string };
      chat.addMessage(createMessage("ai", data.reply ?? "No response"));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      sendResetTimeoutRef.current = setTimeout(() => {
        isSendingRef.current = false;
      }, 300);
    }
  };

  const startMic = () => {
    hasSentSpeechRef.current = false;
    speech.start(speech.transcript);
  };

  const stopMic = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    speech.stop();
    setSendBlocked(true);
    if (sendBlockTimeoutRef.current) {
      clearTimeout(sendBlockTimeoutRef.current);
    }
    sendBlockTimeoutRef.current = setTimeout(() => setSendBlocked(false), 800);
  };

  const updateTranscript = (value: string) => {
    hasSentSpeechRef.current = false;
    speech.setTranscript(value);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400 text-sm bg-slate-950">
        Checking authentication...
      </div>
    );
  }

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
            disabled={isLoggingOut}
            onClick={logout}
            className="text-[11px] text-red-400 border border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-900/40"
          >
            {isLoggingOut ? "..." : "Logout"}
          </button>
        </div>
      </header>

      <SupportMessages
        bottomRef={bottomRef}
        interimTranscript={speech.interimTranscript}
        isLoading={isLoading}
        loadingHistory={chat.loadingHistory}
        messages={chat.messages}
        transcript={speech.transcript}
      />
      <SupportComposer
        isListening={speech.isListening}
        isLoading={isLoading}
        onChangeTranscript={updateTranscript}
        onSend={() => sendMessage(speech.transcript)}
        onStartMic={startMic}
        onStopMic={stopMic}
        sendBlocked={sendBlocked || isSendingRef.current}
        transcript={speech.transcript}
      />
    </div>
  );
}
