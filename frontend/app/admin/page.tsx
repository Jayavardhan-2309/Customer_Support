"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PDF } from "@/types/customTypes";
import { safeFetch } from "@/src/lib/safeFetch";
import { AdminHeader } from "./AdminHeader";
import { AdminPdfManager } from "./AdminPdfManager";
import { AdminToast } from "./AdminToast";
import { useAdminAuth } from "./useAdminAuth";

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  const fetchPdfs = useCallback(async (signal?: AbortSignal) => {
    setLoadingPdfs(true);
    try {
      const res = await safeFetch("/api/admin/pdfs", { credentials: "include", signal });
      if (signal?.aborted) {
        return;
      }
      if (res.ok) {
        setPdfs(await res.json());
      }
    } catch {
      if (signal?.aborted) {
        return;
      }
      showToast("Failed to load PDFs", "error");
    } finally {
      if (!signal?.aborted) {
        setLoadingPdfs(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (checkingAuth) {
      return undefined;
    }
    const controller = new AbortController();
    void fetchPdfs(controller.signal);
    return () => controller.abort();
  }, [checkingAuth, fetchPdfs]);

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      showToast("Only PDF files are allowed", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Max size is 10MB", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await safeFetch("/api/admin/pdfs/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        showToast("PDF uploaded! Re-indexing knowledge base...", "success");
        await fetchPdfs();
      } else {
        showToast(data.detail ?? "Upload failed", "error");
      }
    } catch {
      showToast("Upload failed. Try again.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deletePdf = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This will remove it from the knowledge base.`)) return;
    setDeletingId(id);
    try {
      const res = await safeFetch(`/api/admin/pdfs/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        showToast("PDF deleted. Re-indexing knowledge base...", "success");
        setPdfs((prev) => prev.filter((pdf) => pdf.id !== id));
      } else {
        const data = await res.json();
        showToast(data.detail ?? "Delete failed", "error");
      }
    } catch {
      showToast("Delete failed. Try again.", "error");
    } finally {
      setDeletingId(null);
    }
  };

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
