interface EmptyChartProps {
  message?: string
}

export function EmptyChart({ message = "No data available" }: Readonly<EmptyChartProps>) {
  return (
    <div className="flex h-full min-h-55 w-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-500">
      <p>{message}</p>
    </div>
  )
}
