import { RefObject } from "react";

type Props = {
  dragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleDrop: (event: React.DragEvent) => void;
  handleFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setDragOver: (value: boolean) => void;
  uploading: boolean;
};

export function AdminPdfUpload({
  dragOver,
  fileInputRef,
  handleDrop,
  handleFileInput,
  setDragOver,
  uploading,
}: Readonly<Props>) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Upload Document</h2>
      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          dragOver ? "border-emerald-400 bg-emerald-950/30" : "border-slate-700 hover:border-slate-500 bg-slate-900/50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.xlsm,.csv,.docx"
          onChange={handleFileInput}
          className="hidden"
        />
        {uploading ? (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Uploading and indexing...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">DOC</div>
            <p className="text-slate-300 text-sm">
              Drop a document here or <span className="text-emerald-400 underline">click to browse</span>
            </p>
            <p className="text-slate-600 text-xs">PDF, Excel, CSV, or Word only. Max 10MB</p>
          </div>
        )}
      </button>
    </section>
  );
}
