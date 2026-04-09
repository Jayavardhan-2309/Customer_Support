"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchers } from "@/src/lib/axios"

type Staff = { id: number; username: string; email: string; is_available: boolean; active_tickets: number }
type Me = { role: string; organization_name?: string }

export default function AdminStaffPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const { data: me, isLoading: checkingAuth } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchers.get<Me>("me/"),
  })

  useEffect(() => {
    if (!me) return
    if (me.role !== "admin") router.replace("/support")
  }, [me, router])

  // ── Staff list ────────────────────────────────────────────────────────────
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchers.get<{ results: Staff[] }>("admin/staff/"),
    enabled: !!me && me.role === "admin",
  })

  const staff = staffData?.results ?? []

  // ── Add staff ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: () =>
      fetchers.post<Staff>("admin/staff/", {
        username: name.trim(),
        email: email.trim(),
        password: password.trim(),
      }),
    onSuccess: (newStaff) => {
      queryClient.setQueryData<{ results: Staff[] }>(["admin-staff"], (old) =>
        old ? { results: [...old.results, newStaff] } : { results: [newStaff] }
      )
      setName(""); setEmail(""); setPassword("")
      showToast(`${newStaff.username} added to support team`, "success")
    },
    onError: () => showToast("Failed to add staff. Try again.", "error"),
  })

  const addStaff = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast("Name, email and password are required", "error")
      return
    }
    addMutation.mutate()
  }

  // ── Toggle availability ───────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: (id: number) => fetchers.patch<Staff>(`admin/staff/${id}/`),
    onSuccess: (updated) => {
      queryClient.setQueryData<{ results: Staff[] }>(["admin-staff"], (old) =>
        old
          ? { results: old.results.map((s) => (s.id === updated.id ? { ...s, is_available: updated.is_available } : s)) }
          : old
      )
      showToast(`${updated.username} marked as ${updated.is_available ? "available" : "unavailable"}`, "success")
    },
    onError: () => showToast("Failed to update. Try again.", "error"),
  })

  // ── Delete staff ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; username: string }) =>
      fetchers.delete(`admin/staff/${id}/`),
    onSuccess: (_, { id, username }) => {
      queryClient.setQueryData<{ results: Staff[] }>(["admin-staff"], (old) =>
        old ? { results: old.results.filter((s) => s.id !== id) } : old
      )
      showToast(`${username} removed`, "success")
    },
    onError: () => showToast("Failed to remove staff. Try again.", "error"),
  })

  const deleteStaff = (id: number, username: string) => {
    if (!confirm(`Remove ${username} from the support team?`)) return
    deleteMutation.mutate({ id, username })
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    setIsLoggingOut(true)
    await fetchers.post("logout/")
    router.push("/login")
  }

  if (checkingAuth) return (
    <div className="h-screen flex items-center justify-center text-gray-500">Checking authentication...</div>
  )

  const availableCount = staff.filter((s) => s.is_available).length
  const orgName = me?.organization_name ?? ""

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-lg text-sm shadow-lg
          ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Support Staff</h1>
              {orgName && (
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                  {orgName}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs">Admin · Staff Management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all"
            >
              ← Knowledge Base
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

        {/* Add Staff Form */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Add Staff Member</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ravi Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStaff()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. ravi@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStaff()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 block mb-1.5">Temporary Password</label>
                <input
                  type="password"
                  placeholder="Set initial password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStaff()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={addStaff}
              disabled={addMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-all"
            >
              {addMutation.isPending ? "Adding..." : "Add to Support Team"}
            </button>
          </div>
        </section>

        {/* Staff List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-500">Team Members</h2>
            <span className="text-xs text-slate-600">{availableCount} of {staff.length} available</span>
          </div>

          {loadingStaff ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />)}
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-xl">
              No support staff added yet. Add a team member above to start receiving escalated queries.
            </div>
          ) : (
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 sm:px-5 py-4 hover:border-slate-700 transition-all gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.is_available ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium">{s.username}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => toggleMutation.mutate(s.id)}
                      disabled={toggleMutation.isPending && toggleMutation.variables === s.id}
                      className={`text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${
                        s.is_available
                          ? "text-emerald-400 border-emerald-900 hover:bg-emerald-950"
                          : "text-slate-500 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      {toggleMutation.isPending && toggleMutation.variables === s.id
                        ? "..." : s.is_available ? "Available" : "Unavailable"}
                    </button>
                    <button
                      onClick={() => deleteStaff(s.id, s.username)}
                      disabled={deleteMutation.isPending && deleteMutation.variables?.id === s.id}
                      className="text-xs text-slate-600 hover:text-red-400 border border-transparent hover:border-red-900 px-3 py-1.5 rounded transition-all disabled:opacity-40"
                    >
                      {deleteMutation.isPending && deleteMutation.variables?.id === s.id ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info box */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl px-4 sm:px-6 py-5 text-xs text-slate-500 space-y-1.5">
          <p className="text-slate-400 font-semibold text-sm mb-2">How escalation works</p>
          <p>• When a user expresses frustration or the AI's confidence is low, a support ticket is created automatically.</p>
          <p>• The first <span className="text-emerald-400">available</span> staff member receives an email with the user's query and contact details.</p>
          <p>• Staff marked as <span className="text-slate-400">unavailable</span> are skipped during assignment.</p>
          <p>• The user is informed their query has been forwarded and will receive a follow-up.</p>
        </section>

      </main>
    </div>
  )
}
