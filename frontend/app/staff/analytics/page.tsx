"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts"

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
    const priorityData = [
        { name: "High", value: analytics.priority_distribution.high },
        { name: "Medium", value: analytics.priority_distribution.medium },
        { name: "Low", value: analytics.priority_distribution.low }
        ]

        const categoryData = Object.entries(
        analytics.category_distribution
        ).map(([key, value]) => ({
        name: key,
        value
    }))

const trendData = analytics.ticket_trends

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
                    <h3>Resolved</h3>
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

            <div className="p-4 bg-blue-100 rounded">
                <h3>Resolved this week</h3>
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
            <div className="flex justify-center">
            <PieChart width={400} height={300}>
                <Pie
                data={priorityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                >
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#22c55e" />
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
            </div>

            <h2 className="text-xl font-semibold mt-10 mb-4">
                Category Distribution
            </h2>
            <div className="flex justify-center">
            <PieChart width={400} height={300}>
                <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#3b82f6"
                />
                    <Tooltip />
                    <Legend />
                </PieChart>
            </div>

            <h2 className="text-xl font-semibold mt-10 mb-4">Ticket Trends</h2>
            <div className="flex justify-center">
                <LineChart width={650} height={300} data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />

                    <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#3b82f6"
                    name="Created"
                    />

                    <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    name="Resolved"
                    />
                </LineChart>
            </div>
        </div>
    )
}