import { describe, expect, jest, test } from "@jest/globals"
import { renderToStaticMarkup } from "react-dom/server"

import { TrendLineChart } from "../app/staff/analytics/charts/TrendLineChart"

jest.mock("recharts", () => {
  const React = require("react") as typeof import("react")

  const component = (name: string) => {
    return ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": name, "data-props": JSON.stringify(props) }, children)
  }

  return {
    ResponsiveContainer: component("ResponsiveContainer"),
    LineChart: component("LineChart"),
    CartesianGrid: component("CartesianGrid"),
    XAxis: component("XAxis"),
    YAxis: component("YAxis"),
    Tooltip: component("Tooltip"),
    Line: component("Line"),
  }
})

describe("TrendLineChart branches", () => {
  test("renders the single-series line variant", () => {
    const markup = renderToStaticMarkup(
      <TrendLineChart
        data={[{ date: "2026-04-20", value: 4 }]}
        lineLabel="Resolved"
        singleSeries
      />,
    )

    expect(markup).toContain("LineChart")
    expect(markup).toContain("Resolved")
    expect(markup).toContain("&quot;dataKey&quot;:&quot;value&quot;")
  })

  test("renders the dual-series line variant", () => {
    const markup = renderToStaticMarkup(
      <TrendLineChart
        data={[{ date: "2026-04-20", created: 5, resolved: 3 }]}
        lineLabel="Created vs Resolved"
        singleSeries={false}
      />,
    )

    expect(markup).toContain("&quot;dataKey&quot;:&quot;created&quot;")
    expect(markup).toContain("&quot;dataKey&quot;:&quot;resolved&quot;")
  })
})
