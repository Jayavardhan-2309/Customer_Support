import { describe, expect, test } from "@jest/globals"
import { renderToStaticMarkup } from "react-dom/server"

import { Card } from "../app/staff/analytics/Card"
import { CustomTooltip } from "../app/staff/analytics/CustomTooltip"
import { EmptyChart } from "../app/staff/analytics/EmptyChart"
import { MetricCard } from "../app/staff/analytics/MetricCard"
import { StatCard } from "../app/staff/analytics/StatCard"

describe("staff analytics UI primitives", () => {
  test("renders card, stat card, and metric card content", () => {
    const cardMarkup = renderToStaticMarkup(
      <Card title="Overview" subtitle="Summary">
        <div>Body</div>
      </Card>,
    )

    const statMarkup = renderToStaticMarkup(
      <StatCard label="Open" value={12} badge="OPN" tone="from-slate-900 to-slate-950" ring="ring-slate-700" />,
    )

    const metricMarkup = renderToStaticMarkup(
      <MetricCard label="Resolved Today" value="5" accent="text-cyan-300" tone="from-slate-900 to-slate-950" suffix="h" />,
    )

    expect(cardMarkup).toContain("Overview")
    expect(cardMarkup).toContain("Summary")
    expect(cardMarkup).toContain("Body")
    expect(statMarkup).toContain("Open")
    expect(statMarkup).toContain("12")
    expect(statMarkup).toContain("OPN")
    expect(metricMarkup).toContain("Resolved Today")
    expect(metricMarkup).toContain("5")
    expect(metricMarkup).toContain("h")
  })

  test("renders a card without subtitle content", () => {
    const cardMarkup = renderToStaticMarkup(
      <Card title="Overview">
        <div>Body only</div>
      </Card>,
    )

    expect(cardMarkup).toContain("Overview")
    expect(cardMarkup).toContain("Body only")
    expect(cardMarkup).not.toContain("Summary")
  })

  test("renders empty chart and active tooltip payloads", () => {
    const emptyMarkup = renderToStaticMarkup(<EmptyChart message="Nothing to chart yet" />)
    const tooltipMarkup = renderToStaticMarkup(
      <CustomTooltip
        active
        label="2026-04-18"
        payload={[
          { name: "Resolved", value: 3, color: "#34d399" },
          { name: "Created", value: 5, payload: { fill: "#38bdf8" } },
        ]}
      />,
    )

    expect(emptyMarkup).toContain("Nothing to chart yet")
    expect(tooltipMarkup).toContain("2026-04-18")
    expect(tooltipMarkup).toContain("Resolved")
    expect(tooltipMarkup).toContain("Created")
  })

  test("renders tooltip rows without a label or color fallback", () => {
    const tooltipMarkup = renderToStaticMarkup(
      <CustomTooltip
        active
        payload={[
          { name: "Open", value: 0 },
        ]}
      />,
    )

    expect(tooltipMarkup).toContain("Open")
    expect(tooltipMarkup).not.toContain("2026-04-18")
    expect(tooltipMarkup).not.toContain("background-color")
  })

  test("returns empty markup for inactive tooltip", () => {
    expect(renderToStaticMarkup(<>{CustomTooltip({ active: false, payload: [], label: "ignored" })}</>)).toBe("")
  })
})
