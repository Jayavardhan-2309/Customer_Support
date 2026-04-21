"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CustomTooltip } from "../CustomTooltip"
import { EmptyChart } from "../EmptyChart"

type BarConfig = {
  dataKey: string
  color: string
  radius?: [number, number, number, number]
}

type BarMetricDatum = {
  name: string
} & Record<string, number | string>

type BarMetricChartProps = {
  data: BarMetricDatum[] | null
  bars: BarConfig[]
  emptyMessage?: string
}

export function BarMetricChart({ data, bars, emptyMessage }: Readonly<BarMetricChartProps>) {
  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return <EmptyChart message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={10}>
        <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
        {bars.map((bar) => (
          <Bar
            className="cursor-pointer"
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            radius={bar.radius ?? [10, 10, 0, 0]}
            animationDuration={700}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
