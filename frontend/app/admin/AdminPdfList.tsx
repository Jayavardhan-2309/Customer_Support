import { PDF } from "@/types/customTypes";

type Props = {
  deletingId: number | null;
  deletePdf: (id: number, title: string) => void;
  formatDate: (iso: string) => string;
  loadingPdfs: boolean;
  pdfs: PDF[];
};

export function AdminPdfList({ deletingId, deletePdf, formatDate, loadingPdfs, pdfs }: Readonly<Props>) {
  let content;
  if (loadingPdfs) {
    content = (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />)}
      </div>
    );
  } else if (pdfs.length === 0) {
    content = (
      <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-xl">
        No documents uploaded yet. Upload one above to expand the knowledge base.
      </div>
    );
  } else {
    content = (
      <div className="space-y-2">
        {pdfs.map((pdf) => (
          <div key={pdf.id} className="flex items-start sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 sm:px-5 py-4 hover:border-slate-700 transition-all gap-3">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <span className="text-xl shrink-0 mt-0.5 sm:mt-0">DOC</span>
              <div className="min-w-0">
                <p className="text-sm text-white truncate font-medium">{pdf.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 wrap-break-word">
                  {pdf.size_kb} KB. {formatDate(pdf.uploaded_at)}. by {pdf.uploaded_by}
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
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest text-slate-500">Uploaded Documents</h2>
        <span className="text-xs text-slate-600">{pdfs.length} {pdfs.length === 1 ? "file" : "files"}</span>
      </div>
      {content}
    </section>
  );
}
