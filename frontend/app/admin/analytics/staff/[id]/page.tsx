"use client";

import { useEffect, useState } from "react";
import api from "@/src/lib/axios";
import { useParams, useRouter } from "next/navigation";

export default function StaffAnalyticsDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/analytics/staff/${id}/`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load staff analytics", err);
      }
    };
    load();
  }, [id]);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400 animate-pulse">
        Loading staff analytics...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.staff.name}
          </h1>
          <p className="text-slate-400 text-sm">
            Staff Performance Overview
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => router.push("/admin/analytics")}
            className="px-4 py-2 text-sm border border-slate-700 rounded hover:border-slate-500 hover:text-white text-slate-300 transition"
          >
            ← Back
          </button>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="px-4 py-2 text-sm border border-red-800 text-red-400 rounded hover:bg-red-900/40 transition disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>

      {/* PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow hover:border-blue-500 transition">
          <p className="text-sm text-slate-400">Total Tickets</p>
          <p className="text-3xl font-bold mt-1">
            {data.performance.total_tickets}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow hover:border-green-500 transition">
          <p className="text-sm text-slate-400">Resolved</p>
          <p className="text-3xl font-bold mt-1 text-green-400">
            {data.performance.resolved_tickets}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow hover:border-purple-500 transition">
          <p className="text-sm text-slate-400">Avg Resolution Time</p>
          <p className="text-3xl font-bold mt-1 text-purple-400">
            {data.performance.avg_resolution_time || "N/A"}
          </p>
        </div>

      </div>

      {/* FEEDBACK SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Feedback</h2>

        {data.feedback.length === 0 ? (
          <p className="text-slate-500 text-sm">No feedback yet</p>
        ) : (
          <div className="space-y-4">
            {data.feedback.map((f: any, i: number) => (
              <div
                key={i}
                className="border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition"
              >
                <p className="text-yellow-400 font-medium">
                  ⭐ {f.rating}
                </p>

                <p className="text-slate-200 mt-1">
                  {f.comment || "No comment"}
                </p>

                <p className="text-xs text-slate-500 mt-2">
                  {f.user} •{" "}
                  {new Date(f.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}