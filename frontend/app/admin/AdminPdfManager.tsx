import { RefObject } from "react"
import { PDF } from "@/types/customTypes"
import { AdminPdfList } from "./AdminPdfList"
import { AdminPdfUpload } from "./AdminPdfUpload"

type Props = {
  readonly deletingId: number | null
  readonly deletePdf: (id: number, title: string) => void
  readonly dragOver: boolean
  readonly fileInputRef: RefObject<HTMLInputElement | null>
  readonly formatDate: (iso: string) => string
  readonly loadingPdfs: boolean
  readonly onFileSelected: (file: File) => void
  readonly pdfs: PDF[]
  readonly setDragOver: (dragOver: boolean) => void
  readonly uploading: boolean
}

export function AdminPdfManager({
  deletingId,
  deletePdf,
  dragOver,
  fileInputRef,
  formatDate,
  loadingPdfs,
  onFileSelected,
  pdfs,
  setDragOver,
  uploading,
}: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
      <AdminPdfUpload
        dragOver={dragOver}
        fileInputRef={fileInputRef}
        handleDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const file = event.dataTransfer.files?.[0]
          if (file) onFileSelected(file)
        }}
        handleFileInput={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelected(file)
        }}
        setDragOver={setDragOver}
        uploading={uploading}
      />
      <AdminPdfList deletingId={deletingId} deletePdf={deletePdf} formatDate={formatDate} loadingPdfs={loadingPdfs} pdfs={pdfs} />
    </main>
  )
}
