"use client";

import { logger } from "@/logger";
import api from "@/src/lib/axios";
import { useAbortableApiData } from "@/src/lib/useAbortableApiData";

export type ResolvedTicket = {
  id: number;
  query: string;
  staff_name: string;
  resolution_note: string;
  has_feedback: boolean;
};

export function useResolvedTickets() {
  return useAbortableApiData<ResolvedTicket[]>({
    initialData: [],
    load: async (signal) => {
      const res = await api.get<ResolvedTicket[]>("/user/resolved-tickets/", { signal });
      return res.data;
    },
    onError: (err) => logger.error("Failed to load resolved tickets", err),
  });
}
