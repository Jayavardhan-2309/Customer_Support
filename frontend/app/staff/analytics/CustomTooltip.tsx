interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number | string
    color?: string
    payload?: {
      fill?: string
    }
  }>
  label?: string
}

export function CustomTooltip({ active, payload, label }: Readonly<CustomTooltipProps>) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
      {label ? <p className="mb-1 font-semibold text-slate-300">{label}</p> : null}
      {payload.map((entry) => {
        const tooltipKey = `${entry.name}-${String(entry.value)}`

        return (
          <p key={tooltipKey} className="flex items-center gap-2 text-sm text-slate-200">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span>{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </p>
        )
      })}
    </div>
  )
}
