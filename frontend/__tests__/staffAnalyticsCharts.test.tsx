import { describe, expect, jest, test } from "@jest/globals"
import { renderToStaticMarkup } from "react-dom/server"

import { AreaMetricChart } from "../app/staff/analytics/charts/AreaMetricChart"
import { BarMetricChart } from "../app/staff/analytics/charts/BarMetricChart"
import { DonutChart } from "../app/staff/analytics/charts/DonutChart"
import { RadarMetricChart } from "../app/staff/analytics/charts/RadarMetricChart"
import { TrendLineChart } from "../app/staff/analytics/charts/TrendLineChart"

jest.mock("recharts", () => {
  const React = require("react") as typeof import("react")

  const component = (name: string) => {
    return ({ children }: { children?: React.ReactNode }) => React.createElement("div", { "data-testid": name }, children)
  }

  return {
    ResponsiveContainer: component("ResponsiveContainer"),
    PieChart: component("PieChart"),
    Pie: component("Pie"),
    Tooltip: component("Tooltip"),
    Legend: component("Legend"),
    BarChart: component("BarChart"),
    Bar: component("Bar"),
    CartesianGrid: component("CartesianGrid"),
    XAxis: component("XAxis"),
    YAxis: component("YAxis"),
    AreaChart: component("AreaChart"),
    Area: component("Area"),
    RadarChart: component("RadarChart"),
    Radar: component("Radar"),
    PolarGrid: component("PolarGrid"),
    PolarAngleAxis: component("PolarAngleAxis"),
    PolarRadiusAxis: component("PolarRadiusAxis"),
    LineChart: component("LineChart"),
    Line: component("Line"),
  }
})

describe("staff analytics charts", () => {
  test("renders empty states for empty chart inputs", () => {
    expect(renderToStaticMarkup(<DonutChart data={[]} emptyMessage="No donut data" />)).toContain("No donut data")
    expect(renderToStaticMarkup(<BarMetricChart data={null} bars={[]} emptyMessage="No bar data" />)).toContain("No bar data")
    expect(renderToStaticMarkup(<AreaMetricChart data={[]} areas={[]} emptyMessage="No area data" />)).toContain("No area data")
    expect(renderToStaticMarkup(<RadarMetricChart data={null} />)).toContain("No priority-by-status data available yet")
    expect(renderToStaticMarkup(<TrendLineChart data={[]} lineLabel="Created" singleSeries />)).toContain("No ticket trend data available yet")
  })

  test("renders chart wrappers when analytics data exists", () => {
    const donutMarkup = renderToStaticMarkup(
      <DonutChart data={[{ name: "Open", value: 3, fill: "#f97316" }]} emptyMessage="unused" />,
    )
    const barMarkup = renderToStaticMarkup(
      <BarMetricChart data={[{ name: "Billing", value: 4 }]} bars={[{ dataKey: "value", color: "#38bdf8" }]} />,
    )
    const areaMarkup = renderToStaticMarkup(
      <AreaMetricChart data={[{ date: "2026-04-18", efficiency: 75 }]} areas={[{ dataKey: "efficiency", stroke: "#22d3ee", fill: "#22d3ee" }]} />,
    )
    const radarMarkup = renderToStaticMarkup(
      <RadarMetricChart data={[{ metric: "Open", high: 2, normal: 1, low: 0 }]} />,
    )
    const trendMarkup = renderToStaticMarkup(
      <TrendLineChart data={[{ date: "2026-04-18", created: 5, resolved: 3 }]} lineLabel="Created vs Resolved" singleSeries={false} />,
    )

    expect(donutMarkup).toContain("PieChart")
    expect(barMarkup).toContain("BarChart")
    expect(areaMarkup).toContain("AreaChart")
    expect(radarMarkup).toContain("RadarChart")
    expect(trendMarkup).toContain("LineChart")
  })
})
