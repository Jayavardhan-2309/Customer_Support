import { describe, expect, test } from "@jest/globals"

import {
  deriveMetrics,
  formatPerformanceValue,
  getCategoryData,
  getPriorityData,
  getStatusData,
  getTrendState,
} from "../app/staff/analytics/analyticsData"
import { AnalyticsResponse } from "../app/staff/analytics/types"

const analyticsFixture: AnalyticsResponse = {
  workload: {
    assigned: 9,
    open: 4,
    in_progress: 3,
    resolved: 7,
  },
  ticket_trends: [
    { date: "2026-04-15", created: 4, resolved: 1, open_created: 3, in_progress_created: 1 },
    { date: "2026-04-16", created: 2, resolved: 2, open_created: 1, in_progress_created: 1 },
    { date: "2026-04-17", created: 3, resolved: 4, open_created: 2, in_progress_created: 1 },
    { date: "2026-04-18", created: 5, resolved: 3, open_created: 3, in_progress_created: 2 },
  ],
  category_distribution: {
    Billing: 5,
    Technical: 7,
  },
  category_resolved: {
    Billing: 3,
    Technical: 6,
  },
  priority_by_status: {
    open: { high: 2, normal: 1, low: 1 },
    in_progress: { high: 1, normal: 1, low: 1 },
  },
  priority_distribution: {
    high: 4,
    normal: 6,
    low: 4,
  },
  resolution_performance: {
    resolved_today: 3,
    resolved_this_week: 12,
    avg_resolution_hours: 18.5,
  },
}

describe("analyticsData", () => {
  test("builds status, priority, and category chart data", () => {
    expect(getStatusData(analyticsFixture.workload)).toEqual([
      { name: "Open", value: 4, fill: "#f97316" },
      { name: "In Progress", value: 3, fill: "#facc15" },
      { name: "Resolved", value: 7, fill: "#22c55e" },
    ])

    expect(getPriorityData(analyticsFixture.priority_distribution)).toEqual([
      { name: "High", value: 4, fill: "#fb7185" },
      { name: "Normal", value: 6, fill: "#60a5fa" },
      { name: "Low", value: 4, fill: "#34d399" },
    ])

    expect(getCategoryData(analyticsFixture.category_distribution)).toEqual([
      { id: "billing", name: "Billing", value: 5, fill: "#38bdf8" },
      { id: "technical", name: "Technical", value: 7, fill: "#818cf8" },
    ])
  })

  test("derives resolution, radar, cumulative, and comparison metrics", () => {
    const result = deriveMetrics(analyticsFixture)

    expect(result.total).toBe(14)
    expect(result.resolutionRate).toBe(50)
    expect(result.backlogPressure).toEqual([
      { name: "Active", value: 7, fill: "#f97316" },
      { name: "Resolved", value: 7, fill: "#22c55e" },
    ])
    expect(result.radarData).toEqual([
      { metric: "Open", high: 2, normal: 1, low: 1 },
      { metric: "In Progress", high: 1, normal: 1, low: 1 },
    ])
    expect(result.efficiencyData).toEqual([
      { date: "2026-04-15", efficiency: 25 },
      { date: "2026-04-16", efficiency: 100 },
      { date: "2026-04-17", efficiency: 133 },
      { date: "2026-04-18", efficiency: 60 },
    ])
    expect(result.cumulativeData).toEqual([
      { date: "2026-04-15", Opened: 3, Resolved: 1 },
      { date: "2026-04-16", Opened: 4, Resolved: 3 },
      { date: "2026-04-17", Opened: 6, Resolved: 7 },
      { date: "2026-04-18", Opened: 9, Resolved: 10 },
    ])
    expect(result.categoryComparison).toEqual([
      { name: "Billing", Created: 5, Resolved: 3 },
      { name: "Technical", Created: 7, Resolved: 6 },
    ])
  })

  test("returns null radar and comparison data when optional analytics fields are missing", () => {
    const result = deriveMetrics({
      ...analyticsFixture,
      category_resolved: undefined,
      priority_by_status: undefined,
    })

    expect(result.radarData).toBeNull()
    expect(result.categoryComparison).toBeNull()
  })

  test("builds trend state for all tickets and filtered ticket statuses", () => {
    expect(getTrendState(analyticsFixture.ticket_trends, "all", 7)).toEqual({
      lineLabel: "Created vs Resolved",
      chartData: analyticsFixture.ticket_trends,
      singleSeries: false,
    })

    expect(getTrendState(analyticsFixture.ticket_trends, "resolved", 3)).toEqual({
      lineLabel: "Resolved",
      chartData: [
        { date: "2026-04-16", value: 2 },
        { date: "2026-04-17", value: 4 },
        { date: "2026-04-18", value: 3 },
      ],
      singleSeries: true,
    })

    expect(getTrendState(analyticsFixture.ticket_trends, "in_progress", 3)).toEqual({
      lineLabel: "in progress created",
      chartData: [
        { date: "2026-04-16", value: 1 },
        { date: "2026-04-17", value: 1 },
        { date: "2026-04-18", value: 2 },
      ],
      singleSeries: true,
    })
  })

  test("formats performance values for count and duration cards", () => {
    expect(formatPerformanceValue("resolved_today", 3)).toBe("3")
    expect(formatPerformanceValue("avg_resolution_hours", 18.5)).toBe("18.5")
  })
})
