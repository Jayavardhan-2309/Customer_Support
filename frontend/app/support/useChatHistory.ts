"use client";

import { safeFetch } from "@/src/lib/safeFetch";
import { useAbortableApiData } from "@/src/lib/useAbortableApiData";
import { ChatHistoryMessage, Message } from "./types";
import { createMessage } from "./messageUtils";

export function useChatHistory() {
  const { data: loadedMessages, isLoading: loadingHistory, setData: setMessages } = useAbortableApiData<Message[]>({
    initialData: [],
    load: async (signal) => {
      const res = await safeFetch("/api/chat/history", { credentials: "include", signal });
      if (res.ok) {
        const data = (await res.json()) as ChatHistoryMessage[];
        return (data ?? []).map((message) => createMessage(message.sender, message.message));
      }
      return [];
    },
  });

  const messages = loadedMessages ?? [];
  const addMessage = (msg: Message) => setMessages((prev) => [...(prev ?? []), msg]);
  return { messages, loadingHistory, addMessage };
}
