type Props = {
  readonly toast: { message: string; type: "success" | "error" } | null
}

export function AdminToast({ toast }: Props) {
  if (!toast) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-lg text-sm shadow-lg transition-all ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
      {toast.message}
    </div>
  )
}
