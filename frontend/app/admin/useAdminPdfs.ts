"use client";

import { RefObject, useCallback, useState } from "react";
import { PDF } from "@/types/customTypes";
import { safeFetch } from "@/src/lib/safeFetch";

type ShowToast = (message: string, type: "success" | "error") => void;

export function useAdminPdfs(fileInputRef: RefObject<HTMLInputElement | null>, showToast: ShowToast) {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  return { deletingId, deletePdf, fetchPdfs, loadingPdfs, pdfs, uploadFile, uploading };
}
