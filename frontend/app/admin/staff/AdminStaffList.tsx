import { Staff } from "@/types/customTypes";

type Props = {
  availableCount: number;
  deletePendingId?: number;
  loadingStaff: boolean;
  onDelete: (id: number, username: string) => void;
  onToggle: (id: number) => void;
  staff: Staff[];
  togglePendingId?: number;
};

function getAvailabilityText(staff: Staff, pendingId?: number) {
  if (pendingId === staff.id) return "...";
  return staff.is_available ? "Available" : "Unavailable";
}

export function AdminStaffList({
  availableCount,
  deletePendingId,
  loadingStaff,
  onDelete,
  onToggle,
  staff,
  togglePendingId,
}: Readonly<Props>) {
  let content;
  if (loadingStaff) {
    content = (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />)}
      </div>
    );
  } else if (staff.length === 0) {
    content = (
      <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-xl">
        No support staff added yet. Add a team member above to start receiving escalated queries.
      </div>
    );
  } else {
    content = (
      <div className="space-y-2">
        {staff.map((member) => (
          <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 sm:px-5 py-4 hover:border-slate-700 transition-all gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${member.is_available ? "bg-emerald-400" : "bg-slate-600"}`} />
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">{member.username}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => onToggle(member.id)}
                disabled={togglePendingId === member.id}
                className={`text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${
                  member.is_available
                    ? "text-emerald-400 border-emerald-900 hover:bg-emerald-950"
                    : "text-slate-500 border-slate-700 hover:bg-slate-800"
                }`}
              >
                {getAvailabilityText(member, togglePendingId)}
              </button>
              <button
                onClick={() => onDelete(member.id, member.username)}
                disabled={deletePendingId === member.id}
                className="text-xs text-slate-600 hover:text-red-400 border border-transparent hover:border-red-900 px-3 py-1.5 rounded transition-all disabled:opacity-40"
              >
                {deletePendingId === member.id ? "..." : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest text-slate-500">Team Members</h2>
        <span className="text-xs text-slate-600">{availableCount} of {staff.length} available</span>
      </div>
      {content}
    </section>
  );
}
