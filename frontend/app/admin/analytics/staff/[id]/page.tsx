"use client";

import { useEffect, useState } from "react";
import api from "@/src/lib/axios";
import { useParams, useRouter } from "next/navigation";
import { logger } from "@/logger";
import { StaffDetail, Feedback } from "@/types/customTypes";

export default function StaffAnalyticsDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<StaffDetail | null>(null)
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/analytics/staff/${id}/`);
        setData(res.data);
      } catch (err) {
        logger.error("Failed to load staff analytics", err);
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
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400 animate-pulse px-4 text-center">
        Loading staff analytics...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <div className="px-4 sm:px-6 py-5 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {data.staff.name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Staff Performance Overview
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin/analytics")}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-slate-700 rounded text-slate-300 hover:border-slate-500"
            >
              ← Back
            </button>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-red-800 text-red-400 rounded hover:bg-red-900/40 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>

        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* PERFORMANCE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Total Tickets</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {data.performance.total_tickets}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Resolved</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-green-400">
              {data.performance.resolved_tickets}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-400">Avg Time</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-purple-400">
              {data.performance.avg_resolution_time ?? "N/A"}
            </p>
          </div>

        </div>

        {/* FEEDBACK */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl">
          <h2 className="text-base sm:text-lg font-semibold mb-4">
            Feedback
          </h2>

          {data.feedback.length === 0 ? (
            <p className="text-slate-500 text-sm">No feedback yet</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {data.feedback.map((f: Feedback) => (
                <div
                  key={`${f.user}-${f.date}-${f.rating}`}
                  className="border border-slate-800 rounded-lg p-3 sm:p-4"
                >
                  <p className="text-yellow-400 text-sm sm:text-base">
                    ⭐ {f.rating}
                  </p>

                  <p className="text-slate-200 text-sm mt-1">
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

      </main>
    </div>
  );
}
