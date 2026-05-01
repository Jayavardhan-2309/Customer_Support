"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchers } from "@/src/lib/axios";
import { Me, Staff } from "@/types/customTypes";
import { AdminHeader } from "../AdminHeader";
import { AdminToast } from "../AdminToast";
import { AdminStaffManager } from "./AdminStaffManager";

export default function AdminStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    [],
  );

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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
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
    try {
      await fetchers.post("logout/");
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (checkingAuth) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Checking authentication...</div>;
  }

  const availableCount = staff.filter((member) => member.is_available).length;
  const orgName = me?.organization_name ?? "";
  const togglePendingId = toggleMutation.isPending ? toggleMutation.variables : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono">
      <AdminToast toast={toast} />
      <AdminHeader
        isLoggingOut={isLoggingOut}
        orgName={orgName}
        onKnowledgeBase={() => router.push("/admin")}
        onLogout={logout}
        subtitle="Admin Staff Management"
        title="Support Staff"
      />

      <AdminStaffManager
        addStaff={addStaff}
        availableCount={availableCount}
        deletePendingId={deleteMutation.variables?.id}
        email={email}
        isAdding={addMutation.isPending}
        loadingStaff={loadingStaff}
        name={name}
        onDelete={deleteStaff}
        onToggle={(id) => toggleMutation.mutate(id)}
        password={password}
        setEmail={setEmail}
        setName={setName}
        setPassword={setPassword}
        staff={staff}
        togglePendingId={togglePendingId}
      />
    </div>
  );
}
