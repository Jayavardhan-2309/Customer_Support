"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type PDF = {
    id: number;
    title: string;
    uploaded_at: string;
    uploaded_by: string;
    size_kb: number;
};

export default function AdminPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [checkingAuth, setCheckingAuth] = useState(true);
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [loadingPdfs, setLoadingPdfs] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetch("/api/me", { credentials: "include" }).then(async (res) => {
            if (!res.ok) { router.replace("/login"); return; }
            const data = await res.json();
            if (data.role !== "admin") { router.replace("/support"); return; }
            setCheckingAuth(false);
        });
    }, []);

    useEffect(() => {
        if (!checkingAuth) fetchPdfs();
    }, [checkingAuth]);

    const fetchPdfs = async () => {
        setLoadingPdfs(true);
        try {
            const res = await fetch("/api/admin/pdfs", { credentials: "include" });
            if (res.ok) setPdfs(await res.json());
        } catch {
            showToast("Failed to load PDFs", "error");
        } finally {
            setLoadingPdfs(false);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.name.endsWith(".pdf")) { showToast("Only PDF files are allowed", "error"); return; }
        if (file.size > 10 * 1024 * 1024) { showToast("File too large. Max size is 10MB", "error"); return; }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/pdfs/upload", { method: "POST", body: formData, credentials: "include" });
            const data = await res.json();
            if (res.ok) { showToast("PDF uploaded! Re-indexing knowledge base...", "success"); await fetchPdfs(); }
            else showToast(data.detail ?? "Upload failed", "error");
        } catch {
            showToast("Upload failed. Try again.", "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    };

    const deletePdf = async (id: number, title: string) => {
        if (!confirm(`Delete "${title}"? This will remove it from the knowledge base.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/pdfs/${id}`, { method: "DELETE", credentials: "include" });
            if (res.ok) { showToast("PDF deleted. Re-indexing knowledge base...", "success"); setPdfs((prev) => prev.filter((p) => p.id !== id)); }
            else { const data = await res.json(); showToast(data.detail ?? "Delete failed", "error"); }
        } catch {
            showToast("Delete failed. Try again.", "error");
        } finally {
            setDeletingId(null);
        }
    };

    const logout = async () => {
        setIsLoggingOut(true);
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    if (checkingAuth) {
        return (
            <div className="h-screen flex items-center justify-center text-white animate-pulse">
                Checking authentication...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-mono">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-lg text-sm shadow-lg transition-all
                    ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="border-b border-slate-800 px-4 sm:px-8 py-4 sm:py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Knowledge Base</h1>
                        <p className="text-slate-400 text-xs mt-0.5">Admin · Context Management</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => router.push("/admin/staff")}
                            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all"
                        >
                            Staff →
                        </button>
                        <button
                            onClick={() => router.push("/admin/analytics")}
                            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all"
                        >
                            Analytics →
                        </button>
                        <button
                            onClick={logout}
                            disabled={isLoggingOut}
                            className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-2 rounded transition-all disabled:opacity-50"
                        >
                            {isLoggingOut ? "Logging out..." : "Logout"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">

                {/* Upload Zone */}
                <section>
                    <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Upload PDF</h2>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all
                            ${dragOver ? "border-emerald-400 bg-emerald-950/30" : "border-slate-700 hover:border-slate-500 bg-slate-900/50"}
                            ${uploading ? "pointer-events-none opacity-60" : ""}`}
                    >
                        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
                        {uploading ? (
                            <div className="space-y-3">
                                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-slate-400 text-sm">Uploading and indexing...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-4xl">📄</div>
                                <p className="text-slate-300 text-sm">
                                    Drop a PDF here or <span className="text-emerald-400 underline">click to browse</span>
                                </p>
                                <p className="text-slate-600 text-xs">PDF only · Max 10MB</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* PDF List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs uppercase tracking-widest text-slate-500">Uploaded PDFs</h2>
                        <span className="text-xs text-slate-600">{pdfs.length} {pdfs.length === 1 ? "file" : "files"}</span>
                    </div>

                    {loadingPdfs ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />)}
                        </div>
                    ) : pdfs.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-xl">
                            No PDFs uploaded yet. Upload one above to expand the knowledge base.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pdfs.map((pdf) => (
                                <div key={pdf.id} className="flex items-start sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 sm:px-5 py-4 hover:border-slate-700 transition-all gap-3">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                        <span className="text-xl shrink-0 mt-0.5 sm:mt-0">📑</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate font-medium">{pdf.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 break-words">
                                                {pdf.size_kb} KB · {formatDate(pdf.uploaded_at)} · by {pdf.uploaded_by}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deletePdf(pdf.id, pdf.title)}
                                        disabled={deletingId === pdf.id}
                                        className="shrink-0 text-xs text-slate-600 hover:text-red-400 border border-transparent hover:border-red-900 px-3 py-1.5 rounded transition-all disabled:opacity-40"
                                    >
                                        {deletingId === pdf.id ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Info box */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl px-4 sm:px-6 py-5 text-xs text-slate-500 space-y-1.5">
                    <p className="text-slate-400 font-semibold text-sm mb-2">How it works</p>
                    <p>• Uploaded PDFs are combined with <code className="text-emerald-400">knowledge.txt</code> to form the AI's context.</p>
                    <p>• After each upload or delete, the knowledge base is automatically re-indexed in the background.</p>
                    <p>• Re-indexing takes 10–30 seconds. New context is available on the next user query after that.</p>
                    <p>• Max file size is 10MB per PDF. Only text-based PDFs are supported (not scanned images).</p>
                </section>

            </main>
        </div>
    );
}