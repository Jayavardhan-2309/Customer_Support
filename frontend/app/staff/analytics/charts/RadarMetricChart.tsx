"use client"

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts"
import { CustomTooltip } from "../CustomTooltip"
import { EmptyChart } from "../EmptyChart"
import { RadarDatum } from "../types"

type RadarMetricChartProps = {
  data: RadarDatum[] | null
}

export function RadarMetricChart({ data }: RadarMetricChartProps) {
  if (!data?.length) {
    return <EmptyChart message="No priority-by-status data available yet" />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
        <PolarRadiusAxis tick={{ fill: "#64748b", fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "12px", color: "#cbd5e1" }} />
        <Radar name="High" dataKey="high" stroke="#fb7185" fill="#fb7185" fillOpacity={0.22} animationDuration={700} />
        <Radar name="Normal" dataKey="normal" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.16} animationDuration={700} />
        <Radar name="Low" dataKey="low" stroke="#34d399" fill="#34d399" fillOpacity={0.12} animationDuration={700} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
