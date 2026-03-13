"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios";
import { useRouter } from "next/navigation";

export default function AnalyticsPage(){
    const [analytics, setAnalytics]= useState<any>(null);
    const router= useRouter();
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
            const res = await api.get("/staff/analytics/");
            setAnalytics(res.data);
            } catch (err) {
            console.error("Failed to load analytics:", err);
            }
        };

        loadAnalytics();
    }, []);

    if(!analytics) return <p>Loading analytics...</p>

    return (
        <div className="p-6">
            <div className="flex space-between justify-between">
                <h1 className="text-2xl font-bold mb-6">Support analytics</h1>
                <button className="px-4 h-10 cursor-pointer rounded py-2 bg-red-500 text-black" onClick={()=>router.push("/staff")}>DashBoard</button>
            </div>
            {/* cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-100 rounded">
                    <h3>Assigned</h3>
                    <p className="text-xl font-bold">{ analytics.workload.assigned }</p>
                </div>
                <div className="p-4 bg-red-100 rounded">
                    <h3>Open</h3>
                    <p className="text-xl font-bold">
                        {analytics.workload.open}
                    </p>
                </div>
                <div className="p-4 bg-yellow-100 rounded">
                    <h3>In progress</h3>
                    <p className="text-xl font-bold">
                        {analytics.workload.in_progress}
                    </p>
                </div>

                <div className="p-4 bg-green-100 rounded">
                    <h3>Rounded</h3>
                    <p className="text-xl font-bold">
                        {analytics.workload.resolved}
                    </p>
                </div>

            </div>
            <h2 className="text-xl font-semibold mt-10 mb-4">Resolution performance</h2>
            <div className="p-4 bg-green-100 rounded">
                <h3>Resolved Today</h3>
                <p className="text-xl font-bold">
                    {analytics.resolution_performance.resolved_today}
                </p>
            </div>

            <div className="p-4 bg-blue-100 roundd">
                <h3>Resolved this weeek</h3>
                <p className="text-xl font-bold">
                    {analytics.resolution_performance.resolved_this_week}
                </p>
            </div>
            <div className="p-4 bg-purple-100 rounded">
                <h3>Avg Resolution Time</h3>
                <p className="text-xl font-bold">
                    {analytics.resolution_performance.avg_resolution_hours}
                </p>
            </div>

            <h2 className="text-xl font-semibold mt-10 mb-4">
                Priority Distribution
            </h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                Pie Chart Placeholder
            </div>

            <h2 className="text-xl font-semibold mt-10 mb-4">
                Category Distribution
            </h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                Pie Chart holder
            </div>

            <h2 className="text-xl font-semibold mt-10 mb-4">Ticket Trends</h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                Line Chart Placeholder
            </div>
        </div>
    )
}