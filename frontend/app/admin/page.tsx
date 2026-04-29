"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PDF } from "@/types/customTypes";
import { safeFetch } from "@/src/lib/safeFetch";
import { AdminPdfList } from "./AdminPdfList";
import { AdminPdfUpload } from "./AdminPdfUpload";

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [orgName, setOrgName] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

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
      const data = await res.json();
      if (data.role !== "admin") {
        router.replace("/support");
        return;
      }
      setOrgName(data.organization_name || "");
      setCheckingAuth(false);
    });

    return () => {
      controller.abort();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [router]);

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
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-lg text-sm shadow-lg transition-all ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}

      <header className="border-b border-slate-800 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Knowledge Base</h1>
              {orgName && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">{orgName}</span>}
            </div>
            <p className="text-slate-400 text-xs">Admin Context Management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => router.push("/admin/staff")} className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all">Staff</button>
            <button onClick={() => router.push("/admin/analytics")} className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all">Analytics</button>
            <button onClick={logout} disabled={isLoggingOut} className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-2 rounded transition-all disabled:opacity-50">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
        <AdminPdfUpload
          dragOver={dragOver}
          fileInputRef={fileInputRef}
          handleDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          handleFileInput={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadFile(file);
          }}
          setDragOver={setDragOver}
          uploading={uploading}
        />
        <AdminPdfList deletingId={deletingId} deletePdf={deletePdf} formatDate={formatDate} loadingPdfs={loadingPdfs} pdfs={pdfs} />
      </main>
    </div>
  );
}
