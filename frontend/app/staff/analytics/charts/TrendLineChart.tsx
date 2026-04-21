"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CustomTooltip } from "../CustomTooltip"
import { EmptyChart } from "../EmptyChart"
import { TrendChartDatum } from "../types"

type TrendLineChartProps = {
  data: TrendChartDatum[]
  lineLabel: string
  singleSeries: boolean
}

export function TrendLineChart({ data, lineLabel, singleSeries }: TrendLineChartProps) {
  if (!data.length) {
    return <EmptyChart message="No ticket trend data available yet" />
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {singleSeries ? (
          <Line
            type="monotone"
            dataKey="value"
            name={lineLabel}
            stroke="#38bdf8"
            strokeWidth={3}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            animationDuration={700}
          />
        ) : (
          <>
            <Line type="monotone" dataKey="created" name="Created" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={700} />
            <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={700} />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
