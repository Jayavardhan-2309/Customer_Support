import { SELECT_CLASS } from "./ticketUtils"

type Props = {
  readonly filterCategory: string
  readonly filterStatus: string
  readonly filtersOpen: boolean
  readonly onCategoryChange: (value: string) => void
  readonly onStatusChange: (value: string) => void
  readonly onToggleFilters: () => void
  readonly onSortChange: (value: string) => void
  readonly sortPriority: string
  readonly ticketCount: number
}

export function StaffTicketFilters({
  filterCategory,
  filterStatus,
  filtersOpen,
  onCategoryChange,
  onStatusChange,
  onToggleFilters,
  onSortChange,
  sortPriority,
  ticketCount,
}: Props) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          Assigned Tickets <span className="ml-2 text-xs font-normal text-slate-500">({ticketCount})</span>
        </h2>
        <button onClick={onToggleFilters} className="sm:hidden px-3 py-1.5 text-xs border border-slate-700 rounded-md bg-slate-900 text-slate-400">
          {filtersOpen ? "Hide Filters" : "Filters"}
        </button>
      </div>
      <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap bg-slate-900 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-800`}>
        <FilterSelect id="ticket-category" label="Category:" value={filterCategory} onChange={onCategoryChange}>
          <option value="all">All</option>
          <option value="authentication">Authentication</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
        </FilterSelect>
        <div className="hidden sm:block w-px h-5 bg-slate-700" />
        <FilterSelect id="ticket-status" label="Status:" value={filterStatus} onChange={onStatusChange}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
        </FilterSelect>
        <div className="hidden sm:block w-px h-5 bg-slate-700" />
        <FilterSelect id="ticket-priority" label="Sort by Priority:" value={sortPriority} onChange={onSortChange}>
          <option value="default">Default</option>
          <option value="high">High first</option>
          <option value="normal">Normal first</option>
          <option value="low">Low first</option>
        </FilterSelect>
      </div>
    </div>
  )
}

function FilterSelect({
  children,
  id,
  label,
  onChange,
  value,
}: Readonly<{ children: React.ReactNode; id: string; label: string; onChange: (value: string) => void; value: string }>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-slate-400 whitespace-nowrap">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={SELECT_CLASS}>
        {children}
      </select>
    </div>
  )
}
