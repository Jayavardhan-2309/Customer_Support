import { useRouter } from "next/navigation"

const EmptyView = ({ router }: { router: ReturnType<typeof useRouter> }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 gap-3 bg-slate-950">
    <div className="text-5xl">🎉</div>
    <h2 className="text-xl font-bold text-white">All caught up!</h2>
    <p className="text-slate-400 text-sm">
      No pending feedback. Need help?{" "}
      <span className="font-semibold text-slate-300">admin@gmail.com</span>
    </p>
    <button
      onClick={() => router.push("/support")}
      className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
    >
      Back to Dashboard
    </button>
  </div>
)

export default EmptyView