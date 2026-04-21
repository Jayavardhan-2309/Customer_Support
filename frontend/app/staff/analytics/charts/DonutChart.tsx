"use client"

import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { CustomTooltip } from "../CustomTooltip"
import { EmptyChart } from "../EmptyChart"
import { ChartDatum } from "../types"

type DonutChartProps = Readonly<{
  data: ChartDatum[]
  emptyMessage?: string
}>

export function DonutChart({ data, emptyMessage }: DonutChartProps) {
  if (!data.length || data.every((item) => item.value === 0)) {
    return <EmptyChart message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={4}
          strokeWidth={0}
          animationDuration={700}
          fill="#8884d8"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#cbd5e1" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
