"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CustomTooltip } from "../CustomTooltip"
import { EmptyChart } from "../EmptyChart"

type AreaConfig = {
  dataKey: string
  stroke: string
  fill: string
}

type AreaMetricChartProps<TData extends object> = {
  data: TData[]
  areas: AreaConfig[]
  emptyMessage?: string
}

export function AreaMetricChart<TData extends { date: string }>({ data, areas, emptyMessage }: Readonly<AreaMetricChartProps<TData>>) {
  if (!data.length) {
    return <EmptyChart message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          {areas.map((area) => (
            <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={area.fill} stopOpacity={0.5} />
              <stop offset="100%" stopColor={area.fill} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.stroke}
            fill={`url(#gradient-${area.dataKey})`}
            strokeWidth={2}
            animationDuration={700}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
