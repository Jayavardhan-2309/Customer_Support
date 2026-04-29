"use client";

import { useEffect, useState } from "react";
import { safeFetch } from "@/src/lib/safeFetch";
import { ChatHistoryMessage, Message } from "./types";
import { createMessage } from "./messageUtils";

export function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await safeFetch("/api/chat/history", { credentials: "include", signal: controller.signal });
        if (controller.signal.aborted) {
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as ChatHistoryMessage[];
          setMessages((data ?? []).map((message) => createMessage(message.sender, message.message)));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingHistory(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
  return { messages, loadingHistory, addMessage };
}
