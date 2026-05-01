type Props = {
  addStaff: () => void;
  email: string;
  isAdding: boolean;
  name: string;
  password: string;
  setEmail: (value: string) => void;
  setName: (value: string) => void;
  setPassword: (value: string) => void;
};

export function AdminStaffForm({
  addStaff,
  email,
  isAdding,
  name,
  password,
  setEmail,
  setName,
  setPassword,
}: Readonly<Props>) {
  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") addStaff();
  };

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Add Staff Member</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-xs text-slate-500 block mb-1.5">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Ravi Kumar"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={submitOnEnter}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-xs text-slate-500 block mb-1.5">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. ravi@yourcompany.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={submitOnEnter}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="password" className="text-xs text-slate-500 block mb-1.5">Temporary Password</label>
            <input
              id="password"
              type="password"
              placeholder="Set initial password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={submitOnEnter}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={addStaff}
          disabled={isAdding}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-all"
        >
          {isAdding ? "Adding..." : "Add to Support Team"}
        </button>
      </div>
    </section>
  );
}
