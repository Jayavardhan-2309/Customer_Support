"use client";

import { useEffect, useState } from "react";
import api from "@/src/lib/axios";
import { useParams, useRouter } from "next/navigation";

export default function StaffAnalyticsDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{data.staff.name}</h1>
        <button
          onClick={() => router.push("/admin/analytics")}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
      </div>

      {/* PERFORMANCE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-100 p-4 rounded-xl">
          <p className="text-sm text-blue-600">Total Tickets</p>
          <p className="text-2xl font-bold">
            {data.performance.total_tickets}
          </p>
        </div>

        <div className="bg-green-100 p-4 rounded-xl">
          <p className="text-sm text-green-600">Resolved</p>
          <p className="text-2xl font-bold">
            {data.performance.resolved_tickets}
          </p>
        </div>

        <div className="bg-purple-100 p-4 rounded-xl">
          <p className="text-sm text-purple-600">Avg Time</p>
          <p className="text-2xl font-bold">
            {data.performance.avg_resolution_time || "N/A"}
          </p>
        </div>
      </div>

      {/* FEEDBACK */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="font-semibold mb-4">Feedback</h2>

        {data.feedback.length === 0 ? (
          <p className="text-gray-500">No feedback yet</p>
        ) : (
          data.feedback.map((f: any, i: number) => (
            <div key={i} className="border-b py-2">
              <p className="text-yellow-500">⭐ {f.rating}</p>
              <p>{f.comment}</p>
              <p className="text-sm text-gray-400">
                {f.user} • {new Date(f.date).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
}