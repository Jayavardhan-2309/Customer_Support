export const priorityBadge = (priority: string) => {
  if (priority === "high") return "bg-red-900/40 text-red-400 border-red-700"
  if (priority === "normal") return "bg-orange-900/40 text-orange-400 border-orange-700"
  return "bg-slate-800 text-slate-400 border-slate-700"
}

export const statusBadge = (status: string) => {
  if (status === "open") return "bg-red-900/40 text-red-400"
  if (status === "in_progress") return "bg-amber-900/40 text-amber-400"
  if (status === "resolved") return "bg-green-900/40 text-green-400"
  return "bg-slate-800 text-slate-400"
}
