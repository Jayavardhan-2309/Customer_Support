type FilterSelectProps = {
  label: string
  value: string | number
  options: Array<{ label: string; value: string | number }>
  onChange: (value: string) => void
}

export function FilterSelect({ label, value, options, onChange }: Readonly<FilterSelectProps>) {
  return (
    <label className="flex min-w-37.5 flex-col gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-medium tracking-normal text-slate-200 outline-none transition duration-200 hover:border-cyan-400/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
