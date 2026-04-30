"use client";

import { useRouter } from "next/navigation";
import { useAbortableApiData } from "@/src/lib/useAbortableApiData";
import { Me } from "@/types/customTypes";

export function useSupportAuth() {
  const router = useRouter();
  const { data: me, error, isLoading } = useAbortableApiData<Me>("me/", {
    onError: () => router.replace("/login"),
  });

  return { checkingAuth: isLoading || Boolean(error) || !me, orgName: me?.organization_name || "" };
}
