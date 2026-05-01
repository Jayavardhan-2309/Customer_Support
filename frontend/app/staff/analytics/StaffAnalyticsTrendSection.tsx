import { FilterSelect } from "./FilterSelect"
import { TrendLineChart } from "./charts/TrendLineChart"
import { RANGE_OPTIONS, STATUS_OPTIONS } from "./filterOptions"
import { StatusFilter, TrendChartDatum } from "./types"

type Props = {
  readonly daysFilter: number
  readonly lineLabel: string
  readonly onRangeFilterChange: (value: string) => void
  readonly onStatusFilterChange: (value: string) => void
  readonly singleSeries: boolean
  readonly statusFilter: StatusFilter
  readonly trendData: TrendChartDatum[]
}

export function StaffAnalyticsTrendSection({
  daysFilter,
  lineLabel,
  onRangeFilterChange,
  onStatusFilterChange,
  singleSeries,
  statusFilter,
  trendData,
}: Props) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_-48px_rgba(34,211,238,0.4)] backdrop-blur sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Ticket trends</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Momentum view</h2>
          <p className="mt-2 text-sm text-slate-400">Filter the same ticket-trend data by status and time window.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <FilterSelect label="Status" value={statusFilter} onChange={onStatusFilterChange} options={[...STATUS_OPTIONS]} />
          <FilterSelect label="Range" value={daysFilter} onChange={onRangeFilterChange} options={[...RANGE_OPTIONS]} />
        </div>
      </div>
      <TrendLineChart data={trendData} lineLabel={lineLabel} singleSeries={singleSeries} />
    </section>
  )
}
