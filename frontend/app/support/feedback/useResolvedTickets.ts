"use client";

import { logger } from "@/logger";
import { useAbortableApiData } from "@/src/lib/useAbortableApiData";

export type ResolvedTicket = {
  id: number;
  query: string;
  staff_name: string;
  resolution_note: string;
  has_feedback: boolean;
};

export function useResolvedTickets() {
  return useAbortableApiData<ResolvedTicket[]>("/user/resolved-tickets/", {
    initialData: [],
    onError: (err) => logger.error("Failed to load resolved tickets", err),
  });
}
