import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals"
import { act } from "react"
import { createRoot, Root } from "react-dom/client"

import { AnalyticsResponse } from "../app/staff/analytics/types"

const pushMock = jest.fn()
const apiGetMock = jest.fn()
const loggerErrorMock = jest.fn()
const trendChartMock = jest.fn(
  ({ lineLabel, singleSeries }: { lineLabel: string; singleSeries: boolean }) => (
    <div data-testid="trend-chart">{`${lineLabel}-${String(singleSeries)}`}</div>
  ),
)

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

jest.mock("@/src/lib/axios", () => ({
  __esModule: true,
  default: { get: apiGetMock },
}))

jest.mock("@/logger", () => ({
  logger: { error: loggerErrorMock, warn: jest.fn(), info: jest.fn() },
}))

jest.mock("../app/staff/analytics/charts/DonutChart", () => ({
  DonutChart: ({ data }: { data: unknown[] }) => <div data-testid="donut-chart">{data.length}</div>,
}))

jest.mock("../app/staff/analytics/charts/BarMetricChart", () => ({
  BarMetricChart: ({ data }: { data: unknown[] | null }) => <div data-testid="bar-chart">{data?.length ?? 0}</div>,
}))

jest.mock("../app/staff/analytics/charts/AreaMetricChart", () => ({
  AreaMetricChart: ({ data }: { data: unknown[] }) => <div data-testid="area-chart">{data.length}</div>,
}))

jest.mock("../app/staff/analytics/charts/RadarMetricChart", () => ({
  RadarMetricChart: ({ data }: { data: unknown[] | null }) => <div data-testid="radar-chart">{data?.length ?? 0}</div>,
}))

jest.mock("../app/staff/analytics/charts/TrendLineChart", () => ({
  TrendLineChart: (props: { lineLabel: string; singleSeries: boolean }) => trendChartMock(props),
}))

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
  category_distribution: { Billing: 5, Technical: 7 },
  category_resolved: { Billing: 3, Technical: 6 },
  priority_by_status: {
    open: { high: 2, normal: 1, low: 1 },
    in_progress: { high: 1, normal: 1, low: 1 },
  },
  priority_distribution: { high: 4, normal: 6, low: 4 },
  resolution_performance: {
    resolved_today: 3,
    resolved_this_week: 12,
    avg_resolution_hours: 18.5,
  },
}

describe("AnalyticsPage", () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    pushMock.mockReset()
    apiGetMock.mockReset()
    loggerErrorMock.mockReset()
    trendChartMock.mockClear()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  test("shows loading state while analytics request is pending", async () => {
    apiGetMock.mockReturnValue(new Promise(() => undefined))
    const { default: AnalyticsPage } = await import("../app/staff/analytics/page")

    await act(async () => {
      root.render(<AnalyticsPage />)
    })

    expect(container.textContent).toContain("Loading analytics")
  })

  test("renders analytics data, updates filters, and handles navigation", async () => {
    apiGetMock.mockResolvedValue({ data: analyticsFixture })
    const { default: AnalyticsPage } = await import("../app/staff/analytics/page")

    await act(async () => {
      root.render(<AnalyticsPage />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain("Support analytics")
    expect(container.textContent).toContain("Resolution rate")
    expect(container.textContent).toContain("Momentum view")
    expect(trendChartMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ lineLabel: "Created vs Resolved", singleSeries: false }),
    )

    const selects = Array.from(container.querySelectorAll("select"))
    const [statusSelect, rangeSelect] = selects
    const backButton = container.querySelector("button")

    await act(async () => {
      statusSelect.value = "resolved"
      statusSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

    await act(async () => {
      rangeSelect.value = "3"
      rangeSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

    await act(async () => {
      backButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(trendChartMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ lineLabel: "Resolved", singleSeries: true }),
    )
    expect(pushMock).toHaveBeenCalledWith("/staff")
  })

  test("logs analytics load failures and stays on loading state", async () => {
    apiGetMock.mockRejectedValue(new Error("network failed"))
    const { default: AnalyticsPage } = await import("../app/staff/analytics/page")

    await act(async () => {
      root.render(<AnalyticsPage />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(loggerErrorMock).toHaveBeenCalledWith("Failed to load staff analytics", expect.any(Error))
    expect(container.textContent).toContain("Loading analytics")
  })
})
