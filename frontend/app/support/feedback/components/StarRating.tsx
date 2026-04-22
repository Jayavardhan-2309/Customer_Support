import { useState } from "react"

function StarRating(
  { value, onChange }: { readonly value: number; readonly onChange: (v: number) => void }
)  {
  const [hovered, setHovered] = useState(0)

  const labels: Record<number, string> = {
    1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent",
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value)
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="bg-transparent border-none cursor-pointer p-0.5 transition-transform"
              style={{ transform: filled ? "scale(1.2)" : "scale(1)" }}
              aria-label={`${star} star`}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill={filled ? "#f59e0b" : "none"}
                stroke={filled ? "#f59e0b" : "#475569"}
                strokeWidth="1.5"
                style={{
                  filter: filled ? "drop-shadow(0 0 6px rgba(245,158,11,0.5))" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )
        })}
      </div>
      <span
        className="text-xs font-semibold uppercase tracking-widest transition-colors min-h-4.5"
        style={{ color: hovered || value ? "#f59e0b" : "#64748b" }}
      >
        {labels[hovered || value] ?? ""}
      </span>
    </div>
  )
}

export default StarRating