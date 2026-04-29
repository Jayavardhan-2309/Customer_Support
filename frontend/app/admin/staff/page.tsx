"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchers } from "@/src/lib/axios";
import { Me, Staff } from "@/types/customTypes";
import { AdminStaffForm } from "./AdminStaffForm";
import { AdminStaffList } from "./AdminStaffList";

export default function AdminStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: me, isLoading: checkingAuth } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchers.get<Me>("me/"),
  });

  useEffect(() => {
    if (!me) return;
    if (me.role !== "admin") router.replace("/support");
  }, [me, router]);

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchers.get<{ results: Staff[] }>("admin/staff/"),
    enabled: !!me && me.role === "admin",
  });

  const staff = staffData?.results ?? [];
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
      );
      setName("");
      setEmail("");
      setPassword("");
      showToast(`${newStaff.username} added to support team`, "success");
    },
    onError: () => showToast("Failed to add staff. Try again.", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => fetchers.patch<Staff>(`admin/staff/${id}/`),
    onSuccess: (updated) => {
      queryClient.setQueryData<{ results: Staff[] }>(["admin-staff"], (old) =>
        old
          ? { results: old.results.map((s) => (s.id === updated.id ? { ...s, is_available: updated.is_available } : s)) }
          : old
      );
      showToast(`${updated.username} marked as ${updated.is_available ? "available" : "unavailable"}`, "success");
    },
    onError: () => showToast("Failed to update. Try again.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; username: string }) => fetchers.delete(`admin/staff/${id}/`),
    onSuccess: (_, { id, username }) => {
      queryClient.setQueryData<{ results: Staff[] }>(["admin-staff"], (old) =>
        old ? { results: old.results.filter((s) => s.id !== id) } : old
      );
      showToast(`${username} removed`, "success");
    },
    onError: () => showToast("Failed to remove staff. Try again.", "error"),
  });

  const addStaff = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast("Name, email and password are required", "error");
      return;
    }
    addMutation.mutate();
  };

  const deleteStaff = (id: number, username: string) => {
    if (!confirm(`Remove ${username} from the support team?`)) return;
    deleteMutation.mutate({ id, username });
  };

  const logout = async () => {
    setIsLoggingOut(true);
    await fetchers.post("logout/");
    router.push("/login");
  };

  if (checkingAuth) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Checking authentication...</div>;
  }

  const availableCount = staff.filter((member) => member.is_available).length;
  const orgName = me?.organization_name ?? "";

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono">
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-lg text-sm shadow-lg ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}

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
            <p className="text-slate-400 text-xs">Admin Staff Management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded transition-all"
            >
              Knowledge Base
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
        <AdminStaffForm
          addStaff={addStaff}
          email={email}
          isAdding={addMutation.isPending}
          name={name}
          password={password}
          setEmail={setEmail}
          setName={setName}
          setPassword={setPassword}
        />
        <AdminStaffList
          availableCount={availableCount}
          deletePendingId={deleteMutation.variables?.id}
          loadingStaff={loadingStaff}
          onDelete={deleteStaff}
          onToggle={(id) => toggleMutation.mutate(id)}
          staff={staff}
          togglePendingId={toggleMutation.variables}
        />
      </main>
    </div>
  );
}
