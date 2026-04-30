"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/src/lib/safeFetch";
import { AdminHeader } from "./AdminHeader";
import { AdminPdfManager } from "./AdminPdfManager";
import { AdminToast } from "./AdminToast";
import { useAdminAuth } from "./useAdminAuth";
import { useAdminPdfs } from "./useAdminPdfs";

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { checkingAuth, orgName } = useAdminAuth();

  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    [],
  );

  const { deletingId, deletePdf, fetchPdfs, loadingPdfs, pdfs, uploadFile, uploading } = useAdminPdfs(fileInputRef, showToast);

  useEffect(() => {
    if (checkingAuth) {
      return undefined;
    }
    const controller = new AbortController();
    void fetchPdfs(controller.signal);
    return () => controller.abort();
  }, [checkingAuth, fetchPdfs]);

  const logout = async () => {
    setIsLoggingOut(true);
    await safeFetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (checkingAuth) {
    return <div className="h-screen flex items-center justify-center text-white animate-pulse">Checking authentication...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono">
      <AdminToast toast={toast} />
      <AdminHeader
        isLoggingOut={isLoggingOut}
        orgName={orgName}
        onAnalytics={() => router.push("/admin/analytics")}
        onLogout={logout}
        onStaff={() => router.push("/admin/staff")}
        subtitle="Admin Context Management"
        title="Knowledge Base"
      />

      <AdminPdfManager
        deletingId={deletingId}
        deletePdf={deletePdf}
        dragOver={dragOver}
        fileInputRef={fileInputRef}
        formatDate={formatDate}
        loadingPdfs={loadingPdfs}
        onFileSelected={uploadFile}
        pdfs={pdfs}
        setDragOver={setDragOver}
        uploading={uploading}
      />
    </div>
  );
}
