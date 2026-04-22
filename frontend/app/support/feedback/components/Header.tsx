import { useRouter } from "next/navigation"

type ResolvedTicket = {
  id: number
  query: string
  staff_name: string
  resolution_note: string
  has_feedback: boolean
}

const Header = ({ tickets, router }: { tickets: ResolvedTicket[], router: ReturnType<typeof useRouter> }) => (
  <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-10">
    <div className="max-w-2xl mx-auto flex items-center justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Feedback</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
          {tickets.length} ticket{tickets.length === 1 ? "" : "s"} awaiting your review
        </p>
      </div>
      <button
        onClick={() => router.push("/support")}
        className="bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold hover:border-slate-500 transition"
      >
        ← Dashboard
      </button>
    </div>
  </div>
)

export default Header