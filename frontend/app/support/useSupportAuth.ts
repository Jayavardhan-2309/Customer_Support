"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/src/lib/safeFetch";
import { MeResponse } from "./types";

export function useSupportAuth() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadAuth = async () => {
      const res = await safeFetch("/api/me", { credentials: "include", signal: controller.signal });
      if (controller.signal.aborted) {
        return
      }
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = (await res.json()) as MeResponse;
      setOrgName(data.organization_name || "");
      setCheckingAuth(false);
    };

    loadAuth();

    return () => {
      controller.abort();
    };
  }, [router]);

  return { checkingAuth, orgName };
}
