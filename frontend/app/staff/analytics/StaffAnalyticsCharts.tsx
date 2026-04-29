import { Card } from "./Card"
import { AreaMetricChart } from "./charts/AreaMetricChart"
import { BarMetricChart } from "./charts/BarMetricChart"
import { DonutChart } from "./charts/DonutChart"
import { RadarMetricChart } from "./charts/RadarMetricChart"
import { CategoryChartDatum, CategoryComparisonDatum, ChartDatum, RadarDatum, TrendChartDatum } from "./types"

type Props = {
  readonly backlogPressure: ChartDatum[]
  readonly categoryComparison: CategoryComparisonDatum[] | null
  readonly categoryData: CategoryChartDatum[]
  readonly cumulativeData: TrendChartDatum[]
  readonly efficiencyData: TrendChartDatum[]
  readonly priorityData: ChartDatum[]
  readonly radarData: RadarDatum[] | null
  readonly statusData: ChartDatum[]
}

export function StaffAnalyticsCharts({
  backlogPressure,
  categoryComparison,
  categoryData,
  cumulativeData,
  efficiencyData,
  priorityData,
  radarData,
  statusData,
}: Props) {
  return (
    <>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Status split" subtitle="Open, in progress, and resolved ticket mix">
          <DonutChart data={statusData} emptyMessage="Status data is not available yet" />
        </Card>
        <Card title="Priority split" subtitle="How urgency is distributed across your workload">
          <DonutChart data={priorityData} emptyMessage="Priority data is not available yet" />
        </Card>
        <Card title="Category split" subtitle="Where ticket volume is concentrated">
          <DonutChart data={categoryData} emptyMessage="Category data is not available yet" />
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Backlog pressure" subtitle="Active tickets versus resolved tickets">
          <DonutChart data={backlogPressure} emptyMessage="Backlog comparison is not available yet" />
        </Card>
        <Card title="Priority and status" subtitle="Priority spread across each ticket state">
          <RadarMetricChart data={radarData} />
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Category volume" subtitle="Ticket count by category">
          <BarMetricChart data={categoryData} bars={[{ dataKey: "value", color: "#38bdf8" }]} emptyMessage="Category volume data is not available yet" />
        </Card>
        <Card title="Created versus resolved" subtitle="Category-by-category output comparison">
          <BarMetricChart
            data={categoryComparison}
            bars={[{ dataKey: "Created", color: "#38bdf8" }, { dataKey: "Resolved", color: "#34d399" }]}
            emptyMessage="Category comparison data is not available yet"
          />
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Daily efficiency" subtitle="Resolved percentage against created tickets over the last 14 days">
          <AreaMetricChart data={efficiencyData} areas={[{ dataKey: "efficiency", stroke: "#22d3ee", fill: "#22d3ee" }]} emptyMessage="Efficiency data is not available yet" />
        </Card>
        <Card title="Cumulative flow" subtitle="Running total of opened versus resolved tickets">
          <AreaMetricChart
            data={cumulativeData}
            areas={[{ dataKey: "Opened", stroke: "#38bdf8", fill: "#38bdf8" }, { dataKey: "Resolved", stroke: "#34d399", fill: "#34d399" }]}
            emptyMessage="Cumulative flow data is not available yet"
          />
        </Card>
      </section>
    </>
  )
}
